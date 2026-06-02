#!/usr/bin/env bash
#
# Helios — testnet deploy script.
#
# Bu script:
#   1. Soroban kontratlarını derler (`stellar contract build` → wasm32v1-none)
#   2. Deployer keypair yoksa üretir + Friendbot ile fonlar
#   3. strategy_router + keeper kontratlarını testnet'e deploy eder
#   4. init invoke'larını çalıştırır
#   5. Read-only doğrulama invoke'ları yapar
#   6. `addresses.json` + `.env.testnet` üretir
#
# Tekrar çalıştırılabilir: aynı keypair'i tekrar kullanır, deploy/init taze
# adreslerle yeniden yazar. (Soroban'da deploy idempotent değil — her çağrı
# yeni contract ID üretir; bu nedenle eski adresler üzerine yazılır.)
#
# Kullanım:
#   bash scripts/deploy-testnet.sh                     # tüm akış
#   bash scripts/deploy-testnet.sh --skip-build        # build atlanır
#   bash scripts/deploy-testnet.sh --identity my-key   # özel identity adı
#
# Ön-koşul:
#   - stellar CLI ≥ 25.1.0 (canonical pin 26.1.0; deploy/invoke 25+ uyumlu)
#   - rustup target add wasm32v1-none
#   - İnternet (Friendbot + Soroban RPC)

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Yapılandırma — varsayılanlar (CLI flag'leri ile geçilebilir)
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$CONTRACTS_DIR/../.." && pwd)"

NETWORK="testnet"
IDENTITY="helios-deployer"
SKIP_BUILD=false
SKIP_KEYPAIR=false

ENV_FILE="$CONTRACTS_DIR/.env.testnet"
ADDRESSES_JSON="$CONTRACTS_DIR/addresses.json"
WEB_ENV_FILE="$ROOT_DIR/apps/web/.env.local"

# ─────────────────────────────────────────────────────────────────────────────
# Arg parse
# ─────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)   SKIP_BUILD=true ;;
    --skip-keypair) SKIP_KEYPAIR=true ;;
    --identity)     IDENTITY="$2"; shift ;;
    --network)      NETWORK="$2"; shift ;;
    --help|-h)
      sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "Bilinmeyen argüman: $1" >&2; exit 1 ;;
  esac
  shift
done

# ─────────────────────────────────────────────────────────────────────────────
# Yardımcılar
# ─────────────────────────────────────────────────────────────────────────────
log()  { printf "\n\033[1;36m▶\033[0m %s\n" "$*"; }
warn() { printf "\033[1;33m⚠\033[0m %s\n" "$*" >&2; }
err()  { printf "\033[1;31m✖\033[0m %s\n" "$*" >&2; }
ok()   { printf "\033[1;32m✓\033[0m %s\n" "$*"; }

# ─────────────────────────────────────────────────────────────────────────────
# 0. Pre-flight
# ─────────────────────────────────────────────────────────────────────────────
log "Pre-flight — toolchain kontrolü"

command -v stellar >/dev/null 2>&1 || { err "stellar CLI bulunamadı. https://github.com/stellar/stellar-cli"; exit 1; }
ok "stellar $(stellar --version | head -1 | awk '{print $2}')"

if ! rustup target list --installed 2>/dev/null | grep -q "^wasm32v1-none$"; then
  warn "wasm32v1-none target yok. Kuruyorum..."
  rustup target add wasm32v1-none
fi
ok "wasm32v1-none target kurulu"

# Harici testnet adresleri — STELLAR_STACK.md §5 + AUDIT §1, canlı resmi
# kaynaktan (2026-06-01) doğrulandı. Testnet reset'inde değişebilir → ortam
# değişkenleri ile override edilebilir (BLEND_POOL, REFLECTOR_STELLAR_DEX, vb).

BLEND_POOL="${BLEND_POOL:-CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF}" # TestnetV2 pool
BLEND_BACKSTOP="${BLEND_BACKSTOP:-CBDVWXT433PRVTUNM56C3JREF3HIZHRBA64NB2C3B2UNCKIS65ZYCLZA}"
BLEND_POOL_FACTORY="${BLEND_POOL_FACTORY:-CDV6RX4CGPCOKGTBFS52V3LMWQGZN3LCQTXF5RVPOOCG4XVMHXQ4NTF6}"
BLEND_EMITTER="${BLEND_EMITTER:-CC3WJVJINN4E3LPMNTWKK7LQZLYDQMZHZA7EZGXATPHHBPKNZRIO3KZ6}"

REFLECTOR_STELLAR_DEX="${REFLECTOR_STELLAR_DEX:-CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP}"
REFLECTOR_EXT_CEX_DEX="${REFLECTOR_EXT_CEX_DEX:-CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63}"
REFLECTOR_FIAT="${REFLECTOR_FIAT:-CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W}"

# Helios kontrat init parametreleri (env ile override edilebilir)
MAX_LEVERAGE_BPS="${MAX_LEVERAGE_BPS:-500}"   # 5x
MIN_OPEN_HF_BPS="${MIN_OPEN_HF_BPS:-130}"     # 1.30
FLASH_FEE_BPS="${FLASH_FEE_BPS:-0}"           # Blend pool fee'sini varsayalım 0

log "Harici adresler (doğrulama tarihi: 2026-06-01)"
echo "  BLEND_POOL          = $BLEND_POOL"
echo "  BLEND_BACKSTOP      = $BLEND_BACKSTOP"
echo "  BLEND_POOL_FACTORY  = $BLEND_POOL_FACTORY"
echo "  REFLECTOR_STELLAR_DEX = $REFLECTOR_STELLAR_DEX"
echo "  REFLECTOR_EXT_CEX_DEX = $REFLECTOR_EXT_CEX_DEX"

# ─────────────────────────────────────────────────────────────────────────────
# 1. Build (stellar contract build → wasm32v1-none)
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" == "false" ]]; then
  log "Build — stellar contract build"
  (cd "$CONTRACTS_DIR" && stellar contract build) 1>&2
  ok "Build tamam"
else
  warn "Build atlandı (--skip-build)"
fi

ROUTER_WASM="$CONTRACTS_DIR/target/wasm32v1-none/release/strategy_router.wasm"
KEEPER_WASM="$CONTRACTS_DIR/target/wasm32v1-none/release/keeper.wasm"

[[ -f "$ROUTER_WASM" ]] || { err "strategy_router.wasm yok: $ROUTER_WASM"; exit 1; }
[[ -f "$KEEPER_WASM" ]] || { err "keeper.wasm yok: $KEEPER_WASM"; exit 1; }
ok "router: $(wc -c < "$ROUTER_WASM" | tr -d ' ') bytes"
ok "keeper: $(wc -c < "$KEEPER_WASM" | tr -d ' ') bytes"

# ─────────────────────────────────────────────────────────────────────────────
# 2. Keypair üret + Friendbot fund (idempotent)
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$SKIP_KEYPAIR" == "false" ]]; then
  log "Keypair — $IDENTITY (yoksa üret + Friendbot fund)"
  if stellar keys ls 2>/dev/null | grep -q "^${IDENTITY}$"; then
    ok "Mevcut keypair: $IDENTITY"
  else
    stellar keys generate "$IDENTITY" --network "$NETWORK" --fund
    ok "Yeni keypair üretildi + Friendbot ile fonlandı: $IDENTITY"
  fi
fi

DEPLOYER_ADDRESS=$(stellar keys address "$IDENTITY")
ok "Deployer: $DEPLOYER_ADDRESS"

# ─────────────────────────────────────────────────────────────────────────────
# 3. Deploy kontratlar
# ─────────────────────────────────────────────────────────────────────────────
log "Deploy — strategy_router"
ROUTER_ID=$(stellar contract deploy \
  --wasm "$ROUTER_WASM" \
  --network "$NETWORK" \
  --source "$IDENTITY" 2>&1 | tail -1)
ok "STRATEGY_ROUTER_ID = $ROUTER_ID"

log "Deploy — keeper"
KEEPER_ID=$(stellar contract deploy \
  --wasm "$KEEPER_WASM" \
  --network "$NETWORK" \
  --source "$IDENTITY" 2>&1 | tail -1)
ok "KEEPER_ID = $KEEPER_ID"

# ─────────────────────────────────────────────────────────────────────────────
# 4. Init invoke'ları
# ─────────────────────────────────────────────────────────────────────────────
log "Init — strategy_router.init(admin, pool, max_lev, min_hf, flash_fee)"
stellar contract invoke \
  --id "$ROUTER_ID" \
  --network "$NETWORK" \
  --source "$IDENTITY" \
  -- init \
  --admin "$DEPLOYER_ADDRESS" \
  --pool "$BLEND_POOL" \
  --max_leverage_bps "$MAX_LEVERAGE_BPS" \
  --min_open_hf_bps "$MIN_OPEN_HF_BPS" \
  --flash_fee_bps "$FLASH_FEE_BPS"
ok "strategy_router init tamam"

log "Init — keeper.init(admin, keeper_role=admin, pool, router)"
stellar contract invoke \
  --id "$KEEPER_ID" \
  --network "$NETWORK" \
  --source "$IDENTITY" \
  -- init \
  --admin "$DEPLOYER_ADDRESS" \
  --keeper "$DEPLOYER_ADDRESS" \
  --pool "$BLEND_POOL" \
  --router "$ROUTER_ID"
ok "keeper init tamam"

# ─────────────────────────────────────────────────────────────────────────────
# 5. Read-only doğrulama invoke'ları (canlılık kanıtı)
# ─────────────────────────────────────────────────────────────────────────────
log "Doğrulama — read-only invoke'lar"

ROUTER_ADMIN=$(stellar contract invoke \
  --id "$ROUTER_ID" --network "$NETWORK" --source "$IDENTITY" \
  -- get_admin 2>&1 | tail -1)
[[ "$ROUTER_ADMIN" == "\"$DEPLOYER_ADDRESS\"" ]] \
  || { err "router get_admin beklenmedik: $ROUTER_ADMIN"; exit 1; }
ok "router.get_admin = $ROUTER_ADMIN"

ROUTER_PAUSED=$(stellar contract invoke \
  --id "$ROUTER_ID" --network "$NETWORK" --source "$IDENTITY" \
  -- is_paused 2>&1 | tail -1)
ok "router.is_paused = $ROUTER_PAUSED"

KEEPER_ADMIN=$(stellar contract invoke \
  --id "$KEEPER_ID" --network "$NETWORK" --source "$IDENTITY" \
  -- get_admin 2>&1 | tail -1)
ok "keeper.get_admin = $KEEPER_ADMIN"

KEEPER_ROLE=$(stellar contract invoke \
  --id "$KEEPER_ID" --network "$NETWORK" --source "$IDENTITY" \
  -- get_keeper 2>&1 | tail -1)
ok "keeper.get_keeper = $KEEPER_ROLE"

# ─────────────────────────────────────────────────────────────────────────────
# 6. addresses.json + .env üretimi
# ─────────────────────────────────────────────────────────────────────────────
log "addresses.json üret"
DEPLOYED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > "$ADDRESSES_JSON" <<JSON
{
  "_meta": {
    "network": "$NETWORK",
    "passphrase": "Test SDF Network ; September 2015",
    "deployed_at": "$DEPLOYED_AT",
    "deployer": "$DEPLOYER_ADDRESS",
    "notes": [
      "Bu dosya scripts/deploy-testnet.sh tarafından üretilir.",
      "Testnet adresleri reset'lerde değişebilir; deploy yeniden çalıştırılmalı.",
      "Mock SEP-41 token adresleri PROMPT 24 (faucet) tarafından eklenecek."
    ]
  },
  "helios": {
    "strategy_router": "$ROUTER_ID",
    "keeper":          "$KEEPER_ID"
  },
  "blend": {
    "pool":          "$BLEND_POOL",
    "backstop":      "$BLEND_BACKSTOP",
    "pool_factory":  "$BLEND_POOL_FACTORY",
    "emitter":       "$BLEND_EMITTER"
  },
  "reflector": {
    "stellar_dex":    "$REFLECTOR_STELLAR_DEX",
    "external_cex":   "$REFLECTOR_EXT_CEX_DEX",
    "fiat":           "$REFLECTOR_FIAT"
  },
  "tokens": {
    "_doc_doğrula":   "PROMPT 24 (faucet) eklemek için",
    "usdc_sac":       null,
    "xlm_sac":        null,
    "wbtc_sac":       null,
    "weth_sac":       null
  },
  "config": {
    "max_leverage_bps":  $MAX_LEVERAGE_BPS,
    "min_open_hf_bps":   $MIN_OPEN_HF_BPS,
    "flash_fee_bps":     $FLASH_FEE_BPS
  }
}
JSON
ok "addresses.json yazıldı: $ADDRESSES_JSON"

log ".env.testnet üret"
cat > "$ENV_FILE" <<EOF
# Helios — testnet deploy çıktısı ($DEPLOYED_AT)
# Tekrar deploy çalıştırılırsa üzerine yazılır.

# --- Network ---
STELLAR_NETWORK=testnet
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# --- Deployer (admin + keeper rolü) ---
DEPLOYER_ADDRESS=$DEPLOYER_ADDRESS

# --- Helios contract ID'leri ---
HELIOS_STRATEGY_ROUTER=$ROUTER_ID
HELIOS_KEEPER=$KEEPER_ID

# --- Blend v2 (testnet, # DOĞRULA reset olabilir) ---
BLEND_POOL=$BLEND_POOL
BLEND_BACKSTOP=$BLEND_BACKSTOP
BLEND_POOL_FACTORY=$BLEND_POOL_FACTORY
BLEND_EMITTER=$BLEND_EMITTER

# --- Reflector V3 testnet feeds (# DOĞRULA reset olabilir) ---
REFLECTOR_STELLAR_DEX=$REFLECTOR_STELLAR_DEX
REFLECTOR_EXT_CEX_DEX=$REFLECTOR_EXT_CEX_DEX
REFLECTOR_FIAT=$REFLECTOR_FIAT

# --- Config (init parametreleri) ---
MAX_LEVERAGE_BPS=$MAX_LEVERAGE_BPS
MIN_OPEN_HF_BPS=$MIN_OPEN_HF_BPS
FLASH_FEE_BPS=$FLASH_FEE_BPS
EOF
ok ".env.testnet yazıldı: $ENV_FILE"

log "apps/web .env.local üret (sadece NEXT_PUBLIC_* — frontend'in okuyacağı)"
mkdir -p "$(dirname "$WEB_ENV_FILE")"
cat > "$WEB_ENV_FILE" <<EOF
# Helios apps/web — testnet adresleri (DEPLOY $DEPLOYED_AT)
# Tekrar deploy çalıştırılırsa üzerine yazılır.
# Bu dosya SADECE public değerleri içerir; secret (SIGNING_KEY, JWT_SECRET vb) Vercel env'de.

NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_PASSPHRASE="Test SDF Network ; September 2015"

NEXT_PUBLIC_HELIOS_STRATEGY_ROUTER=$ROUTER_ID
NEXT_PUBLIC_HELIOS_KEEPER=$KEEPER_ID

NEXT_PUBLIC_BLEND_POOL=$BLEND_POOL
NEXT_PUBLIC_BLEND_BACKSTOP=$BLEND_BACKSTOP

NEXT_PUBLIC_REFLECTOR_STELLAR_DEX=$REFLECTOR_STELLAR_DEX
NEXT_PUBLIC_REFLECTOR_EXT_CEX_DEX=$REFLECTOR_EXT_CEX_DEX
EOF
ok "apps/web/.env.local yazıldı: $WEB_ENV_FILE"

# ─────────────────────────────────────────────────────────────────────────────
# Özet
# ─────────────────────────────────────────────────────────────────────────────
log "✅ Deploy başarılı"
echo ""
echo "  Deployer:           $DEPLOYER_ADDRESS"
echo "  STRATEGY_ROUTER:    $ROUTER_ID"
echo "  KEEPER:             $KEEPER_ID"
echo ""
echo "  Çıktılar:"
echo "    addresses.json:    $ADDRESSES_JSON"
echo "    .env.testnet:      $ENV_FILE"
echo "    apps/web/.env.local: $WEB_ENV_FILE"
echo ""
echo "  Sonraki: PROMPT 16 (Wallets Kit) + PROMPT 18 (SDK hook'lar)"
