import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn(...)` — Tailwind sınıflarını birleştirir, çakışanları akıllıca elimine eder.
 * shadcn/ui'nin standart helper'ı; cva varyantlarıyla kompoze edilir.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
