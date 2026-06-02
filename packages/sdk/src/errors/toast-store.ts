/**
 * Global toast hub — `pushAppError(err)` her yerden çağırılabilir; UI
 * `useToasts()` ile listeleyip render eder.
 */

import { create } from "zustand";

import { normalizeError } from "./normalize";

import type { AppError } from "./app-error";

export interface Toast {
  id: string;
  error: AppError;
  /** ms cinsinden auto-dismiss; 0 = manuel kapatma. */
  durationMs: number;
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Toast) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: (toast) => set((s) => ({ toasts: [...s.toasts, toast] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

function newId(): string {
  return `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** Normalize + push helper (UI / hook'larda kullanılır). */
export function pushAppError(input: unknown, opts?: { durationMs?: number }): AppError {
  const error = normalizeError(input);
  const durationMs = opts?.durationMs ?? (error.severity === "danger" ? 0 : 6000);
  useToasts.getState().push({ id: newId(), error, durationMs });
  // Sentry-vari log noktası (geliştirici konsoluna)
  if (typeof console !== "undefined") {
    const logger = error.severity === "danger" ? console.error : console.warn;
    logger.call(console, `[helios:${error.category}:${error.code}]`, error.technical ?? error.description, error.cause);
  }
  return error;
}
