#!/usr/bin/env bash
# Helios — Lighthouse + axe a11y audit (PROMPT 33 ölçüm kanıtı).
#
# Önkoşullar:
#   pnpm -F web build && pnpm -F web start &   # PORT=3000 production server
#   pnpm dlx lighthouse@latest --help          # 12.x
#   pnpm dlx @axe-core/cli@latest --help
#
# Çıktı:
#   docs/audit/lighthouse-{landing,dashboard}.json
#   docs/audit/axe-{landing}.json
#   docs/audit/SUMMARY.md  (özet + kullanıcının ekleyeceği skorlar)
#
# Bu script tek-shot çalışır; CI/dev tarafından her PROMPT sonrası tetiklenir.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/docs/audit"
URL_BASE="${URL_BASE:-http://localhost:3000}"

mkdir -p "$OUT"

echo "▸ Lighthouse — landing"
pnpm dlx lighthouse@latest "$URL_BASE/" \
  --quiet --chrome-flags="--headless=new --no-sandbox" \
  --output=json --output-path="$OUT/lighthouse-landing.json" \
  --only-categories=performance,accessibility,best-practices,seo \
  --form-factor=desktop --throttling-method=simulate

echo "▸ Lighthouse — dashboard"
pnpm dlx lighthouse@latest "$URL_BASE/dashboard" \
  --quiet --chrome-flags="--headless=new --no-sandbox" \
  --output=json --output-path="$OUT/lighthouse-dashboard.json" \
  --only-categories=performance,accessibility,best-practices,seo \
  --form-factor=desktop --throttling-method=simulate

echo "▸ axe — landing"
pnpm dlx @axe-core/cli@latest "$URL_BASE/" \
  --save "$OUT/axe-landing.json" \
  --tags wcag2a,wcag2aa,wcag21a,wcag21aa

cat > "$OUT/SUMMARY.md" <<'EOF'
# Helios — Audit özeti (Lighthouse + axe)

> Çalıştır: `bash scripts/audit.sh` (production server `:3000`'de açıkken).
> Sonuçlar bu dizine yazılır; aşağıdaki tabloyu manuel güncelle.

| Sayfa     | Performance | Accessibility | Best Practices | SEO  |
| --------- | ----------: | ------------: | -------------: | ---: |
| Landing   |           — |             — |              — |    — |
| Dashboard |           — |             — |              — |    — |

## axe (landing)

| Tag                | Violation kritik | Major | Minor |
| ------------------ | ---------------: | ----: | ----: |
| wcag2a/aa, 21a/aa  |                — |     — |     — |

## Yöntem

- Lighthouse 12.x (npm pnpm dlx), Chrome headless, desktop simulate throttling.
- axe-core CLI, WCAG 2.0/2.1 A+AA tag set.

## Notlar

- DB/VAPID/Upstash yokken graceful boş durumlar değerlendirilir.
- PROMPT 32 izole error boundary'ler + skeleton'lar layout shift'i azaltır.
EOF

echo "✓ Audit tamam: $OUT"
EOF