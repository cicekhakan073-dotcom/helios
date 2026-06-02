import { AlertOctagon, AlertTriangle, Info } from "lucide-react";

import { cn } from "../utils";

import type { AppError } from "@helios/sdk";
import type { ReactNode } from "react";


interface Props {
  error: AppError;
  /** Banner içinde aksiyon butonu render edicisi (opsiyonel). */
  renderAction?: (action: string) => ReactNode;
  className?: string;
}

const SEVERITY_STYLE = {
  danger: "border-danger/40 bg-danger-soft text-hf-danger",
  warn: "border-warn/40 bg-warn-soft text-hf-caution",
  info: "border-border-default bg-space-700 text-text-medium",
} as const;

const SEVERITY_ICON = {
  danger: AlertOctagon,
  warn: AlertTriangle,
  info: Info,
} as const;

/**
 * Inline hata banner'ı — form satırının üstüne / sayfa başına konur.
 * Toast'tan ayrı: ısrarcı (kullanıcı kapatana kadar), aksiyon CTA içerir.
 */
export function ErrorBanner({ error, renderAction, className }: Props) {
  const Icon = SEVERITY_ICON[error.severity];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        SEVERITY_STYLE[error.severity],
        className,
      )}
      data-error-code={error.code}
      data-error-category={error.category}
    >
      <Icon className="size-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 flex flex-col gap-1">
        <p className="text-h4 m-0">{error.title}</p>
        <p className="text-body text-text-medium m-0">{error.description}</p>
        {error.action && (
          <div className="mt-2">
            {renderAction ? (
              renderAction(error.action)
            ) : (
              <span className="text-caption text-text-low">→ {error.action}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
