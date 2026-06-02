# design-system.md — Helios "Stellar Cosmic"

> Helios'un görsel dili. **Tek doğruluk kaynağı**: Tüm Tailwind/CSS/TS token'ları (PROMPT 3 → `globals.css`, `tokens.ts`) bu dosyadaki isimleri birebir referans alır. HF eşik sayıları (1.5 / 1.2) **shared Rust crate** (PROMPT 13) ve **TS SDK** (PROMPT 18) ile aynı sabit olarak yansıtılır. Çelişkide bu dosya kaynaktır.
>
> Estetik: koyu uzay + aurora aksanları + glassmorphism. Premium DeFi dashboard hissi. Helios = Güneş Tanrısı → birincil marka aksanı **amber/gold**; ikincil mauve + teal aurora.
>
> ⚠️ Testnet-only, unaudited demo. Tasarım dili bu gerçeği gizlemez — "Unaudited · Testnet · Not financial advice" şeridi bileşen kataloğunda birinci sınıf.

---

## 1. Renk Paleti

Tüm renkler **HSL ve HEX** olarak iki biçimde sunulur (HSL Tailwind v4 / CSS variables için, HEX hızlı okuma için). HSL `hsl(H S% L%)` formatında.

### 1.1 Uzay (background) skalası — koyu, derinlik veren

| Token | HEX | HSL | Kullanım |
|---|---|---|---|
| `--color-space-950` | `#03040A` | `hsl(231 53% 2%)` | Mutlak en alt katman (body root, modal scrim arka katmanı) |
| `--color-space-900` | `#05060D` | `hsl(231 45% 4%)` | Varsayılan sayfa arka planı |
| `--color-space-800` | `#0B0E1C` | `hsl(229 44% 8%)` | Bölüm arka planı (örn. landing section bandı) |
| `--color-space-700` | `#11162B` | `hsl(229 43% 12%)` | Panel/kart düz arka plan (non-glass) |
| `--color-space-600` | `#1A2040` | `hsl(230 42% 18%)` | Elevated kart, hover/active surface |
| `--color-space-500` | `#252C55` | `hsl(231 38% 25%)` | Divider üst katman, subtle separator bg |

### 1.2 Aurora aksan renkleri — gradient + glow için

| Token | HEX | HSL | Kullanım |
|---|---|---|---|
| `--color-aurora-amber` | `#FBBF24` | `hsl(43 96% 56%)` | **Birincil marka aksanı (Helios solar)**. Primary CTA, brand mark, en kritik aksan |
| `--color-aurora-amber-glow` | `#FCD34D` | `hsl(45 96% 64%)` | Aurora hue parlak nokta, glow merkezi |
| `--color-aurora-mauve` | `#B583FF` | `hsl(266 100% 76%)` | İkincil aurora rengi, gradient orta band, info aksan |
| `--color-aurora-mauve-deep` | `#7C3AED` | `hsl(263 84% 58%)` | Mauve koyu varyant — hover, derinlik |
| `--color-aurora-teal` | `#5EEAD4` | `hsl(168 76% 64%)` | Üçüncül aurora, focus ring, link hover, fresh-data ping |
| `--color-aurora-teal-deep` | `#14B8A6` | `hsl(173 80% 40%)` | Teal koyu varyant |

> **Marka gradient'i (`--gradient-aurora`)**: `linear-gradient(135deg, --aurora-amber 0%, --aurora-mauve 45%, --aurora-teal 100%)`. Hero başlık, brand emblem, "Open Position" primary butonun aktif/loading durumunda.

### 1.3 Semantik renkler

Aurora aksanlarından **AYRI**. Aurora "brand", semantik "durum". Aynı boyada karıştırılmaz.

| Token | HEX | HSL | Kullanım |
|---|---|---|---|
| `--color-success` | `#22C55E` | `hsl(142 71% 45%)` | Tx success, "Healthy" durumu |
| `--color-success-soft` | `#16331E` | `hsl(141 41% 14%)` | Success badge arka planı |
| `--color-warn` | `#F59E0B` | `hsl(38 92% 50%)` | "Caution", oracle staleness, max leverage yakın |
| `--color-warn-soft` | `#3D2A05` | `hsl(38 86% 13%)` | Warn badge arka planı |
| `--color-danger` | `#EF4444` | `hsl(0 84% 60%)` | "Danger", likidasyon yakın, tx revert, irreversible action |
| `--color-danger-soft` | `#3F1212` | `hsl(0 56% 16%)` | Danger badge arka planı |
| `--color-info` | `#60A5FA` | `hsl(213 94% 68%)` | Bilgilendirme, ipucu, link |
| `--color-info-soft` | `#0F2547` | `hsl(218 64% 17%)` | Info badge arka planı |

### 1.4 Health Factor durum renkleri (KRİTİK — tek kaynak)

HF renkleri semantik renklerle hizalanmış ama **ayrı token** olarak tanımlanır ki Rust/TS aynalama tek isim uzayında olsun. **Eşikler tek sabit:**

| Durum | Token | HEX | Eşik (HF) | Eşlik eden ikon | Eşlik eden etiket |
|---|---|---|---|---|---|
| **Healthy** | `--color-hf-healthy` | `#22C55E` (= `--color-success`) | `HF ≥ 1.5` | `shield-check` (lucide) | "Healthy" |
| **Caution** | `--color-hf-caution` | `#F59E0B` (= `--color-warn`) | `1.2 ≤ HF < 1.5` | `alert-triangle` | "Caution" |
| **Danger** | `--color-hf-danger` | `#EF4444` (= `--color-danger`) | `HF < 1.2` | `alert-octagon` | "Danger" |
| **Liquidatable** | `--color-hf-liquidatable` | `#B91C1C` | `HF < 1.0` | `skull` | "Liquidation" |

> **Tek kaynak kuralı:** Bu eşik sayıları (`1.5`, `1.2`, `1.0`) **HF_HEALTHY_MIN**, **HF_CAUTION_MIN**, **HF_LIQUIDATION** olarak hem `shared` Rust crate'inde (PROMPT 13) hem TS SDK'da (PROMPT 18) **aynı isimle** yaşar. Drift testi PROMPT 18'de zorunlu.
>
> ⚠️ **Renk asla tek başına anlam taşımaz** — her HF göstergesi `renk + ikon + metin etiketi` üçlüsünü birlikte gösterir (renk körlüğü güvenliği, bkz. §8).

### 1.5 Metin renkleri (kontrast hiyerarşisi)

`--color-space-900` arka plan üzerinde ölçülmüş kontrast oranları parantezde.

| Token | HEX | HSL | Kontrast (vs space-900) | Kullanım |
|---|---|---|---|---|
| `--color-text-high` | `#F8FAFC` | `hsl(210 40% 98%)` | ≈ 18.2:1 (AAA) | Başlıklar, sayısal değerler, önemli içerik |
| `--color-text-medium` | `#CBD5E1` | `hsl(213 27% 84%)` | ≈ 12.0:1 (AAA) | Gövde metni, açıklamalar |
| `--color-text-low` | `#94A3B8` | `hsl(215 20% 65%)` | ≈ 6.8:1 (AA Large + AAA Normal sınırında) | Caption, secondary label, meta info |
| `--color-text-disabled` | `#64748B` | `hsl(215 16% 47%)` | ≈ 4.1:1 (AA Large sınırında) | Disabled state — **etkileşimli olmayan** metin için |
| `--color-text-on-aurora` | `#0B0E1C` | `hsl(229 44% 8%)` | — | Aurora dolgu üstündeki metin (örn. amber butonda) |
| `--color-text-link` | `#60A5FA` | `hsl(213 94% 68%)` | ≈ 7.4:1 (AAA) | Link default |
| `--color-text-link-hover` | `#5EEAD4` | `hsl(168 76% 64%)` | ≈ 11.1:1 | Link hover |

### 1.6 Border, divider, overlay

| Token | Değer | Kullanım |
|---|---|---|
| `--color-border-subtle` | `rgba(255,255,255,0.06)` | Hairline, çok hafif separator |
| `--color-border-default` | `rgba(255,255,255,0.10)` | Kart border, input border idle |
| `--color-border-strong` | `rgba(255,255,255,0.20)` | Hover border, vurgulanmış sınır |
| `--focus-ring` | `--color-aurora-teal` (3px ring) | Focus-visible ring (a11y) |
| `--color-overlay-modal` | `rgba(3,4,10,0.72)` | Modal scrim |
| `--color-overlay-hover` | `rgba(255,255,255,0.04)` | Hover surface katmanı |

---

## 2. Tipografi

### 2.1 Font aileleri

| Token | Stack | Kullanım |
|---|---|---|
| `--font-sans` | `'Geist Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif` | Tüm UI metni varsayılan (heading + body) |
| `--font-mono` | `'Geist Mono', 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace` | Sayısal/finansal değerler, tx hash, address |
| `--font-display` | `--font-sans` (tek aile, 700 ağırlık) | Hero, landing display — ayrı font değil ağırlık+spacing |

> Geist self-host (Next.js `next/font/local` ile) önerilir; latency için preload. Fallback'ler bilinçli — Geist yüklenmeden de okunabilir, layout shift `font-display: swap` ile yumuşar.

### 2.2 Tip ölçeği (modular ≈1.25)

`font-size / line-height / letter-spacing / font-weight` formatında.

| Token | Boyut | Line-height | Tracking | Weight | Kullanım |
|---|---|---|---|---|---|
| `--text-display` | 56px (3.5rem) | 64px (1.14) | -0.025em | 700 | Landing hero, kapanış cümlesi |
| `--text-h1` | 40px (2.5rem) | 48px (1.2) | -0.02em | 700 | Sayfa başlığı (Dashboard, Open Position) |
| `--text-h2` | 30px (1.875rem) | 38px (1.27) | -0.015em | 600 | Section başlığı |
| `--text-h3` | 22px (1.375rem) | 30px (1.36) | -0.01em | 600 | Kart başlığı, drawer başlığı |
| `--text-h4` | 18px (1.125rem) | 26px (1.44) | -0.005em | 600 | Alt başlık, KPI tile label |
| `--text-body-lg` | 16px (1rem) | 24px (1.5) | 0 | 400 | Önemli paragraf, modal içeriği |
| `--text-body` | 14px (0.875rem) | 22px (1.57) | 0 | 400 | Varsayılan gövde |
| `--text-caption` | 12px (0.75rem) | 18px (1.5) | 0.02em | 500 | Etiket, meta, disclaimer |
| `--text-micro` | 11px (0.6875rem) | 16px (1.45) | 0.04em | 600 | Badge, taglı sayaç (UPPERCASE) |
| `--text-numeric-xl` | 36px (2.25rem) | 42px (1.17) | -0.02em | 700 | StatTile büyük rakam (mono) |
| `--text-numeric-lg` | 24px (1.5rem) | 30px (1.25) | -0.01em | 600 | HF değeri, APY büyük |
| `--text-numeric-md` | 16px (1rem) | 22px (1.375) | 0 | 500 | Tablo hücresi sayı, drawer içi |

> **Tailwind v4 paired tokens:** Bu satırların her biri için 4 paired CSS değişkeni üretilir: `--text-<name>` (size), `--text-<name>--line-height`, `--text-<name>--letter-spacing`, `--text-<name>--font-weight`. `text-h1` utility'si dördünü birden uygular. (`--font-display` aynı dosyada AYRI bir token: family alias `var(--font-sans)`; karıştırma.)

### 2.3 Sayısal değer (finansal) kuralları — **zorunlu**

Her finansal değer (HF, fiyat, miktar, APY, PnL, tx fee, leverage) şu kombinasyonu **mecburi** kullanır:
- `font-family: var(--font-mono)`
- `font-variant-numeric: tabular-nums slashed-zero`
- Sağa hizalı (tablo, KPI tile)
- Bin ayracı: kullanıcı locale'i (TR: nokta, EN: virgül). Decimal separator yine locale'e bağlı; **karışık göstermeyiz**.
- Asset miktarları için maksimum 7 anlamlı haneden sonra kısaltma (`1.234567 USDC` → 7'den fazla varsa truncate + tam değer tooltip'te).
- Negatif değerler `--color-danger`, pozitif `--color-success` ile yalnız PnL bağlamında renklenir; düz değerlerde renklendirilmez.

---

## 3. Spacing & Radius (4px tabanlı)

### 3.1 Spacing ölçeği

Tailwind v4 **tek skalar** (`--spacing: 0.25rem`) ile tüm spacing utility'lerini türetir. `p-N` = `padding: calc(var(--spacing) * N)`. Yani aşağıdaki ölçek **kavramsal**; CSS'te ayrı `--space-N` token'ı YOKTUR — utility tarafında `p-1`, `p-4`, `p-24` kullanılır.

| Utility | Etkin değer | Kullanım |
|---|---|---|
| `p-0` / `m-0` / `gap-0` | 0 | — |
| `p-1` / `m-1` | 4px (0.25rem) | İkon-metin arası, en küçük gap |
| `p-2` | 8px | Buton iç padding y, küçük gap |
| `p-3` | 12px | Form input padding y, kart iç gap küçük |
| `p-4` | 16px | Varsayılan padding, kart iç padding |
| `p-5` | 20px | Form satır arası |
| `p-6` | 24px | Kart iç padding büyük, section gap küçük |
| `p-8` | 32px | Bölüm dışı dikey gap |
| `p-10` | 40px | Section ayraç |
| `p-12` | 48px | Landing section spacing |
| `p-16` | 64px | Hero alt margin, büyük dikey ritim |
| `p-20` | 80px | Sayfa üst/alt nefes |
| `p-24` | 96px | Landing hero üst |

> ⚠️ Background koyuluk skalası (`--color-space-500..--color-space-950`) ile bu spacing skalası farklı şeylerdir. `--color-space-900` = renk; `p-9` = `calc(0.25rem * 9)` = 36px (kullanılmıyor). Karıştırma.

### 3.2 Radius ölçeği

| Token | Değer | Kullanım |
|---|---|---|
| `--radius-xs` | 2px | İnce çizgi vurgusu, mini badge |
| `--radius-sm` | 4px | Input, küçük buton, chip |
| `--radius-md` | 8px | Varsayılan buton, dropdown |
| `--radius-lg` | 12px | Kart |
| `--radius-xl` | 16px | GlassPanel, modal |
| `--radius-2xl` | 24px | Hero kart, büyük drawer |
| `--radius-pill` | 9999px | Pill badge, avatar, leaderboard rütbe |

---

## 4. Elevation & Shadow

| Token | Değer | Kullanım |
|---|---|---|
| `--shadow-elev-0` | `none` | Düz yüzey |
| `--shadow-elev-1` | `0 1px 2px rgba(0,0,0,0.40)` | Kart sınırı vurgu, input fokussuz |
| `--shadow-elev-2` | `0 4px 12px rgba(0,0,0,0.45)` | Hover'da kart kalkması, dropdown |
| `--shadow-elev-3` | `0 10px 30px rgba(0,0,0,0.55)` | Modal, drawer |
| `--shadow-elev-4` | `0 24px 60px rgba(0,0,0,0.65)` | Toast (üst seviye) |
| `--shadow-glow-amber` | `0 0 32px rgba(251,191,36,0.32)` | Primary CTA glow, brand vurgu |
| `--shadow-glow-mauve` | `0 0 28px rgba(181,131,255,0.28)` | İkincil aksan glow |
| `--shadow-glow-teal` | `0 0 24px rgba(94,234,212,0.30)` | Focus ring outer, fresh-data ping |
| `--shadow-glow-danger` | `0 0 24px rgba(239,68,68,0.36)` | Danger HF glow (RiskGauge) |

---

## 5. GlassPanel (glassmorphism) tanımı

Helios'un dashboard hissinin kalbi. Composite token grubu (implementasyon: `globals.css` → `:root` katmanı; utility değil, custom property + `.glass-panel` sınıfı).

| Özellik | Token | Değer |
|---|---|---|
| `background` | `--glass-bg` | `rgba(17, 22, 43, 0.55)` (≈ `--color-space-700` @ 55% alpha) |
| `background` (fallback) | `--glass-bg-fallback` | `rgba(11, 14, 28, 0.92)` (`@supports not (backdrop-filter)`) |
| `backdrop-filter` | `--glass-backdrop` | `blur(var(--blur-glass)) saturate(140%)` → `blur(20px)` |
| `border` | `--glass-border` | `1px solid rgba(255,255,255,0.08)` |
| `inner highlight` | `--inset-shadow-glass` | `inset 0 1px 0 rgba(255,255,255,0.06)` (üst kenar parlama) |
| `border-radius` | `--radius-xl` | 16px |
| `box-shadow` | `--shadow-elev-2` | (default) `0 4px 12px rgba(0,0,0,0.45)` |
| `padding (varsayılan)` | `calc(var(--spacing) * 6)` | 24px (`p-6` utility'si aynısı) |

Varyantlar:
- `glass-panel--elevated` → shadow `--shadow-elev-3`, hover'da `--shadow-glow-mauve` katmanı ekler.
- `glass-panel--bordered-aurora` → border yerine 1px aurora-gradient (CTA odaklı pano).
- `glass-panel--danger` → inner highlight kaldırılır, border `--color-danger` @ 30% alpha (kritik uyarı).

**Erişilebilirlik**: `backdrop-filter` desteklenmiyorsa fallback: `background: rgba(11,14,28,0.92)` (opak yakın). Test edilmeli, support sorgusuyla.

---

## 6. Motion dili

### 6.1 Süre token'ları (Framer Motion + CSS)

| Token | Değer | Kullanım |
|---|---|---|
| `--duration-instant` | 80ms | Mikro: focus ring belirme |
| `--duration-fast` | 120ms | Hover renk geçişi, küçük buton press |
| `--duration-base` | 200ms | Varsayılan etkileşim, tooltip, dropdown |
| `--duration-slow` | 360ms | Drawer aç/kapa, modal enter, sayfa içi geçiş |
| `--duration-slower` | 600ms | Stagger giriş, kart in-view animasyonu |
| `--duration-ambient` | 18s | Aurora background loop tek devir |

### 6.2 Easing token'ları

| Token | cubic-bezier | Kullanım |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Tüm genel geçişler (Material standard) |
| `--ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | Giriş (modal/drawer açılırken) |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Çıkış |
| `--ease-emphasis` | `cubic-bezier(0.2, 0, 0, 1)` | Önemli CTA, tx success |
| `--ease-spring-soft` | `cubic-bezier(0.34, 1.36, 0.64, 1)` | Yumuşak overshoot (HF badge in) |

> Framer Motion `transition={{ duration, ease }}` bunları tüketir. `ease` array biçiminde (`[0.4, 0, 0.2, 1]`) verilir — `tokens.ts` (PROMPT 3) bunu hem string hem dizi olarak export eder.

### 6.3 "Aurora background" animasyon konsepti

3 büyük yumuşak **radial-gradient blob** (amber, mauve, teal) `position: fixed`, `z-index: -1`, kalın `blur(80px)`. Her biri 0–100% x/y arasında dolaşır:
- **Amber blob**: sol-üst → sağ-orta → sol-alt (16s loop, `--ease-standard`).
- **Mauve blob**: sağ-üst → sol-orta → sağ-alt (20s loop, faz offset 4s).
- **Teal blob**: orta-alt → sağ-üst → sol-alt (24s loop, faz offset 8s).

Toplam ambient hareket ~`--duration-ambient`. Görsel his: yıldız tozu içinde sessiz akış, zorlamadan.

**`prefers-reduced-motion: reduce`** → blob'lar statik (`animation-play-state: paused`), gradient sabit duruşunu korur.

### 6.4 Etkileşim mikrokuralları

| Eylem | Süre | Easing | Not |
|---|---|---|---|
| Buton hover (bg) | `--duration-fast` | `--ease-standard` | |
| Buton press (scale 0.97) | `--duration-instant` | `--ease-exit` | |
| Buton release | `--duration-fast` | `--ease-spring-soft` | |
| Kart in-view (y+12 → 0, opacity) | `--duration-slow` | `--ease-enter` | Stagger 60ms |
| Drawer aç | `--duration-slow` | `--ease-enter` | x: 100% → 0 |
| Toast in | `--duration-base` | `--ease-spring-soft` | y: -16 → 0 |
| HF değer değişimi | `--duration-base` | `--ease-emphasis` | count-up |
| Tx success burst | `--duration-slow` | `--ease-emphasis` | tek seferlik glow + checkmark |
| Aurora blob loop | `--duration-ambient` | `--ease-standard` | infinite |

---

## 7. Bileşen anatomisi (≥ 7 primitif)

Her primitif "hangi token'lara dayanıyor" tablosuyla. Gerçek kod PROMPT 6'da `packages/ui` altında.

### 7.1 Button (varyantlar: `primary` / `ghost` / `danger`)

| Özellik | Token |
|---|---|
| Font | `--text-body` weight 600, line-height 1.2 |
| Padding | y: `p-3` (12px), x: `px-5` (20px) |
| Radius | `--radius-md` |
| Min height | 40px (icon-only kare 40×40) |
| Focus ring | 2px `--focus-ring` + 2px offset boş (a11y) |
| **Primary** bg | `--color-aurora-amber` |
| **Primary** text | `--color-text-on-aurora` |
| **Primary** hover | bg `--color-aurora-amber-glow` + `--shadow-glow-amber` |
| **Primary** active | scale(0.97), `--duration-instant` `--ease-exit` |
| **Primary** loading | `--gradient-aurora` shimmer overlay |
| **Ghost** bg | transparent |
| **Ghost** text | `--color-text-high` |
| **Ghost** border | `--color-border-default` |
| **Ghost** hover | bg `--color-overlay-hover` + border `--color-border-strong` |
| **Danger** bg | `--color-danger` |
| **Danger** text | `--color-text-high` |
| **Danger** confirm pattern | ilk tıklamada "Confirm" state'i 3 sn (yıkıcı işlem koruması — close position, opt-out keeper) |
| Disabled | opacity 0.4, `cursor: not-allowed`, pointer-events off |

### 7.2 Card

| Özellik | Token |
|---|---|
| Background | `--color-space-700` |
| Border | 1px `--color-border-default` |
| Radius | `--radius-lg` |
| Padding | `p-6` (24px) |
| Shadow | `--shadow-elev-1` |
| Hover (interaktifse) | shadow `--shadow-elev-2`, border `--color-border-strong`, geçiş `--duration-base` `--ease-standard` |
| Başlık | `--text-h3`, `--color-text-high` |
| Meta | `--text-caption`, `--color-text-low` |

### 7.3 GlassPanel

Bkz. §5. Token özeti:
- bg `rgba(17,22,43,0.55)` + `backdrop-filter`
- border `rgba(255,255,255,0.08)` + inner highlight
- radius `--radius-xl`
- padding `p-6` (24px)
- shadow `--shadow-elev-2` (default) / `--shadow-elev-3` (elevated)
- Aurora varyant: 1px gradient border `--gradient-aurora`

### 7.4 AuroraBackground

| Özellik | Token |
|---|---|
| Konum | `position: fixed`, `inset: 0`, `z-index: -1`, `pointer-events: none` |
| Blob renkleri | `--color-aurora-amber`, `--color-aurora-mauve`, `--color-aurora-teal` |
| Blob opaklığı | 0.35 (her biri) |
| Blob blur | `blur(80px)` |
| Loop | bkz. §6.3 (`--duration-ambient`) |
| Reduced motion | statik (animasyon `paused`) |
| Base layer | `--color-space-950` düz dolgu (blob altı) |
| Vignette | radial overlay `--color-space-950` @ 60% kenarlara (odak korunsun) |

### 7.5 StatTile (KPI tile)

| Özellik | Token |
|---|---|
| Container | Card primitifi üstüne `min-height: 96px`, padding `p-5` (20px) |
| Label | `--text-micro`, UPPERCASE, `--color-text-low`, `letter-spacing: 0.04em` |
| Value | `--text-numeric-xl`, `--font-mono`, `tabular-nums slashed-zero`, `--color-text-high` |
| Delta (opsiyonel) | `--text-caption`, renk PnL bağlamında `--color-success`/`--color-danger`, yanında ↑/↓ ikon |
| Icon (opsiyonel sol-üst) | 16px lucide, `--color-text-low` |
| Skeleton | `--color-space-600` bg, shimmer `--duration-slower` |

### 7.6 HealthFactorBadge

| Özellik | Token |
|---|---|
| Layout | inline-flex, gap `gap-2` (8px), padding y `py-1` (4px) x `px-3` (12px), radius `--radius-pill` |
| Healthy | bg `--color-success-soft`, text `--color-hf-healthy`, icon `shield-check` |
| Caution | bg `--color-warn-soft`, text `--color-hf-caution`, icon `alert-triangle` |
| Danger | bg `--color-danger-soft`, text `--color-hf-danger`, icon `alert-octagon`, hafif pulse (`--duration-slow`) |
| Liquidatable | bg `--color-danger-soft`, text `--color-hf-liquidatable`, icon `skull`, sürekli pulse |
| Value font | `--text-numeric-md`, mono, tabular-nums |
| **Renk + ikon + metin = üçü birlikte** | a11y için zorunlu (renk körlüğü güvenliği §8) |
| ARIA | `role="status"` + `aria-label="Health Factor 1.34, Caution"` |

### 7.7 RiskGauge

Yarım daire (180°) gauge + iğne + likidasyon eşik çizgisi.

| Özellik | Token |
|---|---|
| Track bg | `--color-space-600` |
| Stops | 0 → 1.0 `--color-hf-liquidatable`, 1.0 → 1.2 `--color-hf-danger`, 1.2 → 1.5 `--color-hf-caution`, 1.5+ `--color-hf-healthy` (gradient stops) |
| İğne | 2px `--color-text-high`, taban dairesi 6px `--color-aurora-teal` |
| Eşik çizgisi (HF=1) | 1px dashed `--color-hf-liquidatable` |
| Değer label | merkezde `--text-numeric-lg`, mono, tabular-nums |
| Glow (Danger durumunda) | `--shadow-glow-danger` |
| Animation | iğne `--duration-base` `--ease-emphasis`, değer count-up |
| ARIA | `role="meter"`, `aria-valuemin/max/now`, alternatif metin "Health Factor 1.34 (Caution)" |

### 7.8 (bonus) WalletButton

PROMPT 16 için iskelet — token bağımlılığı burada sabitleniyor.

| Durum | Görsel |
|---|---|
| Disconnected | Ghost button "Connect wallet" |
| Connecting | Ghost button + shimmer overlay, disabled |
| Connected | Pill: `--color-space-600` bg, mono adres (4...4), ağ rozeti (sağ), avatar (sol) |
| Wrong network | Pill bg `--color-danger-soft`, text `--color-hf-danger`, "Switch to Testnet" CTA |
| Address font | `--font-mono`, `--text-caption` |

### 7.9 (bonus) DisclaimerStrip

Tüm sayfalarda kalıcı görünür — dürüstlük şeridi.

| Özellik | Token |
|---|---|
| Konum | Header altı (sticky) veya footer üstü, hangisi daha az müdahil |
| Background | `--color-space-800` + 1px `--color-border-subtle` |
| Text | "**Unaudited** · **Testnet only** · Not financial advice", `--text-caption`, `--color-text-low` |
| Uppercase keyword'ler | `--text-micro`, `--color-text-medium`, letter-spacing 0.06em |
| Açıklayıcı tooltip | Hover'da uzun açıklama |

---

## 8. Erişilebilirlik (a11y)

### 8.1 Kontrast hedefleri (WCAG AA)

- **Normal metin (< 18px / 14px bold)**: en az **4.5:1** vs arka plan.
- **Büyük metin (≥ 18px / 14px bold)**: en az **3:1**.
- **UI bileşeni & grafik nesneler** (icon, border, gauge): en az **3:1** vs komşu arka plan.
- §1.5 metin tablosundaki tüm `--text-*` token'ları AA'yı `--color-space-900` üstünde geçer; `--color-text-disabled` yalnız **non-interaktif** disabled metin için (etkileşimli disabled state'lerde focus ring + label + opacity birlikte).

HF semantik renkler:
- `--color-hf-healthy` (#22C55E) vs `--color-success-soft` (#16331E): ≈ 6.4:1 ✅
- `--color-hf-caution` (#F59E0B) vs `--color-warn-soft` (#3D2A05): ≈ 7.8:1 ✅
- `--color-hf-danger` (#EF4444) vs `--color-danger-soft` (#3F1212): ≈ 5.6:1 ✅

### 8.2 Renk-körü güvenliği (HF için kritik)

Renk körlüğü tipleri (protanopia, deuteranopia, tritanopia) gözetilir. **Renk asla tek anlam taşıyıcı değil.** Tüm HF göstergelerinde **üçlü** zorunlu:

1. **Renk** (semantik token)
2. **İkon** (lucide; healthy = `shield-check`, caution = `alert-triangle`, danger = `alert-octagon`, liquidatable = `skull`)
3. **Metin etiketi** (TR: "Sağlıklı" / "Dikkat" / "Riskli" / "Likidasyon"; EN için i18n)

Ek olarak:
- RiskGauge'da bantlar arasında **ince ayraç çizgisi** + ARIA `meter`.
- PnL renklendirmesi sadece + / – işareti veya ↑ / ↓ ikonuyla beraber.

### 8.3 Klavye & focus

- Tüm interaktif öğeler `Tab` ile ulaşılır.
- `focus-visible` 3px `--color-aurora-teal` ring + 2px offset (arka planla kontrastı yüksek).
- Modal/drawer'da focus trap; `Esc` ile kapanış.
- Skip-link (`Skip to main content`) layout'ta ilk fokuslanan eleman.
- Slider (Open Position leverage) ok tuşları (±0.1x), Shift+ok (±0.5x), Home/End (min/max).

### 8.4 Hareket & motion

- `prefers-reduced-motion: reduce` → AuroraBackground statik, tüm enter/exit ≤ 80ms, count-up animasyonları anlık.
- Pulse/blink animasyonu (Danger HF) reduced-motion'da statik glow'a düşer.

### 8.5 Ekran okuyucu

- Streaming AI Copilot çıktısı → `aria-live="polite"` (gürültü yapmaz).
- Tx durumu (pending/success/fail) → `aria-live="assertive"` (kritik bildirim).
- Tx hash gibi uzun string'ler → görsel kısaltma ama SR için tam değer `aria-label`.
- "Unaudited / testnet" şeridi SR tarafından her sayfa girişinde okunur (`role="note"`).

---

## 9. Kullanım disiplini (özet)

- **Tek doğruluk kaynağı**: bu dosya. Yeni token üretmeden önce burası güncellenir, sonra `globals.css` / `tokens.ts` (PROMPT 3) ve `packages/ui` (PROMPT 6).
- **HF eşik sayıları (1.5 / 1.2 / 1.0)**: Rust `shared` crate + TS SDK ile bire bir aynı sabit. Drift testi PROMPT 18 sorumluluğunda.
- **Aurora vs semantik karışmaz**: Aurora = marka, semantik = durum.
- **Finansal sayı = mono + tabular-nums + sağa hizalı** (istisnasız).
- **HF görseli = renk + ikon + metin** (istisnasız).
- **Tasarım dürüstlüğü**: "Unaudited · Testnet · Not financial advice" şeridi tüm sayfalarda görünür; gizlenmez.
