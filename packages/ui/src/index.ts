/**
 * @helios/ui — paylaşılan UI primitifleri + tokens.
 *
 * PROMPT 6'da kuruldu (design-system.md → globals.css → buradaki bileşenler).
 *
 * AUDIT 2026-05-31 disiplini:
 *  - HF eşikleri (1.5/1.2/1.0) tokens.ts'te tek kaynak; Rust shared crate
 *    ile drift testi PROMPT 18'de eklenir.
 *  - Oracle staleness + sapma sabitleri tokens.ts'te (UI guard'lar için).
 */

/* --- Brand sabitleri ------------------------------------------------ */
export const brand = {
  name: "Helios",
  tagline: "Leveraged yield on Stellar, in one signature.",
  disclaimer: "Unaudited · Testnet only · Not financial advice",
} as const;

export type Brand = typeof brand;

/* --- Tokens (HF, renkler, motion, chart, oracle) -------------------- */
export {
  HF_HEALTHY_MIN,
  HF_CAUTION_MIN,
  HF_LIQUIDATION,
  ORACLE_STALENESS_WARN_MS,
  ORACLE_STALENESS_BLOCK_MS,
  ORACLE_PRICE_DEVIATION_LIMIT,
  SPACING_BASE_PX,
  chartPalette,
  colors,
  hfBandStyle,
  motion,
  radius,
  riskBand,
  type ChartPalette,
  type Colors,
  type HfBand,
  type Motion,
} from "./tokens";

/* --- Helpers -------------------------------------------------------- */
export { cn } from "./utils";

/* --- Primitives ----------------------------------------------------- */
export { Button, type ButtonProps } from "./components/Button";
export { Card, CardHeader, CardMeta, CardTitle, type CardProps } from "./components/Card";
export { DisclaimerStrip } from "./components/DisclaimerStrip";
export { GlassPanel, type GlassPanelProps } from "./components/GlassPanel";
export { HealthFactorBadge, type HealthFactorBadgeProps } from "./components/HealthFactorBadge";
export { RiskGauge, type RiskGaugeProps } from "./components/RiskGauge";
export { StatTile, type StatTileDelta, type StatTileProps } from "./components/StatTile";
export { AuroraBackground } from "./components/AuroraBackground";
export { WalletButton } from "./components/WalletButton";
export { ErrorBanner } from "./components/ErrorBanner";
export { ToastHost } from "./components/ToastHost";
