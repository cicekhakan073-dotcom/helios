/**
 * Ham hata → `AppError` normalize edici.
 *
 * Tanıdığı format'lar:
 *   - `WalletError` (PROMPT 16) — code → mesaj
 *   - HTTP fetch error (`fetch(...).then(asJson)` "HTTP 401: ...")
 *   - Soroban host error string ("Error(Contract, #21)" gibi)
 *   - `HfError` (SDK saf math)
 *   - Generic `Error` / unknown
 */

import { HfError } from "../hf";
import { WalletError } from "../wallet/errors";

import { HELIOS_ERROR_NAME_BY_CODE, isKnownHeliosErrorCode } from "./codes";
import {
  HELIOS_MESSAGES_TR,
  NON_CONTRACT_MESSAGES_TR,
  type NonContractMessageKey,
} from "./messages-tr";

import type { AppError } from "./app-error";

const CONTRACT_ERROR_REGEX = /Error\(Contract,\s*#(\d+)\)/i;
const HTTP_PREFIX_REGEX = /^HTTP\s+(\d+)(?::\s*(.*))?$/i;

function fromContractCode(code: number, cause: unknown, technical: string): AppError {
  if (isKnownHeliosErrorCode(code)) {
    const name = HELIOS_ERROR_NAME_BY_CODE[code]!;
    const msg = HELIOS_MESSAGES_TR[name];
    return {
      category: "Contract",
      code: name,
      title: msg.title,
      description: msg.description,
      ...(msg.action != null ? { action: msg.action } : {}),
      severity: msg.severity,
      technical: `${technical} → HeliosError::${name} (#${code})`,
      cause,
    };
  }
  // Bilinmeyen contract kodu → güvenli fallback
  const unknown = NON_CONTRACT_MESSAGES_TR.unknown;
  return {
    category: "Contract",
    code: `UnknownContractCode_${code}`,
    title: "Kontrat hatası",
    description: `Kontrattan bilinmeyen hata kodu döndü (#${code}). ${unknown.description}`,
    action: unknown.action,
    severity: "danger",
    technical,
    cause,
  };
}

function fromNonContract(key: NonContractMessageKey, technical: string, cause: unknown): AppError {
  // satisfies ile narrow olmuş union için yapısal cast (her variant title/desc/severity zorunlu, action opsiyonel).
  const msg = NON_CONTRACT_MESSAGES_TR[key] as {
    title: string;
    description: string;
    action?: string;
    severity: "danger" | "warn" | "info";
  };
  const category: AppError["category"] =
    key.startsWith("wallet") ? "Wallet" :
    key.startsWith("auth") ? "Auth" :
    key.startsWith("rpc") ? "Rpc" :
    key === "networkOffline" ? "Network" :
    "Unknown";
  return {
    category,
    code: key,
    title: msg.title,
    description: msg.description,
    ...(msg.action != null ? { action: msg.action } : {}),
    severity: msg.severity,
    technical,
    cause,
  };
}

export function normalizeError(input: unknown): AppError {
  // 1) WalletError
  if (input instanceof WalletError) {
    const map: Record<string, NonContractMessageKey> = {
      USER_REJECTED: "walletUserRejected",
      NOT_INSTALLED: "walletNotInstalled",
      WRONG_NETWORK: "walletWrongNetwork",
      CONNECTION_FAILED: "walletConnectionFailed",
      DISCONNECTED: "walletConnectionFailed",
      UNKNOWN: "walletConnectionFailed",
    };
    const key = map[input.code] ?? "walletConnectionFailed";
    return fromNonContract(key, input.message, input);
  }

  // 2) HfError (SDK saf math)
  if (input instanceof HfError) {
    if (input.code === "ZERO_DEBT") {
      return fromContractCode(80, input, input.message);
    }
    if (input.code === "OVERFLOW") {
      return fromContractCode(81, input, input.message);
    }
    return fromContractCode(3 /* InvalidParams */, input, input.message);
  }

  // 3) Soroban host error string'i ("Error(Contract, #21)")
  if (input instanceof Error) {
    const m = CONTRACT_ERROR_REGEX.exec(input.message);
    if (m?.[1]) {
      const code = Number(m[1]);
      return fromContractCode(code, input, input.message);
    }
    // 4) HTTP error ("HTTP 401: ...")
    const h = HTTP_PREFIX_REGEX.exec(input.message);
    if (h?.[1]) {
      const status = Number(h[1]);
      if (status === 401) return fromNonContract("authUnauthenticated", input.message, input);
      if (status >= 500) return fromNonContract("rpcHostError", input.message, input);
      // 4xx auth-dışı
      if (input.message.includes("verify")) return fromNonContract("authVerifyFailed", input.message, input);
      if (input.message.includes("challenge")) return fromNonContract("authChallengeFailed", input.message, input);
    }
    // 5) Network offline (TypeError "Failed to fetch")
    if (input.message.toLowerCase().includes("failed to fetch") || input.name === "TypeError") {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return fromNonContract("networkOffline", input.message, input);
      }
      return fromNonContract("rpcUnreachable", input.message, input);
    }
    // 6) Bilinmeyen Error
    return fromNonContract("unknown", `${input.name}: ${input.message}`, input);
  }

  // 7) Hiç Error değil — string / nesne
  const tech = typeof input === "string" ? input : JSON.stringify(input).slice(0, 200);
  return fromNonContract("unknown", tech, input);
}
