# Helios

> Stellar/Soroban üzerinde **AI destekli, çoklu varlık, kaldıraçlı verim** platformu.
> Çekirdek: atomik tek-tx flash loan + Blend lending döngüsü.
> 7 katman: AI Strategy Copilot, Risk Radar, Auto-Rebalancer, Multi-Asset Vaults, Monte Carlo Simulator, Social Leaderboard, PWA + Web Push.

> ⚠️ **TESTNET-ONLY · UNAUDITED · NOT FINANCIAL ADVICE.**
> Mainnet'e işlem gönderilmez, gerçek para iması yoktur. Kod denetlenmemiştir.

## Monorepo yapısı

```
helios/
├── apps/
│   └── web/                 — Next.js 16 App Router (PWA)
├── packages/
│   ├── ui/                  — Paylaşılan UI primitifleri (Button, GlassPanel, HealthFactorBadge, ...)
│   ├── sdk/                 — TS SDK (TanStack Query hook'ları, contract bindings, oracle/Blend wrapper)
│   └── contracts/           — Rust/Soroban kontratları (Cargo workspace — PROMPT 7'de gelir)
├── tasarim/                 — Design token stage (PROMPT 6'da apps/web + packages/ui'ye taşınır)
├── VISION.md                — Ürün vizyonu + 90sn demo
├── design-system.md         — Görsel dil + token isimleri (tek doğruluk kaynağı)
├── ROADMAP.md               — 34 atomik prompt + AUDIT 2026-05-31 appendix
├── ROADMAP-CHANGELOG.md     — Tüm düzeltmeler ve denetim turu
├── STELLAR_STACK.md         — Doğrulanmış teknoloji yığını (kanonik pin'ler)
└── CLAUDE.md                — Çalışma ilkeleri
```

## Geliştirme

### Gereksinimler

| Araç | Sürüm | Not |
|---|---|---|
| Node.js | ≥ 20.9 (LTS) | `.nvmrc` 20 |
| pnpm | 11.5.0 | `packageManager` alanında pinli |
| Rust | ≥ 1.84 | Soroban için (PROMPT 7'de) |
| stellar-cli | 26.1.0 | `stellar contract build` (PROMPT 7+) |

```bash
# bağımlılıkları yükle
pnpm install

# dev (Turbopack)
pnpm dev

# build
pnpm build

# lint + typecheck + test
pnpm lint
pnpm typecheck
pnpm test
```

### Workspace'ler

- `apps/web` → `@helios/web` (özel, deploy artifact)
- `packages/ui` → `@helios/ui`
- `packages/sdk` → `@helios/sdk`
- `packages/contracts` → Rust workspace (npm'e ait değil)

## Yol haritası

34 atomik prompt 7 faza dağıtılı (`ROADMAP.md`):

| Faz | Aralık | Çıktı |
|---|---|---|
| 0 — Vizyon & Tasarım | PROMPT 1–3 | VISION.md, design-system.md, tasarim/ |
| 1 — Repo & Tooling | PROMPT 4–6 | **Bu repo**, lint/test/types, UI primitifleri |
| 2 — Soroban kontratlar | PROMPT 7–15 | strategy_router + keeper + Blend/Reflector entegrasyon + testnet deploy |
| 3 — Wallet & Auth & SDK | PROMPT 16–19 | Wallets Kit + SEP-10 + tip-güvenli SDK |
| 4 — Ana akışlar | PROMPT 20–24 | Landing, Open Position, Dashboard, Faucet |
| 5 — Hackathon silahları | PROMPT 25–30 | AI Copilot, Risk Radar, Monte Carlo, Keeper cron, Leaderboard |
| 6 — Cila & Deploy | PROMPT 31–34 | PWA + Web Push, a11y, Lighthouse, Vercel deploy |

> Her PROMPT'tan önce **ROADMAP.md → "AUDIT 2026-05-31"** bölümünü oku (bağlayıcı düzeltmeler ve canlı kaynak referansları).

## Güvenlik ilkeleri

- **Sadece testnet**, hiçbir akışta mainnet'e işlem yok.
- **Unaudited**: kontratlar denetimden geçmedi, "audited" iması yok.
- **Oracle dürüstlüğü** (Blend 2025 exploit yansıması, AUDIT §1.6): staleness check, TWAP sanity bound, UI'da "Oracle risk" başlığı.
- **AI Copilot**: "yatırım tavsiyesi değildir, eğitim amaçlıdır" çerçevesinde kalır.
- **HF eşikleri** (1.5 / 1.2 / 1.0) `design-system.md` + Rust `shared` crate + TS SDK'da **drift testi** ile aynalanır.

## Lisans

Hackathon/demo projesi. Henüz lisans dosyası eklenmedi.
