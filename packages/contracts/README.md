# packages/contracts — Helios Soroban kontratları

Cargo workspace, **no_std** Soroban kontratları + paylaşılan tip kütüphanesi.

## Mimari (AUDIT 2026-05-31 sonrası kesin)

| Crate | Tip | Rol |
|---|---|---|
| `shared` | rlib (no_std) | Ortak tipler, HeliosError, AssetId, Position, HF eşikleri, TTL sabitleri, oracle guard sabitleri, event isimleri. |
| `strategy_router` | cdylib + rlib | Atomik tek-tx kaldıraç orchestrator'ı — Blend `pool.flash_loan(from, FlashLoan, requests)` sarmalayıcısı. **PROMPT 12** dolduracak. |
| `keeper` | cdylib + rlib | Opt-in tabanlı Auto-Rebalancer. **PROMPT 14** dolduracak. |

> **AUDIT §1.1 — workspace 4 → 2 (+1 shared).** `flash_lender` (Blend kendi flash_loan'ı var) ve `vault` (Blend `get_positions(user)` zaten tutuyor) **SİLİNDİ**. Helios pozisyon metadata'sı off-chain Neon DB'de (PROMPT 30).

## Sürüm pin'leri (Cargo.toml, kesin = pin)

| Crate | Pin | Kaynak (2026-06-01 doğrulandı) |
|---|---|---|
| `soroban-sdk` | `=26.0.1` | crates.io |
| `stellar-access` | `=0.7.1` | crates.io / OpenZeppelin/stellar-contracts |
| `stellar-tokens` | `=0.7.1` | crates.io / aynı repo |
| `stellar-contract-utils` | `=0.7.1` | crates.io / aynı repo |
| `stellar-macros` | `=0.7.1` | crates.io / aynı repo |

> Caret (`^`) veya tilde (`~`) YOK. Cargo'da `=X.Y.Z` formatı kesin pin'dir.

## Toolchain

- Rust **1.93** (`rust-toolchain.toml` ile pin; Soroban min 1.84).
- Build target: **`wasm32v1-none`** (`stellar contract build` standardı).
  - `wasm32-unknown-unknown` ESKİ, kullanma.
- `stellar` CLI **26.1.0** öneri (STELLAR_STACK.md pin).
  - Yerel 25.1.0 ile de derleme komutu çalışır (test edildi 2026-06-01); ama 26.x'e yükseltmek için: `cargo install --locked stellar-cli --version 26.1.0` veya brew/Homebrew formulalarını güncelle.

## Build & Test

```bash
# 1) Bağımlılıkları derle (host hedef — testler için)
cargo build --workspace

# 2) Wasm bytecode üret (her kontrat için)
stellar contract build
# Çıktı: target/wasm32v1-none/release/{strategy_router,keeper}.wasm

# 3) Tüm testler
cargo test --workspace

# 4) Pin'leri görüntüle (caret yok / kesin pin doğrulama)
cargo tree -p shared -e normal
```

## Testnet Deploy

`scripts/deploy-testnet.sh` — tek komutla build + keypair + Friendbot + deploy
+ init + doğrulama + `addresses.json` + `.env.testnet` üretimi.

```bash
# Tam akış (varsayılan: identity=helios-deployer, network=testnet)
bash scripts/deploy-testnet.sh

# Sadece deploy (build atla — wasm güncel ise)
bash scripts/deploy-testnet.sh --skip-build

# Özel identity adı (mevcut keypair'i tekrar kullanma)
bash scripts/deploy-testnet.sh --identity my-helios-key --skip-keypair
```

**Akış (script ne yapar):**
1. Pre-flight: stellar CLI + wasm32v1-none target kontrolü
2. `stellar contract build` (her kontrat için)
3. Keypair üret (`stellar keys generate --network testnet --fund`) → Friendbot fonu otomatik
4. `strategy_router.wasm` ve `keeper.wasm` deploy → contract ID'ler döner
5. `strategy_router.init(admin, BLEND_POOL, max_lev, min_hf, flash_fee)` invoke
6. `keeper.init(admin, keeper_role=admin, BLEND_POOL, ROUTER_ID)` invoke
7. Read-only doğrulama: `get_admin`, `is_paused`, `get_keeper` → beklenen değerleri döner
8. `addresses.json` + `.env.testnet` + `apps/web/.env.local` üretimi

**Çıktı dosyaları:**
| Dosya | İçerik | git? |
|---|---|---|
| `addresses.json` | Yapılandırılmış JSON, SDK (PROMPT 18) bunu tüketir | ✅ commit |
| `.env.testnet` | Server-side env değişkenleri | ❌ `.gitignore` |
| `apps/web/.env.local` | NEXT_PUBLIC_* — frontend okur | ❌ `.gitignore` |

**Harici adresler (Blend + Reflector testnet):**
Script `BLEND_POOL`, `BLEND_BACKSTOP`, `BLEND_POOL_FACTORY`, `BLEND_EMITTER`,
`REFLECTOR_STELLAR_DEX`, `REFLECTOR_EXT_CEX_DEX`, `REFLECTOR_FIAT` ortam
değişkenlerini override olarak kabul eder. Varsayılan değerler **2026-06-01**
tarihinde resmi kaynaklardan doğrulandı (STELLAR_STACK.md §5).

> ⚠️ Stellar testnet periyodik **reset** olur — adresler değişebilir.
> Reset sonrası `bash scripts/deploy-testnet.sh` ile yeniden deploy.

**Override örneği:**
```bash
BLEND_POOL=CXXX... MAX_LEVERAGE_BPS=300 bash scripts/deploy-testnet.sh
```

**Mock SEP-41 token deploy NOT:**
Bu script `usdc_sac` / `wbtc_sac` / `weth_sac` adreslerini doldurmaz; bunlar
**PROMPT 24** (faucet) sorumluluğunda. `addresses.json.tokens` bölümü
`null` ile başlar; PROMPT 24 script'i dolduracak.

## addresses.json schema

`scripts/addresses.template.json` schema referansıdır. Anahtarlar:
- `_meta`: network, passphrase, deployed_at, deployer
- `helios`: Helios kontrat ID'leri (router, keeper)
- `blend`: Blend v2 testnet adresleri
- `reflector`: Reflector V3 testnet feed'leri
- `tokens`: Mock SEP-41 token adresleri (PROMPT 24 dolduracak)
- `config`: init parametreleri (max_leverage_bps, min_open_hf_bps, flash_fee_bps)

> `stellar contract build` arka planda `cargo build --release --target wasm32v1-none` çağırır. Workspace içindeki sadece `crate-type = ["cdylib"]` olan crate'leri (`strategy_router`, `keeper`) hedefler; `shared` (rlib) WASM çıkarmaz — bu beklenen davranıştır.

## Klasör yapısı

```
packages/contracts/
├── Cargo.toml                   # workspace + pinler + release profile
├── rust-toolchain.toml          # 1.93 + wasm32v1-none target
├── README.md                    # bu dosya
└── crates/
    ├── shared/
    │   └── src/
    │       ├── lib.rs           # barrel
    │       ├── error.rs         # HeliosError #[contracterror]
    │       ├── asset.rs         # AssetId, Position
    │       ├── hf.rs            # HF eşik sabitleri (tek kaynak)
    │       ├── oracle_guard.rs  # AUDIT §1.6 oracle sabitleri
    │       ├── ttl.rs           # AUDIT §2.4 TTL sabitleri
    │       └── events.rs        # event isim sabitleri
    ├── strategy_router/
    │   └── src/lib.rs           # iskelet (PROMPT 12 doldurur)
    └── keeper/
        └── src/lib.rs           # iskelet (PROMPT 14 doldurur)
```

## Soroban gotchas (kontrat tasarımı için kalıcı)

| Kural | Kaynak |
|---|---|
| Tek tx = tek `InvokeHostFunctionOp`. Atomik akışları tek `strategy_router` fn'inde zincirle. | STELLAR_STACK §3 |
| MEMO_NONE zorunlu, muxed account olamaz. | aynı |
| `wasm32v1-none` (eski `wasm32-unknown-unknown` DEĞİL). | aynı |
| 64KB kontrat boyut limiti → release profile `opt-level=z`, `lto=true`, `codegen-units=1`, `panic="abort"`, `strip="symbols"`. | Cargo.toml |
| Storage: instance / persistent / temporary. TTL bitince arşivlenir. | `crates/shared/src/ttl.rs` |
| `overflow-checks = true` release'de AÇIK (finansal kod için zorunlu). | Cargo.toml |

## Frontend / SDK ile drift disiplini

- HF eşik sayıları (`HF_HEALTHY_MIN_BPS=150`, `HF_CAUTION_MIN_BPS=120`, `HF_LIQUIDATION_BPS=100`) hem `shared::hf` hem TS `tokens.ts`'te aynı sınırları verir. **PROMPT 18'de** TS ↔ Rust drift testi.
- Oracle eşikleri (`ORACLE_STALENESS_HARD_SECS=600`, `ORACLE_PRICE_DEVIATION_BPS=3000`) UI guard'ları için de tüketilir (`packages/ui/src/tokens.ts`).
- Event isim sabitleri (`pos_opened`, `rebalanced`, ...) frontend indexer'da birebir aynalanır.

## pnpm/turbo entegrasyonu

Bu klasör **Cargo workspace**'tir, npm/pnpm paketi değil. `pnpm install` görmez. Turbo pipeline'da Rust komutları için PROMPT 15 deploy script'i + opsiyonel `contracts:build`/`contracts:test` task'ları gelecek.

## Güvenlik

- ⚠️ **Testnet-only. Unaudited.** Kontrat denetimi yok.
- Reflector oracle: **staleness check + sanity bound** her fiyat tüketiminde (AUDIT §1.6 — Blend 2025 oracle exploit yansıması).
- Blend pool: kendi LTV/likidasyon parametrelerini kullanır; Helios kendi formülünü dayatmaz.
