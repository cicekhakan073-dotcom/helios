import { cn } from "../utils";

import type { HTMLAttributes } from "react";


export type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
};

export function Card({ className, interactive = false, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-space-700 border border-border-default p-6 shadow-elev-1",
        interactive &&
          "transition-[border-color,box-shadow] duration-[200ms] ease-[var(--ease-standard)] hover:border-border-strong hover:shadow-elev-2",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <header className={cn("mb-4 flex items-center justify-between gap-3", className)} {...rest} />;
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-h3 text-text-high m-0", className)} {...rest}>
      {children}
    </h3>
  );
}

export function CardMeta({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-caption text-text-low m-0", className)} {...rest} />;
}
