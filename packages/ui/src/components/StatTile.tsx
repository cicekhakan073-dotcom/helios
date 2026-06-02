import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "../utils";

import type { HTMLAttributes, ReactNode } from "react";


export interface StatTileDelta {
  /** Yön: + (yukarı) veya − (aşağı). */
  direction: "up" | "down";
  /** Görsel için kısa metin (örn. "+12.4%"). */
  label: string;
}

export type StatTileProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  /** Asıl değer — children olarak format'lı string ya da ReactNode. */
  value: ReactNode;
  /** Sol-üst köşedeki opsiyonel ikon. */
  icon?: LucideIcon;
  /** Opsiyonel PnL/delta göstergesi (renk + ikon). */
  delta?: StatTileDelta;
  /** Skeleton durumu. */
  loading?: boolean;
};

/**
 * StatTile — KPI tile. design-system §7.5.
 * Sayısal değer mono + tabular-nums (.tabular sınıfı).
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  delta,
  loading = false,
  className,
  ...rest
}: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-space-700 border border-border-default p-5 shadow-elev-1",
        "flex flex-col gap-2 min-h-[96px]",
        className,
      )}
      {...rest}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-micro uppercase tracking-wider text-text-low">{label}</span>
        {Icon ? <Icon className="size-4 text-text-low" aria-hidden="true" /> : null}
      </div>

      {loading ? (
        <div
          className="h-9 w-24 rounded bg-space-600 animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.04),transparent)] bg-[length:200%_100%]"
          aria-label="Yükleniyor"
          role="status"
        />
      ) : (
        <span className="tabular text-numeric-xl text-text-high" data-num>
          {value}
        </span>
      )}

      {delta && !loading ? (
        <span
          className={cn(
            "tabular text-caption inline-flex items-center gap-1",
            delta.direction === "up" ? "text-success" : "text-danger",
          )}
        >
          {delta.direction === "up" ? (
            <TrendingUp className="size-3.5" aria-hidden="true" />
          ) : (
            <TrendingDown className="size-3.5" aria-hidden="true" />
          )}
          {delta.label}
        </span>
      ) : null}
    </div>
  );
}
