# Helios — WCAG AA + Lighthouse audit rehberi (PROMPT 33)

Bu doküman, repo'da deployment doğrulama akışını anlatır. Skorlar repoda **kanıt
olarak** `docs/audit/` altına yazılır.

## Hızlı çalıştırma

```bash
# 1) Production build + server
pnpm -F web build
pnpm -F web start &   # PORT=3000 default

# 2) Audit
URL_BASE=http://localhost:3000 bash scripts/audit.sh
# çıktı: docs/audit/lighthouse-{landing,dashboard}.json + axe-landing.json + SUMMARY.md
```

## A11y kanıtları (kodda)

PROMPT 33 sonrası repoda zaten yerinde olan a11y desteği:

- **Skip link**: `apps/web/app/layout.tsx` → `#main-content` (focus-visible'da görünür).
- **Lang**: `<html lang="tr">` root layout.
- **Heading hiyerarşi**: her sayfa tek `h1` (page header) + iç bileşenlerde `h2/h3`.
- **Toast**: `role="alert"` (severity=danger) veya `role="status"` (info/warn) +
  `aria-live` matched.
- **HealthFactorBadge**: design-system §8.2 — renk + ikon + metin redundansı (renk-körü
  güvenli). `aria-label`'da HF değeri + band etiketi.
- **SVG grafikler**: `role="img"` + dinamik `aria-label` özetler:
  - `HfProjectionChart` — current HF + likidasyon eşiği şoku.
  - `RiskRadar` — Monte Carlo path/horizon + medyan HF + liqProb.
  - Simulator `EquityFanChart`, `HfBandChart`, `LeverageTradeoff` — son gün medyan +
    likidasyon olasılığı + leverage senaryoları.
- **Copilot stream**: `aria-live="polite"` (PROMPT 26).
- **Buttons & form fields**: tüm interaktiflerde `type="button"` (form submit yanlışlığı
  önler), `aria-label` non-text içerikte (ikon-only butonlar `aria-label`'lı), focus-visible
  Tailwind utility'leriyle her button'a uygulanır.

## SEO

- `apps/web/app/robots.ts` — `/api/` disallow, gerisi açık.
- Per-sayfa `metadata` (open / dashboard / simulator / leaderboard / faucet).
- Root layout `metadata.openGraph` + `twitter` card.
- Manifest (`app/manifest.ts`) PWA install için.

## Performans notları

PROMPT 32'deki **skeleton + loading.tsx** layout shift'i azaltır.
PROMPT 28'deki **dynamic worker** (Monte Carlo) UI thread'i bloklamaz.
Ağır lib'ler (`@visx/*`, `recharts`, `@ai-sdk/*`, `motion`) etkileşim/Suspense arkasında
yüklenir; izole error boundary biri patlasa sayfayı çökertmez.

## Hedef skorlar

| Kategori       | Hedef |
| -------------- | ----- |
| Performance    | ≥ 90  |
| Accessibility  | ~100  |
| Best Practices | ≥ 90  |
| SEO            | ≥ 90  |

## Bilinen sınırlar

- Lighthouse Performance skoru network/CPU emülasyonuna duyarlı; production deploy
  (Vercel edge) skoru `pnpm start` lokalden farklı çıkar.
- iOS push çalışması yalnız home-screen install + iOS 16.4+ (PROMPT 31).
- DB/VAPID/Upstash env'siz lokalde bazı bölümler "yapılandırılmadı" gösterir — Lighthouse
  bunu hata saymaz, info kalır.
