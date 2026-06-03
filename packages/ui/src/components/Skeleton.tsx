"use client";

/**
 * Cosmic-tema Skeleton — layout shift olmasın diye gerçek içerikle aynı boyut.
 *
 * Varyantlar: line / chip / card / table-row / chart. `prefers-reduced-motion`
 * pulse animasyonunu otomatik sönümler (CSS `motion-reduce:animate-none`).
 */

import { cn } from "../utils";

type Variant = "line" | "chip" | "card" | "table-row" | "chart" | "circle";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  /** line/chip için genişlik (tailwind class veya CSS değeri). */
  width?: string;
  /** card/chart için yükseklik. */
  height?: string;
}

const baseClass =
  "rounded bg-gradient-to-r from-space-700 via-space-600 to-space-700 bg-[length:200%_100%] animate-pulse motion-reduce:animate-none";

export function Skeleton({ variant = "line", width, height, className, style, ...rest }: Props) {
  const variantClass = (() => {
    switch (variant) {
      case "line":
        return "h-3";
      case "chip":
        return "h-6 rounded-full";
      case "card":
        return "rounded-lg";
      case "table-row":
        return "h-9 rounded-md";
      case "chart":
        return "rounded-md";
      case "circle":
        return "rounded-full";
    }
  })();

  const inlineStyle: React.CSSProperties = {
    ...(style ?? {}),
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };

  return (
    <div
      aria-hidden
      className={cn(baseClass, variantClass, className)}
      style={inlineStyle}
      {...rest}
    />
  );
}

/** Dashboard / Leaderboard tablo skeleton — N satır + başlık. */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} variant="chip" width="60%" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={`r-${r}`}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={`r-${r}-c-${c}`} variant="table-row" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** KPI grid skeleton — sabit gridler için. */
export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-md bg-space-700 border border-border-default p-3 flex flex-col gap-2"
        >
          <Skeleton variant="chip" width="40%" />
          <Skeleton variant="line" width="70%" height="20px" />
        </div>
      ))}
    </div>
  );
}
