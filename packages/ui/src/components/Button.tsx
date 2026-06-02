import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "../utils";

const buttonStyles = cva(
  // base
  [
    "inline-flex items-center justify-center gap-2",
    "rounded-md font-semibold leading-none",
    "transition-[background,box-shadow,transform] duration-[120ms] ease-[var(--ease-standard)]",
    "active:scale-[0.97]",
    "disabled:opacity-40 disabled:pointer-events-none",
    "focus-visible:outline-3 focus-visible:outline-aurora-teal focus-visible:outline-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-aurora-amber text-text-on-aurora",
          "hover:bg-aurora-amber-glow hover:shadow-glow-amber",
        ].join(" "),
        ghost: [
          "bg-transparent text-text-high border border-border-default",
          "hover:bg-white/[0.04] hover:border-border-strong",
        ].join(" "),
        danger: [
          "bg-danger text-text-high",
          "hover:shadow-glow-danger",
        ].join(" "),
      },
      size: {
        sm: "h-8 px-3 text-caption",
        md: "h-10 px-5 text-body",
        lg: "h-12 px-6 text-body-lg",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, fullWidth, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(buttonStyles({ variant, size, fullWidth }), className)}
      {...rest}
    />
  );
});
