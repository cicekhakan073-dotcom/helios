/**
 * Errors normalize + drift testi.
 *
 * Drift: Rust HeliosError numara aralıkları (1-9, 10-19, 20-29, 30-39, 40-49,
 * 50-59, 60-69, 70-79, 80-89) ve atanmış numaralar TS aynasıyla birebir.
 */

import { describe, expect, it } from "vitest";

import { WalletError } from "../wallet/errors";

import {
  HELIOS_ERROR_CODES,
  HELIOS_ERROR_NAME_BY_CODE,
  HELIOS_MESSAGES_TR,
  normalizeError,
} from "./index";

describe("HeliosError code map — Rust ile birebir", () => {
  it("8 numara aralığı atanmış", () => {
    // 1-9 generic
    expect(HELIOS_ERROR_CODES.Unauthorized).toBe(1);
    expect(HELIOS_ERROR_CODES.AlreadyInitialized).toBe(5);
    // 10-19 position
    expect(HELIOS_ERROR_CODES.PositionNotFound).toBe(10);
    expect(HELIOS_ERROR_CODES.InsufficientLiquidity).toBe(13);
    // 20-29 strategy
    expect(HELIOS_ERROR_CODES.LeverageTooHigh).toBe(20);
    expect(HELIOS_ERROR_CODES.UnsafeHealthFactor).toBe(21);
    expect(HELIOS_ERROR_CODES.FlashRepayFailed).toBe(24);
    // 30-39 oracle
    expect(HELIOS_ERROR_CODES.OracleStale).toBe(30);
    expect(HELIOS_ERROR_CODES.PriceSanityBoundExceeded).toBe(32);
    // 40-49 blend
    expect(HELIOS_ERROR_CODES.BlendCallFailed).toBe(40);
    expect(HELIOS_ERROR_CODES.BlendPositionRead).toBe(42);
    // 50-59 keeper
    expect(HELIOS_ERROR_CODES.NotOptedIn).toBe(50);
    expect(HELIOS_ERROR_CODES.KeeperRoleRequired).toBe(53);
    // 60-69 token
    expect(HELIOS_ERROR_CODES.UnsupportedAsset).toBe(60);
    // 70-79 storage
    expect(HELIOS_ERROR_CODES.TtlExtendFailed).toBe(70);
    // 80-89 HF
    expect(HELIOS_ERROR_CODES.ZeroDebt).toBe(80);
    expect(HELIOS_ERROR_CODES.HfOverflow).toBe(81);
  });

  it("Her bilinen kod için TR mesaj var", () => {
    for (const name of Object.keys(HELIOS_ERROR_CODES) as (keyof typeof HELIOS_ERROR_CODES)[]) {
      const msg = HELIOS_MESSAGES_TR[name];
      expect(msg).toBeDefined();
      expect(msg.title.length).toBeGreaterThan(0);
      expect(msg.description.length).toBeGreaterThan(0);
      expect(["danger", "warn", "info"]).toContain(msg.severity);
    }
  });

  it("Reverse lookup numara → isim çalışıyor", () => {
    expect(HELIOS_ERROR_NAME_BY_CODE[21]).toBe("UnsafeHealthFactor");
    expect(HELIOS_ERROR_NAME_BY_CODE[30]).toBe("OracleStale");
    expect(HELIOS_ERROR_NAME_BY_CODE[50]).toBe("NotOptedIn");
    expect(HELIOS_ERROR_NAME_BY_CODE[80]).toBe("ZeroDebt");
  });
});

describe("normalizeError — Soroban contract error", () => {
  it("'Error(Contract, #21)' → UnsafeHealthFactor (danger)", () => {
    const err = new Error("contract call failed: Error(Contract, #21)");
    const app = normalizeError(err);
    expect(app.category).toBe("Contract");
    expect(app.code).toBe("UnsafeHealthFactor");
    expect(app.severity).toBe("danger");
    expect(app.title).toMatch(/Health Factor/);
  });

  it("'Error(Contract, #20)' → LeverageTooHigh (warn)", () => {
    const err = new Error("Error(Contract, #20)");
    const app = normalizeError(err);
    expect(app.code).toBe("LeverageTooHigh");
    expect(app.severity).toBe("warn");
    expect(app.action).toMatch(/leverage/i);
  });

  it("'Error(Contract, #30)' → OracleStale", () => {
    const err = new Error("Error(Contract, #30)");
    const app = normalizeError(err);
    expect(app.code).toBe("OracleStale");
    expect(app.category).toBe("Contract");
  });

  it("Bilinmeyen contract kodu → UnknownContractCode_999 fallback (danger)", () => {
    const err = new Error("Error(Contract, #999)");
    const app = normalizeError(err);
    expect(app.code).toBe("UnknownContractCode_999");
    expect(app.severity).toBe("danger");
  });
});

describe("normalizeError — Wallet hataları", () => {
  it("USER_REJECTED → walletUserRejected (info)", () => {
    const err = new WalletError("USER_REJECTED", "user cancelled");
    const app = normalizeError(err);
    expect(app.category).toBe("Wallet");
    expect(app.code).toBe("walletUserRejected");
    expect(app.severity).toBe("info");
  });

  it("WRONG_NETWORK → walletWrongNetwork (warn) + 'Testnet' aksiyonu", () => {
    const err = new WalletError("WRONG_NETWORK", "mainnet selected");
    const app = normalizeError(err);
    expect(app.code).toBe("walletWrongNetwork");
    expect(app.severity).toBe("warn");
    expect(app.action).toMatch(/Testnet/);
  });

  it("NOT_INSTALLED → walletNotInstalled", () => {
    const err = new WalletError("NOT_INSTALLED", "freighter missing");
    const app = normalizeError(err);
    expect(app.code).toBe("walletNotInstalled");
  });
});

describe("normalizeError — HTTP / Auth", () => {
  it("HTTP 401 → authUnauthenticated", () => {
    const err = new Error("HTTP 401: unauthenticated");
    const app = normalizeError(err);
    expect(app.category).toBe("Auth");
    expect(app.code).toBe("authUnauthenticated");
  });

  it("HTTP 500 → rpcHostError", () => {
    const err = new Error("HTTP 500: internal error");
    const app = normalizeError(err);
    expect(app.category).toBe("Rpc");
    expect(app.code).toBe("rpcHostError");
  });
});

describe("normalizeError — network / unknown", () => {
  it("'Failed to fetch' → rpcUnreachable", () => {
    const err = new Error("Failed to fetch");
    const app = normalizeError(err);
    expect(app.category).toBe("Rpc");
    expect(app.code).toBe("rpcUnreachable");
  });

  it("string input → unknown fallback", () => {
    const app = normalizeError("kayboldu");
    expect(app.code).toBe("unknown");
    expect(app.category).toBe("Unknown");
  });

  it("null input → unknown", () => {
    const app = normalizeError(null);
    expect(app.code).toBe("unknown");
  });
});

describe("Risk dili — UnsafeHealthFactor / LeverageTooHigh testnet+unaudited içerir", () => {
  it("UnsafeHealthFactor description testnet/unaudited geçer", () => {
    const msg = HELIOS_MESSAGES_TR.UnsafeHealthFactor;
    expect(msg.description).toMatch(/testnet/i);
    expect(msg.description).toMatch(/unaudited/i);
  });
  it("LeverageTooHigh description testnet/unaudited geçer", () => {
    const msg = HELIOS_MESSAGES_TR.LeverageTooHigh;
    expect(msg.description).toMatch(/testnet/i);
  });
});
