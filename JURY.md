# Helios — Jüri rehberi

> ⚠️ **Testnet only · Unaudited · Eğitim amaçlı · Yatırım tavsiyesi DEĞİLDİR.**
> Helios Stellar / Soroban **testnet** üzerinde çalışır. Gerçek para yoktur.

---

## Ne yaptık (tek paragraf)

Stellar Soroban testnet'inde, **Blend v2 lending pool**'unun `flash_loan + Vec<Request>`
atomik mekanizmasını sararak **tek transaction + tek `InvokeHostFunctionOp` ile
kaldıraçlı yield pozisyonu açan/kapatan** bir orchestrator (Helios `strategy_router`).
Üstüne **AI Copilot** (canlı oracle/HF tool-call'ları), **Risk Radar** (Web Worker
Monte Carlo), **Simulator** (visx P10/P50/P90 + leverage trade-off), **Social
Leaderboard** (anonim PnL + strateji paylaşımı/follow), **Auto-Rebalancer keeper**
(off-chain cron + on-chain guard'lı rebalance), **PWA + Web Push** (HF eşik uyarısı),
**PROMPT 19 toast-katmanlı hata UX**, **PROMPT 32 izole error-boundary'li skeleton +
loading.tsx + error.tsx**, **PROMPT 33 WCAG AA + Lighthouse-ready a11y** ile
demo-kalite paketleme.

---

## Mimari özet

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  apps/web (Next.js 16.2.6 + React 19.2 + Turbopack, App Router)      │
  │  ─ /                   landing (PPR + "use cache" APY tablosu)        │
  │  ─ /open               wizard → /open/confirm (build/sim/sign/send)   │
  │  ─ /dashboard          PPR, SEP-10 gate, KPI + HF + Risk Radar + Copilot
  │  ─ /simulator          public, URL state, visx, Monte Carlo worker    │
  │  ─ /leaderboard        public anonim, strateji paylaş/follow          │
  │  ─ /faucet             XLM Friendbot proxy + Upstash rate-limit       │
  │                                                                      │
  │  /api/auth/{challenge,verify,me,logout}   SEP-10 JWT (jose)           │
  │  /api/copilot                              AI SDK v6 streamText +     │
  │                                            tool-call (read-only)      │
  │  /api/faucet                               Friendbot proxy            │
  │  /api/keeper/{cron,optin-index,log}        cron + KV indeks + log     │
  │  /api/push/{subscribe,unsubscribe}         VAPID web-push             │
  │  /api/leaderboard{,/me}                    anonim sıralama            │
  │  /api/strategies                           paylaşılan stratejiler    │
  │  /api/follow                               sosyal grafik             │
  │  /api/positions/snapshot                   entry-price authoritative │
  └──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  packages/sdk (TS)                                                   │
  │  ─ helios/{open,close,opt-in}-position + tx-pipeline (build→sim→sign)│
  │  ─ helios/hooks: usePosition(§6.4 hydration: Blend + Neon + fallback)│
  │  ─ blend-pool/{client,hook}: PoolV2.load + reserve snapshot          │
  │  ─ oracle/{client,pool-oracle}: Reflector V3 + Blend pool oracle     │
  │  ─ hf/index.ts: effectiveCollateral/Liability + projectHfBps +       │
  │     liquidationPrice + riskBand (Rust shared::hf ile birebir mirror) │
  │  ─ auth/* SEP-10 (jose) + wallet/* (Wallets Kit + Zustand)           │
  │  ─ errors/* normalizeError + AppError + ToastHost feed (PROMPT 19)   │
  └──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  packages/contracts (Rust, soroban-sdk 26.0.1, wasm32v1-none)        │
  │  ─ strategy_router::open_position(user,asset,principal,leverage_bps) │
  │    →  pool.flash_loan(user, FlashLoan{contract=flash_receiver,…},   │
  │         vec![ SupplyCollateral(asset, principal+flash) ])           │
  │    PROMPT 12-FIX-VI: çift-borç fix (Borrow request kaldırıldı)      │
  │  ─ strategy_router::close_position → pool.submit() (Repay+Withdraw)  │
  │  ─ flash_receiver::exec_op (PROMPT 12-FIX-VII: ayrı kontrat —        │
  │    re-entry yasağını dolanır)                                       │
  │  ─ keeper::{register_opt_in, remove_opt_in, rebalance}              │
  │     rebalance(caller,user,asset,debt,coll,assets,prices)→i128       │
  │  ─ blend mirror types (Pool/Reserve/Request/FlashLoan) — soroban-sdk│
  │    sürüm çatışmasından kaçınmak için kopya tip                      │
  └──────────────────────────────────────────────────────────────────────┘
```

---

## Canlı testnet adresleri (2026-06-03)

| Kontrat               | Adres                                                      |
| --------------------- | ---------------------------------------------------------- |
| Helios router         | `CBOQUIOAXTKAG7WFEPJRZMRKPOBJRNQCAKBXMK5PRIMMPB5QT3TMGDUR` |
| Helios flash_receiver | `CDN3P4IIKCUMWRVMECGOKGFF5Q2DRQBLE6VCPBWMJPVR2HN6KXCLJ3KL` |
| Helios keeper         | `CAKMJQ4BN24N5YDE7NGU23HXKAG26KJHOZSSMW6C7TXJFFOGZVRGNAM7` |
| Blend pool            | `CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF` |
| Blend pool oracle     | `CAZOKR2Y5E2OSWSIBRVZMJ47RUTQPIGVWSAQ2UISGAVC46XKPGDG5PKI` |
| XLM SAC (native)      | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

`packages/contracts/addresses.json` tek doğruluk kaynağı; SDK `FALLBACK`'ı da bu
adreslerle hizalı (`packages/sdk/src/addresses/index.ts`).

---

## Nasıl denenir — 90 saniyelik demo akışı

> Production deploy (Vercel) veya `pnpm -F web dev` lokal. Wallet: **Freighter** testnet.

1. **0–10s · /** Landing: APY tablosu (`"use cache"` 5dk), "Connect" → Freighter.
2. **10–25s · /faucet** "XLM iste" → Friendbot ile ~10000 XLM (testnet); rate-limit Upstash veya in-memory.
3. **25–55s · /open** Wizard: XLM asset, 10 XLM principal, 2× leverage. "Continue to confirm" → `/open/confirm` simulate önizleme → "Sign & Send".
4. **55–70s · /dashboard** PPR + SEP-10 gate. KPI grid (collateral/debt/HF/leverage), HF projeksiyon grafiği, Monte Carlo Risk Radar (5000 path), close + opt-in.
5. **70–85s · ✦ Copilot (sağ alt)** "2x XLM riskim ne?" — `getOraclePrice` / `getUserPosition` / `simulateLeverage` tool kartlarıyla gerekçeli risk yanıtı.
6. **85–90s · /simulator + /leaderboard** Hipotetik senaryo paylaşılır URL; anonim sıralama + follow.

---

## Canlı kanıtlar (commit içinde yorum olarak tx hash'leri)

Helios'un Open + Close akışları **testnet'te uçtan uca çalışıyor**. Son turlardaki
commit mesajları (`git log --oneline`) ilgili tx hash'lerini içerir; örnek:

```bash
git log --oneline --grep "canlı"
git log --all --grep "tx hash"
```

Komuttan örnek output ve manual sweep için `packages/contracts/addresses.json`'a
giderek pool ve router üzerinden Stellar Expert'te tx'leri görebilirsin:

- Router: <https://stellar.expert/explorer/testnet/contract/CBOQUIOAXTKAG7WFEPJRZMRKPOBJRNQCAKBXMK5PRIMMPB5QT3TMGDUR>
- Pool: <https://stellar.expert/explorer/testnet/contract/CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF>

Deployer hesabında (PROMPT 23-FIX) gerçek 2× XLM pozisyonu açıldı + kapatıldı; o
adresin tx'leri (`GAQUEFDOXD…`) Stellar Expert'te listelenir.

---

## Bilinen sınırlar (DÜRÜST liste)

Bu liste demo-makyajı değil — gerçek durumu yansıtır. CLAUDE.md ilkesi gereği
"BİLMİYORUM" demek serbesttir.

### 1. Faucet yalnız XLM

USDC/wBTC/wETH SAC'lerinin issuer'ı `GATALTGT…` (Blend testnet); Helios o hesabın
secret'ına **sahip değil** → otomatik mint imkansız. UI çalışmayan buton koymaz;
manuel yönlendirme (Soroswap/StellarTerm/Discord) ve `changeTrust` notu gösterir.
Demo akışı **XLM** üzerinden uçtan uca çalışır. (PROMPT 24 fix + ROADMAP-CHANGELOG
"Faucet kısıtı" kaydı.)

### 2. Keeper otomatik rebalance — uçtan uca tamam DEĞİL

- ✅ Off-chain HF taraması doğru (`computeUserHfBps` underlying).
- ✅ HF<trigger durumunda **push bildirimi gönderilir** (rebalance kararından bağımsız).
- ✅ `compute_hf_bps` kontratta `c_factor/l_factor 7-dec→bps` fix uygulandı (`#3 InvalidParams` giderildi).
- ⏳ Same-asset MVP'de tx'in deleverage miktarları (underlying) + close-buffer rework AÇIK; canlı keeper tx'i deneme aşamasında. (Mimari sağlam: `flash_receiver` re-entry fix, kontrat guard'ları, KV lock var; eksik olan tek şey `debt_amount`/`collateral_amount` ölçek sıkılaştırması.)
- Yani **otomatik rebalance demo'da tx atmaz**; HF-uyarı pushları gelir. Bu jüriye açıkça anlatılır.

### 3. Same-asset MVP — XLM-bound 2× cap

`HF(L) = L·c·l/(L−1)` formülüne göre XLM (c=l=0.9) için L=3× → HF=1.215 < 1.30 → pool
`#1205 InvalidHf` ile reddeder. Wizard 200 bps cap, SDK `tx-builder` 200 bps bound;
3×+ açılışta tx kurulmaz (gas yedirmez). (PROMPT 12-FIX-V + diag.)

### 4. Env-gated yetenekler

| Yetenek                     | Gerekli env                          | Yoksa davranış                    |
| --------------------------- | ------------------------------------ | --------------------------------- |
| AI Copilot                  | `ANTHROPIC_API_KEY`                  | 503 + "yapılandırılmadı" mesajı   |
| Leaderboard/Follow/Snapshot | `DATABASE_URL` (Neon)                | route 200 + boş + UI "DB yok"     |
| Push uyarıları              | `VAPID_*` + DB                       | UI "yapılandırılmadı"             |
| Cron rebalance              | `CRON_SECRET` + `KEEPER_SECRET` + DB | 401 / 503 / KV in-memory fallback |
| Rate limit                  | `UPSTASH_REDIS_REST_*`               | in-memory (tek instance dev)      |
| DB seed                     | `DATABASE_URL`                       | seed scripti sessizce çıkar       |

Yani **build/lint/typecheck DATABASE_URL/VAPID/ANTHROPIC/UPSTASH yokken yeşil**;
deploy sonrası env'leri Vercel project'e ekleyince yetenekler açılır.

### 5. iOS push şartı

iOS Safari'de Web Push **yalnız** home-screen'e eklenmiş PWA'da çalışır (iOS 16.4+).
Aksi halde subscribe butonu görünür ama platform izni vermez. UI bunu açıkça söyler.

### 6. Audit eksiklikleri

- Helios kontratları **denetim görmedi** — kod "unaudited" etiketli.
- Lighthouse skoru deploy'a kadar JSON kanıtı yok; `scripts/audit.sh` ile üretilir (`docs/AUDIT.md`).

---

## Çalıştırma (jüri için)

```bash
# 1) Lokal dev (önerilen)
cp apps/web/.env.example apps/web/.env.local
# Minimum: HELIOS_SEP10_SIGNING_SECRET + HELIOS_JWT_SECRET (openssl rand) doldur.
# (Diğerleri opsiyonel — eksik özellikler graceful kapanır.)
pnpm install
pnpm -F web dev   # http://localhost:3000

# 2) Cargo testler (kontrat)
cd packages/contracts && cargo test --workspace

# 3) SDK vitest
pnpm -F @helios/sdk test

# 4) Production build
pnpm -F web build && pnpm -F web start

# 5) Lighthouse + axe (PROMPT 33)
URL_BASE=http://localhost:3000 bash scripts/audit.sh
# → docs/audit/{lighthouse-landing.json,lighthouse-dashboard.json,axe-landing.json}
```

Vercel deploy: repo'yu Vercel'e import, root **`apps/web`**, env'leri ekle, deploy.
`vercel.json` `installCommand` + `buildCommand` ve cron tanımı pinli. Hobby plan
günlük tek cron destekler; `*/10` ihtiyacı için Pro+ veya manuel POST Bearer.

---

## Kapsamlı kanıt linkleri

- ROADMAP `./ROADMAP.md` — 34 atomik prompt + audit'ler.
- ROADMAP-CHANGELOG `./ROADMAP-CHANGELOG.md` — canlı doğrulamalarla düzeltmeler.
- STELLAR_STACK `./STELLAR_STACK.md` — kullanılan tüm paketlerin pinli sürümleri.
- design-system `./tasarim/design-system.md`.
- A11y audit `./docs/AUDIT.md`.
- Kontrat addresses `./packages/contracts/addresses.json`.

---

> **Yatırım tavsiyesi DEĞİLDİR · Eğitim amaçlıdır · Testnet · Unaudited.**
