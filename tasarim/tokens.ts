/**
 * Helios — design tokens (TS mirror of globals.css)
 *
 * Recharts / visx / Framer Motion / Monte Carlo worker gibi
 * CSS değişkeni okuyamayan kod yolları için JS değerleri.
 *
 * ⚠️ ÜÇLÜ AYNALAMA DİSİPLİNİ:
 *   1) ../design-system.md  — kaynak gerçek
 *   2) ./globals.css         — CSS custom property + Tailwind v4 @theme
 *   3) ./tokens.ts (BU FILE) — TS sabitleri
 * HF eşik sabitleri ayrıca Rust shared crate (PROMPT 13) ile aynalanır.
 * Drift testi PROMPT 18'de yazılır (TS↔Rust eşik paritesi).
 */

/* =================================================================
   HEALTH FACTOR — TEK KAYNAK (mirror'lı)
   ================================================================= */

export const HF_HEALTHY_MIN = 1.5 as const;
export const HF_CAUTION_MIN = 1.2 as const;
export const HF_LIQUIDATION = 1.0 as const;

export type HfBand = "healthy" | "caution" | "danger" | "liquidatable";

/** HF değerinden risk bandı türet (Rust shared::hf::risk_band ile birebir aynı sınırlar). */
export function riskBand(hf: number): HfBand {
  if (!Number.isFinite(hf) || hf < HF_LIQUIDATION) return "liquidatable";
  if (hf < HF_CAUTION_MIN) return "danger";
  if (hf < HF_HEALTHY_MIN) return "caution";
  return "healthy";
}

/* =================================================================
   RENK PALETİ — HEX (HSL globals.css'te yaşar)
   ================================================================= */

export const colors = {
  space: {
    950: "#03040A",
    900: "#05060D",
    800: "#0B0E1C",
    700: "#11162B",
    600: "#1A2040",
    500: "#252C55",
  },
  aurora: {
    amber: "#FBBF24",
    amberGlow: "#FCD34D",
    mauve: "#B583FF",
    mauveDeep: "#7C3AED",
    teal: "#5EEAD4",
    tealDeep: "#14B8A6",
  },
  semantic: {
    success: "#22C55E",
    successSoft: "#16331E",
    warn: "#F59E0B",
    warnSoft: "#3D2A05",
    danger: "#EF4444",
    dangerSoft: "#3F1212",
    info: "#60A5FA",
    infoSoft: "#0F2547",
  },
  hf: {
    healthy: "#22C55E",
    caution: "#F59E0B",
    danger: "#EF4444",
    liquidatable: "#B91C1C",
  },
  text: {
    high: "#F8FAFC",
    medium: "#CBD5E1",
    low: "#94A3B8",
    disabled: "#64748B",
    onAurora: "#0B0E1C",
    link: "#60A5FA",
    linkHover: "#5EEAD4",
  },
  border: {
    subtle: "rgba(255,255,255,0.06)",
    default: "rgba(255,255,255,0.10)",
    strong: "rgba(255,255,255,0.20)",
  },
  overlay: {
    modal: "rgba(3,4,10,0.72)",
    hover: "rgba(255,255,255,0.04)",
  },
} as const;

/** HF durum → görsel paket (renk + soft bg + ikon adı + i18n anahtar). */
export const hfBandStyle: Record<
  HfBand,
  { color: string; soft: string; icon: string; labelKey: string }
> = {
  healthy: {
    color: colors.hf.healthy,
    soft: colors.semantic.successSoft,
    icon: "shield-check",
    labelKey: "risk.healthy",
  },
  caution: {
    color: colors.hf.caution,
    soft: colors.semantic.warnSoft,
    icon: "alert-triangle",
    labelKey: "risk.caution",
  },
  danger: {
    color: colors.hf.danger,
    soft: colors.semantic.dangerSoft,
    icon: "alert-octagon",
    labelKey: "risk.danger",
  },
  liquidatable: {
    color: colors.hf.liquidatable,
    soft: colors.semantic.dangerSoft,
    icon: "skull",
    labelKey: "risk.liquidation",
  },
};

/* =================================================================
   GRAFİK PALETİ — Recharts / visx serisi
   ================================================================= */

export const chartPalette = {
  /** Kategorik çoklu seri (maks. 6 — line/area). */
  series: [
    colors.aurora.amber,
    colors.aurora.mauve,
    colors.aurora.teal,
    colors.semantic.info,
    colors.aurora.mauveDeep,
    colors.aurora.tealDeep,
  ],

  /** RiskGauge gradient stop'ları (HF 0..2 ölçeği üstünde). */
  riskGaugeStops: [
    { offset: 0.00, color: colors.hf.liquidatable },
    { offset: 0.50, color: colors.hf.danger },
    { offset: 0.60, color: colors.hf.caution },
    { offset: 0.75, color: colors.hf.healthy },
    { offset: 1.00, color: colors.hf.healthy },
  ],

  /** Monte Carlo P10/P50/P90 fan band'ı (PROMPT 27). */
  fanBand: {
    p10: "rgba(94, 234, 212, 0.18)",
    p50: colors.aurora.teal,
    p90: "rgba(94, 234, 212, 0.18)",
  },

  /** Likidasyon eşik çizgisi (HF=1, dashed). */
  liquidationLine: colors.hf.liquidatable,

  /** Grafik grid + axis. */
  grid: "rgba(255,255,255,0.06)",
  axis: colors.text.low,

  /** PnL renklendirmesi (+ / − bağlamı). */
  pnlPositive: colors.semantic.success,
  pnlNegative: colors.semantic.danger,
} as const;

/* =================================================================
   MOTION — Framer Motion karşılığı (saniye + cubic-bezier array)
   ================================================================= */

export const motion = {
  /** Süre — saniye cinsinden (Framer Motion `duration` alanı). */
  duration: {
    instant: 0.08,
    fast: 0.12,
    base: 0.20,
    slow: 0.36,
    slower: 0.60,
    ambient: 18,
  },

  /** Easing — Framer Motion `ease` array (4-element cubic-bezier). */
  ease: {
    standard:   [0.4, 0, 0.2, 1] as [number, number, number, number],
    enter:      [0, 0, 0.2, 1] as [number, number, number, number],
    exit:       [0.4, 0, 1, 1] as [number, number, number, number],
    emphasis:   [0.2, 0, 0, 1] as [number, number, number, number],
    springSoft: [0.34, 1.36, 0.64, 1] as [number, number, number, number],
  },

  /** Kart in-view stagger gecikmesi (saniye). */
  stagger: {
    cardEnter: 0.06,
  },
} as const;

/* =================================================================
   ORACLE freshness eşikleri (AUDIT 2026-05-31 §1.6)
   Blend 2025 oracle exploit yansıması: staleness + sanity bounds.
   ================================================================= */

/** Oracle güncellemesi N ms üstü → UI "stale" rozet. */
export const ORACLE_STALENESS_WARN_MS = 5 * 60 * 1000;

/** Oracle güncellemesi N ms üstü → UI işlem disabled (guard). */
export const ORACLE_STALENESS_BLOCK_MS = 10 * 60 * 1000;

/** Sanity bound: |lastprice − TWAP(N)| / TWAP > eşik → revert. */
export const ORACLE_PRICE_DEVIATION_LIMIT = 0.30;

/* =================================================================
   SPACING & RADIUS — eşlenen Tailwind v4 değerleri (referans)
   Tailwind p-N / m-N otomatik `--spacing` skaları üzerinden çalışır;
   bu sabitler yalnız programatik (örn. svg path padding) için.
   ================================================================= */

/** spacing-N → N * 4px (Tailwind base scalar `--spacing: 0.25rem`). */
export const SPACING_BASE_PX = 4 as const;

export const radius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  pill: 9999,
} as const;

/* =================================================================
   Type re-exports
   ================================================================= */

export type Colors = typeof colors;
export type ChartPalette = typeof chartPalette;
export type Motion = typeof motion;
