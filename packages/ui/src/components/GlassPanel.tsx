import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../utils";

import type { HTMLAttributes } from "react";


const glassStyles = cva("glass-panel", {
  variants: {
    variant: {
      default: "",
      elevated: "glass-panel--elevated",
      borderedAurora: "glass-panel--bordered-aurora",
      danger: "glass-panel--danger",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type GlassPanelProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof glassStyles>;

/**
 * GlassPanel — design-system §5'in compositional yansıması.
 * Sınıflar globals.css'te tanımlı; burada cva ile varyant seçimi.
 */
export function GlassPanel({ className, variant, ...rest }: GlassPanelProps) {
  return <div className={cn(glassStyles({ variant }), className)} {...rest} />;
}
