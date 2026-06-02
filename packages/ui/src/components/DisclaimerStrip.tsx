import { Info } from "lucide-react";

import { cn } from "../utils";

import type { HTMLAttributes } from "react";


/**
 * DisclaimerStrip — design-system §7.9.
 * "Unaudited · Testnet only · Not financial advice" şeridi.
 * Her sayfada görünür olmalı. Gizlenmez. SR için role="note".
 */
export function DisclaimerStrip({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="note"
      aria-label="Helios safety disclaimer"
      className={cn("disclaimer-strip flex items-center justify-center gap-3", className)}
      {...rest}
    >
      <Info className="size-3.5 shrink-0 text-text-low" aria-hidden="true" />
      <p className="m-0 text-caption text-text-low">
        <strong>Unaudited</strong> · <strong>Testnet only</strong> · Not financial advice
      </p>
    </div>
  );
}
