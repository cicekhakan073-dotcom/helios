/**
 * `AppError` — Helios uçtan-uca hata modeli.
 *
 * `normalizeError(unknown)` herhangi bir ham hatayı bu tipe çevirir.
 * UI yalnız `AppError` tüketir — kit hatası / fetch hatası / contract hata kodu
 * tek bir sözlüğe normalize edilir.
 */

export type AppErrorCategory =
  | "Contract" // Soroban contracterror (HeliosError 1-89)
  | "Rpc" // RPC ulaşılamadı / host error
  | "Wallet" // user reject / not installed / wrong network
  | "Auth" // SEP-10 challenge/verify/me 401
  | "Oracle" // Reflector freshness/sanity (UI-side guard, on-chain hataları "Contract" kategorisinde)
  | "Network" // navigator.onLine, fetch network
  | "Unknown";

export type AppErrorSeverity = "danger" | "warn" | "info";

export interface AppError {
  category: AppErrorCategory;
  /** Bilinen `HeliosErrorName` (Contract kategorisi) ya da kategori-bazlı kod (`walletUserRejected` vb). */
  code: string;
  /** UI'ya hazır TR mesaj. */
  title: string;
  description: string;
  /** Önerilen aksiyon (varsa). */
  action?: string;
  severity: AppErrorSeverity;
  /** Geliştirici / log için ham hata özeti (gizli kalır). */
  technical?: string;
  /** Orijinal `unknown` — Sentry-vari log noktası için. */
  cause?: unknown;
}

/** Internal builder — title/description i18n sözlüğünden gelir. */
export function buildAppError(
  args: Omit<AppError, "title" | "description"> & Pick<AppError, "title" | "description">,
): AppError {
  return { ...args };
}
