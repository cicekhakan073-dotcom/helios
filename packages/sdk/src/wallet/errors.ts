/**
 * Wallet katmanı için tip-güvenli hata sınıfları.
 *
 * PROMPT 19'da global hata normalize katmanı bu sınıfları kategori bazlı
 * eşleyerek kullanıcıya TR mesaj üretecek.
 */

export type WalletErrorCode =
  | "USER_REJECTED"
  | "NOT_INSTALLED"
  | "WRONG_NETWORK"
  | "CONNECTION_FAILED"
  | "DISCONNECTED"
  | "UNKNOWN";

export class WalletError extends Error {
  public readonly code: WalletErrorCode;
  public override readonly cause?: unknown;

  constructor(code: WalletErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "WalletError";
    this.code = code;
    this.cause = cause;
  }
}

/** Kit'in fırlattığı bilinmeyen hatayı `WalletError` tipine çevirir. */
export function toWalletError(err: unknown, fallback: WalletErrorCode = "UNKNOWN"): WalletError {
  if (err instanceof WalletError) return err;
  const message = err instanceof Error ? err.message : String(err);

  // Heuristik mapping — Wallets Kit / Freighter çoğu zaman string mesajı verir
  const lower = message.toLowerCase();
  if (lower.includes("reject") || lower.includes("denied") || lower.includes("cancel")) {
    return new WalletError("USER_REJECTED", "Kullanıcı bağlanmayı reddetti.", err);
  }
  if (lower.includes("not installed") || lower.includes("not found")) {
    return new WalletError("NOT_INSTALLED", "Seçilen cüzdan kurulu değil.", err);
  }
  if (lower.includes("network") && (lower.includes("wrong") || lower.includes("mismatch"))) {
    return new WalletError("WRONG_NETWORK", "Cüzdan yanlış ağa bağlı (testnet bekleniyor).", err);
  }
  return new WalletError(fallback, message, err);
}
