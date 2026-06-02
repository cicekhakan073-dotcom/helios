/**
 * @helios/sdk — Helios TS SDK.
 *
 * Bu iskelet PROMPT 4'te boş kuruldu. PROMPT 18'de gerçek katmanlar
 * (TanStack Query hook'ları, contract bindings, Reflector/Blend wrapper,
 *  RPC simülasyon, HF mantığı TS aynası) eklenecek; addresses.json,
 *  wallet ve auth kaynak alınacak.
 *
 * AUDIT 2026-05-31 §1.2 — Blend pool.flash_loan + Request vec mimarisi
 * burada tip-güvenli sarmalanır.
 */

export const network = {
  id: "testnet",
  label: "Stellar Testnet",
  passphrase: "Test SDF Network ; September 2015",
} as const;

export type Network = typeof network;

// Wallet katmanı (PROMPT 16)
export * from "./wallet";

// Auth katmanı (PROMPT 17 — SEP-10)
export * from "./auth";

// Core SDK (PROMPT 18)
export * from "./addresses";
export * from "./hf";
export * from "./oracle/client";
export * from "./oracle/hook";
export * from "./oracle/scval";
export * from "./oracle/pool-oracle";
export * from "./oracle/pool-oracle-hook";
export * from "./blend-pool/client";
export * from "./blend-pool/hook";
export * from "./helios/config";
export * from "./helios/hooks";
export * from "./helios/keeper";
export * from "./helios/router";
export * from "./helios/open-position";

// Errors normalize + toast hub (PROMPT 19)
export * from "./errors";
