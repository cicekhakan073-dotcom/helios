/**
 * Open Position simulate — tx imzalanmadan önce HF/debt önizleme.
 *
 * `Server.simulateTransaction` → `rpc.assembleTransaction(raw, sim).build()`
 * tek seferde footprint + resource fee yapıştırılmış tx'i döndürür. UI'ya
 * önizleme `SimulatePreview` objesi geri verilir; gerçek imza ayrı adım.
 */

import { rpc, Transaction } from "@stellar/stellar-sdk";

import { getRpcServer } from "../../rpc/server";

import { buildOpenPositionTx, type BuildOpenPositionParams } from "./tx-builder";

export interface SimulatePreview {
  /** İmzaya hazır tx (footprint + resource fee assembled). */
  preparedTx: Transaction;
  /** Min resource fee (stroops). UI gösterebilir. */
  minResourceFee: bigint | null;
  /** Latest ledger — context için. */
  latestLedger: number;
  /** Host error mesajı (revert), simulation reddedildiyse dolar. */
  hostError: string | null;
}

export class OpenPositionSimulateError extends Error {
  public override readonly name = "OpenPositionSimulateError";
  constructor(
    public readonly code: "RPC_ERROR" | "HOST_ERROR",
    message: string,
  ) {
    super(message);
  }
}

export async function simulateOpenPosition(
  params: BuildOpenPositionParams,
): Promise<SimulatePreview> {
  const raw = await buildOpenPositionTx(params);
  const server = getRpcServer();

  let sim: rpc.Api.SimulateTransactionResponse;
  try {
    sim = await server.simulateTransaction(raw);
  } catch (err) {
    throw new OpenPositionSimulateError(
      "RPC_ERROR",
      err instanceof Error ? `simulateTransaction: ${err.message}` : "simulate başarısız",
    );
  }

  // Host error (Contract, #N) burada gelir — Errors normalize katmanı düzgün eşler.
  if ("error" in sim && sim.error) {
    throw new OpenPositionSimulateError("HOST_ERROR", sim.error);
  }

  const builder = rpc.assembleTransaction(raw, sim);
  const preparedTx = builder.build();

  const minResourceFee =
    "minResourceFee" in sim && sim.minResourceFee ? BigInt(sim.minResourceFee) : null;
  const latestLedger = "latestLedger" in sim ? Number(sim.latestLedger) : 0;

  return {
    preparedTx,
    minResourceFee,
    latestLedger,
    hostError: null,
  };
}
