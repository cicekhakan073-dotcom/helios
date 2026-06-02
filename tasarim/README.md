# tasarim/ — Helios design token stage

Bu klasör **geçici stage**'dir. Repo henüz pnpm/Turborepo monorepo'ya kurulmadığından (PROMPT 4 kuracak), tasarım katmanı dosyaları burada bekler. **PROMPT 6'da** apps/web ve packages/ui'ye dağıtılırlar.

## Dosyalar

| Dosya | Rol | PROMPT 6'da gideceği yer |
|---|---|---|
| `globals.css` | Tailwind v4 `@import "tailwindcss"` + `@theme` token bloğu + `:root` composite'ler + GlassPanel/AuroraBackground/Disclaimer base sınıfları + keyframes + `prefers-reduced-motion` | `apps/web/app/globals.css` |
| `tokens.ts` | TS token sabitleri (HF eşikleri, renk paletleri, chart palette, Framer Motion easing array'leri, oracle staleness eşikleri) | `packages/ui/src/tokens.ts` (`packages/ui` barrel'inden re-export) |
| `README.md` | bu dosya — taşıma planı + disiplin | — (sadece referans) |

## Kaynak ağacı (tek doğruluk kaynağı)

```
design-system.md   ← kaynak gerçek (sözel, isimli)
   ↓
globals.css        ← Tailwind v4 @theme + CSS custom property
tokens.ts          ← TS sabitleri (CSS okuyamayan kod yolu için)
   ↓ (mirror)
shared Rust crate  ← HF_HEALTHY_MIN / HF_CAUTION_MIN / HF_LIQUIDATION
   (PROMPT 13'te eklenecek)
```

**Çelişkide öncelik:** `design-system.md > globals.css > tokens.ts > shared (Rust) > eğitim verisi`.

Herhangi bir token değişikliği üç dosyada birlikte yapılmalı; tek dosya güncelleyip diğerleri unutmak **drift**'tir. PROMPT 18'de TS↔Rust HF eşik paritesi unit testi yazılır.

## Tailwind v4 kurulum (PROMPT 6 detayı)

`apps/web/app/globals.css` üst satırı:

```css
@import "tailwindcss";

@theme {
  /* ... tasarim/globals.css'ten aynen taşınır ... */
}
```

`apps/web/package.json` minimum bağımlılık (sürümler PROMPT 6'da canlı pinlenir; STELLAR_STACK.md güncel pin'lere bak):

- `tailwindcss` (v4)
- `@tailwindcss/postcss` (PostCSS plugin)
- `next` 16.x (Turbopack default; Tailwind v4 ile uyumlu)

> Tailwind v4 **CSS-first**; `tailwind.config.js` **zorunlu değildir**. Tüm yapılandırma `@theme` içinde CSS olarak yaşar.

## Tüketim disiplini

### CSS / Tailwind utility (component katmanı)

```tsx
<button class="bg-aurora-amber text-on-aurora rounded-md p-3 shadow-glow-amber">
  Open Position
</button>

<div class="glass-panel p-6">...</div>

<span class="text-display font-display">Helios</span>
```

Tailwind v4 `@theme` token'ları otomatik utility üretir:
- `--color-aurora-amber` → `bg-aurora-amber` / `text-aurora-amber` / `border-aurora-amber` ...
- `--text-display` → `text-display` (font-size + paired line-height + tracking + weight)
- `--radius-md` → `rounded-md`
- `--shadow-glow-amber` → `shadow-glow-amber`
- `--font-mono` → `font-mono`
- `--animate-aurora-amber` → `animate-aurora-amber`
- `--ease-standard` → `ease-standard`
- `--spacing` (tek skalar) → `p-1`/`p-4`/`p-24` (= `--spacing × N`)

### TS / JS (grafik + motion + worker)

```ts
import { colors, chartPalette, motion, riskBand, HF_LIQUIDATION } from "@/tokens";

// Recharts
<Line stroke={chartPalette.series[0]} />

// Framer Motion
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: motion.duration.slow, ease: motion.ease.enter }}
/>

// HF bant kullanımı
const band = riskBand(position.hf);   // "healthy" | "caution" | "danger" | "liquidatable"
```

## Dark-first + light hook

`globals.css` body'de varsayılan koyu tema set eder. Light theme için `:root[data-theme="light"]` bloğu boş bırakıldı — uygulama yok, sadece yapı. İleride gerekirse override'lar buraya gelir; `data-theme` HTML attribute'unu set eden bir ThemeProvider eklenir.

## A11y notları (design-system §8)

- Tüm interaktif elementlerde `:focus-visible` global ring (`var(--focus-ring)`) aktif.
- Finansal sayılar `.tabular` veya `[data-num]` attribute'u taşımalı (mono + tabular-nums).
- HF göstergeleri **renk + ikon + metin üçlüsü** — yalnız renkle anlam yasak; `tokens.ts` → `hfBandStyle` ikon + i18n key sağlar.
- `prefers-reduced-motion: reduce` blob'ları durdurur, geçişleri 80ms'e indirir.

## AUDIT 2026-05-31 ile uyum

- HF eşikleri (`1.5 / 1.2 / 1.0`) `tokens.ts` ile kontrat (Rust shared) arasında **drift testi** PROMPT 18'de yazılır.
- Oracle staleness sabitleri (`ORACLE_STALENESS_WARN_MS = 5dk`, `ORACLE_STALENESS_BLOCK_MS = 10dk`) — Blend 2025 oracle exploit yansıması (AUDIT §1.6). UI bunlardan beslenir.
- Cosmic koyu tema ROADMAP'in Risk Radar / Open Position akışlarıyla uyumlu — bu PROMPT'larda yeni bir token üretilmemeli; eksik varsa önce `design-system.md` güncellenir, sonra buraya yansır.

## Taşıma kontrol listesi (PROMPT 6 başında)

- [ ] `tasarim/globals.css` → `apps/web/app/globals.css` (kopyala, root layout'tan import et)
- [ ] `tasarim/tokens.ts` → `packages/ui/src/tokens.ts` (`packages/ui` barrel re-export)
- [ ] `apps/web` Tailwind v4 + PostCSS plugin yüklü, sürümler `STELLAR_STACK.md`'den pinli
- [ ] `pnpm --filter web build` `@theme` hatasız derliyor
- [ ] `_kitchen-sink` sayfasında HealthFactorBadge dört durumu da renk + ikon + metin ile gösteriyor
- [ ] `prefers-reduced-motion` testi: DevTools'tan açık iken aurora animasyonu duruyor
- [ ] `tasarim/` klasörü silinir (sadece bu noktada — yıkıcı işlem, kullanıcı onayıyla)
