
import { chartPalette, riskBand } from "../tokens";
import { cn } from "../utils";

import type { SVGAttributes } from "react";

/**
 * RiskGauge — yarım daire (180°) gauge + iğne + likidasyon eşik çizgisi.
 * design-system §7.7 iskeleti. Recharts kullanılmadı; saf SVG.
 *
 * HF ölçeği 0..2 ölçeklenir (üst kısım clamp).
 */

const HF_MAX = 2;
const SIZE = 200;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;

function arcPath(hfStart: number, hfEnd: number): string {
  const t1 = clamp01(hfStart / HF_MAX);
  const t2 = clamp01(hfEnd / HF_MAX);
  const a1 = Math.PI + t1 * Math.PI;
  const a2 = Math.PI + t2 * Math.PI;
  const x1 = CENTER + RADIUS * Math.cos(a1);
  const y1 = CENTER + RADIUS * Math.sin(a1);
  const x2 = CENTER + RADIUS * Math.cos(a2);
  const y2 = CENTER + RADIUS * Math.sin(a2);
  const largeArc = a2 - a1 > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2}`;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(0, Math.min(1, n));
}

export type RiskGaugeProps = SVGAttributes<SVGSVGElement> & {
  hf: number;
};

export function RiskGauge({ hf, className, ...rest }: RiskGaugeProps) {
  const band = riskBand(hf);
  const valueText = Number.isFinite(hf) ? hf.toFixed(2) : "∞";

  const needleAngle = Math.PI + clamp01(hf / HF_MAX) * Math.PI;
  const needleLength = RADIUS - STROKE / 2 - 4;
  const needleX = CENTER + needleLength * Math.cos(needleAngle);
  const needleY = CENTER + needleLength * Math.sin(needleAngle);

  // Likidasyon eşik (HF=1) çizgisi konumu
  const liqAngle = Math.PI + (1 / HF_MAX) * Math.PI;
  const liqInnerR = RADIUS - STROKE / 2 - 8;
  const liqOuterR = RADIUS + STROKE / 2 + 4;
  const liqX1 = CENTER + liqInnerR * Math.cos(liqAngle);
  const liqY1 = CENTER + liqInnerR * Math.sin(liqAngle);
  const liqX2 = CENTER + liqOuterR * Math.cos(liqAngle);
  const liqY2 = CENTER + liqOuterR * Math.sin(liqAngle);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE / 2 + 30}`}
      width={SIZE}
      height={SIZE / 2 + 30}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={HF_MAX}
      aria-valuenow={Number.isFinite(hf) ? Math.min(hf, HF_MAX) : HF_MAX}
      aria-label={`Health Factor ${valueText}, risk band ${band}`}
      className={cn("block", className)}
      data-band={band}
      {...rest}
    >
      {/* Track (background) */}
      <path
        d={arcPath(0, HF_MAX)}
        fill="none"
        stroke="var(--color-space-600)"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />

      {/* Colored bands (segment by segment) */}
      <path
        d={arcPath(0, 1.0)}
        fill="none"
        stroke="var(--color-hf-liquidatable)"
        strokeWidth={STROKE}
      />
      <path
        d={arcPath(1.0, 1.2)}
        fill="none"
        stroke="var(--color-hf-danger)"
        strokeWidth={STROKE}
      />
      <path
        d={arcPath(1.2, 1.5)}
        fill="none"
        stroke="var(--color-hf-caution)"
        strokeWidth={STROKE}
      />
      <path
        d={arcPath(1.5, HF_MAX)}
        fill="none"
        stroke="var(--color-hf-healthy)"
        strokeWidth={STROKE}
      />

      {/* Liquidation threshold dashed line */}
      <line
        x1={liqX1}
        y1={liqY1}
        x2={liqX2}
        y2={liqY2}
        stroke={chartPalette.liquidationLine}
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      {/* Needle */}
      <line
        x1={CENTER}
        y1={CENTER}
        x2={needleX}
        y2={needleY}
        stroke="var(--color-text-high)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={CENTER} cy={CENTER} r={5} fill="var(--color-aurora-teal)" />

      {/* Value label */}
      <text
        x={CENTER}
        y={SIZE / 2 + 22}
        textAnchor="middle"
        className="tabular"
        fontFamily="var(--font-mono)"
        fontSize="20"
        fontWeight="600"
        fill="var(--color-text-high)"
      >
        {valueText}
      </text>
    </svg>
  );
}
