import { AlertOctagon, AlertTriangle, ShieldCheck, Skull, type LucideIcon } from "lucide-react";


import { riskBand, type HfBand } from "../tokens";
import { cn } from "../utils";

import type { HTMLAttributes } from "react";

/**
 * design-system §1.4 + §7.6: HF rozeti.
 * **Renk + ikon + metin üçlüsü ZORUNLU** (§8.2 renk körlüğü güvenliği).
 */

const bandIcon: Record<HfBand, LucideIcon> = {
  healthy: ShieldCheck,
  caution: AlertTriangle,
  danger: AlertOctagon,
  liquidatable: Skull,
};

/** Varsayılan TR etiketler. i18n: future iş. */
const bandLabelTR: Record<HfBand, string> = {
  healthy: "Sağlıklı",
  caution: "Dikkat",
  danger: "Riskli",
  liquidatable: "Likidasyon",
};

const bandStyles: Record<HfBand, string> = {
  healthy: "bg-success-soft text-hf-healthy",
  caution: "bg-warn-soft text-hf-caution",
  danger: "bg-danger-soft text-hf-danger animate-pulse-danger",
  liquidatable: "bg-danger-soft text-hf-liquidatable animate-pulse-danger",
};

export type HealthFactorBadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  /** Sayısal HF değeri. < 1.0 → liquidatable; otomatik bant türetilir. */
  hf: number;
  /** Custom etiketler — opsiyonel; verilmezse TR default'lar. */
  labels?: Partial<Record<HfBand, string>>;
  /** Sadece rozet metnini değil sadece ikonu göster (sıkışık tablolarda). */
  iconOnly?: boolean;
};

export function HealthFactorBadge({
  hf,
  labels,
  iconOnly = false,
  className,
  ...rest
}: HealthFactorBadgeProps) {
  const band = riskBand(hf);
  const Icon = bandIcon[band];
  const label = labels?.[band] ?? bandLabelTR[band];
  const valueText = Number.isFinite(hf) ? hf.toFixed(2) : "∞";

  return (
    <span
      role="status"
      aria-label={`Health Factor ${valueText}, ${label}`}
      className={cn(
        "inline-flex items-center gap-2 py-1 px-3 rounded-pill",
        "text-numeric-md tabular",
        bandStyles[band],
        className,
      )}
      data-band={band}
      data-num
      {...rest}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span aria-hidden="true">{valueText}</span>
      {!iconOnly && (
        <span aria-hidden="true" className="text-caption font-semibold uppercase tracking-wider">
          {label}
        </span>
      )}
    </span>
  );
}
