/**
 * Helios cross-contract tx pipeline — open/close/opt-in için ortak.
 *
 * Akış: build (caller) → simulate (server.simulateTransaction +
 * assembleTransaction) → sign (Wallets Kit) → send (server.sendTransaction)
 * → poll (getTransaction). Tek `InvokeHostFunctionOp`, MEMO_NONE,
 * muxed reddi tx-builder'da; pipeline yalnız ham → prepared → result yolu.
 */

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { Networks, rpc, TransactionBuilder, type Transaction } from "@stellar/stellar-sdk";

import { getRpcServer } from "../rpc/server";

// ============================================================================
// Simulate
// ============================================================================

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

export class TxSimulateError extends Error {
  public override readonly name = "TxSimulateError";
  constructor(
    public readonly code: "RPC_ERROR" | "HOST_ERROR",
    message: string,
  ) {
    super(message);
  }
}

export async function simulatePreparedTx(rawTx: Transaction): Promise<SimulatePreview> {
  const server = getRpcServer();
  let sim: rpc.Api.SimulateTransactionResponse;
  try {
    sim = await server.simulateTransaction(rawTx);
  } catch (err) {
    throw new TxSimulateError(
      "RPC_ERROR",
      err instanceof Error ? `simulateTransaction: ${err.message}` : "simulate başarısız",
    );
  }
  if ("error" in sim && sim.error) {
    throw new TxSimulateError("HOST_ERROR", sim.error);
  }
  const builder = rpc.assembleTransaction(rawTx, sim);
  const preparedTx = builder.build();
  const minResourceFee =
    "minResourceFee" in sim && sim.minResourceFee ? BigInt(sim.minResourceFee) : null;
  const latestLedger = "latestLedger" in sim ? Number(sim.latestLedger) : 0;
  return { preparedTx, minResourceFee, latestLedger, hostError: null };
}

// ============================================================================
// Sign + send + poll
// ============================================================================

export class TxSendError extends Error {
  public override readonly name = "TxSendError";
  constructor(
    public readonly code: "USER_REJECTED" | "SEND_FAILED" | "TX_FAILED" | "TIMEOUT" | "RPC_ERROR",
    message: string,
  ) {
    super(message);
  }
}

export interface SignAndSendResult {
  /** Testnet tx hash — Stellar Expert linki. */
  hash: string;
  /** Final ledger (success). */
  ledger?: number;
}

const MAX_ATTEMPTS = 15;
const POLL_MS = 2000;

export async function signAndSendPreparedTx(
  preparedTx: Transaction,
  userAddress: string,
): Promise<SignAndSendResult> {
  let signedXdr: string;
  try {
    const result = await StellarWalletsKit.signTransaction(preparedTx.toXDR(), {
      networkPassphrase: Networks.TESTNET,
      address: userAddress,
    });
    signedXdr = result.signedTxXdr;
  } catch (err) {
    throw new TxSendError("USER_REJECTED", err instanceof Error ? err.message : "imza reddedildi");
  }

  const server = getRpcServer();
  const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);

  let sendResp: rpc.Api.SendTransactionResponse;
  try {
    sendResp = await server.sendTransaction(signedTx);
  } catch (err) {
    throw new TxSendError(
      "RPC_ERROR",
      err instanceof Error ? `sendTransaction: ${err.message}` : "send başarısız",
    );
  }
  if (sendResp.status === "ERROR") {
    const detail = sendResp.errorResult?.toXDR("base64") ?? "no detail";
    throw new TxSendError("SEND_FAILED", `RPC tx'i reddetti: ${detail}`);
  }

  const hash = sendResp.hash;
  let attempts = 0;
  while (attempts < MAX_ATTEMPTS) {
    await new Promise<void>((r) => setTimeout(r, POLL_MS));
    attempts += 1;
    let txResp: rpc.Api.GetTransactionResponse;
    try {
      txResp = await server.getTransaction(hash);
    } catch (err) {
      if (attempts >= MAX_ATTEMPTS) {
        throw new TxSendError(
          "RPC_ERROR",
          err instanceof Error ? `getTransaction: ${err.message}` : "polling başarısız",
        );
      }
      continue;
    }
    if (txResp.status === rpc.Api.GetTransactionStatus.NOT_FOUND) continue;
    if (txResp.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash, ledger: txResp.ledger };
    }
    if (txResp.status === rpc.Api.GetTransactionStatus.FAILED) {
      const resultXdr = txResp.resultXdr.toXDR("base64");
      throw new TxSendError(
        "TX_FAILED",
        `Tx revert oldu (host error). XDR: ${resultXdr.slice(0, 80)}…`,
      );
    }
  }
  throw new TxSendError(
    "TIMEOUT",
    `Tx ${MAX_ATTEMPTS * POLL_MS}ms içinde sonuçlanmadı (hash=${hash}).`,
  );
}

/** Stellar Expert testnet tx linki — UI'da göstermek için. */
export function txExplorerLink(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}
