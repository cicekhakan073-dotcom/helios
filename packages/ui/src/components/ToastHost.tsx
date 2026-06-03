"use client";

import { useToasts, type Toast } from "@helios/sdk";
import { AlertOctagon, AlertTriangle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

import { cn } from "../utils";

const SEVERITY_STYLE = {
  danger: "border-danger/40 bg-danger-soft/95 text-hf-danger",
  warn: "border-warn/40 bg-warn-soft/95 text-hf-caution",
  info: "border-border-default bg-space-700/95 text-text-medium",
} as const;

const SEVERITY_ICON = {
  danger: AlertOctagon,
  warn: AlertTriangle,
  info: Info,
} as const;

/**
 * Sayfa kökünde tek bir kez render edilir; `pushAppError(...)` ile gelen
 * toast'lar burada listelenir. Severity=danger → manuel kapatma; aksi durumda
 * `durationMs` sonunda otomatik kaybolur (default 6sn).
 */
export function ToastHost() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div
      role="region"
      aria-label="Bildirimler"
      className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  const { error, durationMs } = toast;
  const Icon = SEVERITY_ICON[error.severity];

  useEffect(() => {
    if (durationMs <= 0) return;
    const id = window.setTimeout(() => dismiss(toast.id), durationMs);
    return () => window.clearTimeout(id);
  }, [toast.id, durationMs, dismiss]);

  return (
    <motion.div
      role={error.severity === "danger" ? "alert" : "status"}
      aria-live={error.severity === "danger" ? "assertive" : "polite"}
      data-error-code={error.code}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-elev-2 backdrop-blur-md",
        SEVERITY_STYLE[error.severity],
      )}
    >
      <Icon className="size-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <p className="text-body font-semibold m-0 truncate">{error.title}</p>
        <p className="text-caption text-text-medium m-0">{error.description}</p>
        {error.action && <p className="text-caption text-text-low m-0 mt-1">→ {error.action}</p>}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Kapat"
        className="text-text-low hover:text-text-high focus-visible:outline-3 focus-visible:outline-aurora-teal focus-visible:outline-offset-2 rounded-sm"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
}
