/**
 * Read-only kontrat çağrıları için tx hazırlayıp simulate eden helper.
 *
 * Pattern:
 *   1. Dummy source account ile bir tx kurar (Operation.invokeContractFunction)
 *   2. `server.simulateTransaction(tx)` ile execute eder
 *   3. Result'tan ScVal'i çıkarır + native JS'e çevirir
 */

import {
  Account,
  Contract,
  Networks,
  scValToNative,
  TransactionBuilder,
  type xdr,
} from "@stellar/stellar-sdk";

import { getRpcServer } from "./server";

// Stellar SDK base account — sequence 0 + dummy public key. Yayınlanmaz.
const DUMMY_SOURCE = "GAQUEFDOXDAFEE7R3LKDA3BUGDTNJBFQZP7MPHEGZIJVWBWCABV7APYM";

export interface SimulateError {
  kind: "rpc-error" | "host-error";
  message: string;
}

export interface SimulateSuccess<T> {
  ok: true;
  value: T;
  /** Footprint + cost tahmini (PROMPT 22'de XDR build için tüketilir). */
  resourceFee?: bigint;
}

export interface SimulateFail {
  ok: false;
  error: SimulateError;
}

export type SimulateResult<T> = SimulateSuccess<T> | SimulateFail;

/** Read-only kontrat fn'i simulate et + ScVal'i native'e çevir. */
export async function simulateView<T = unknown>(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
): Promise<SimulateResult<T>> {
  try {
    const server = getRpcServer();
    const source = new Account(DUMMY_SOURCE, "0");
    const contract = new Contract(contractId);

    const tx = new TransactionBuilder(source, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await server.simulateTransaction(tx);

    if ("error" in sim && sim.error) {
      return { ok: false, error: { kind: "host-error", message: sim.error } };
    }
    // sim.result.retval'ı çıkar
    if (!("result" in sim) || !sim.result) {
      return { ok: false, error: { kind: "rpc-error", message: "simulate result missing" } };
    }
    const retval = sim.result.retval;
    const native = scValToNative(retval) as T;
    const hasFee = "minResourceFee" in sim && !!sim.minResourceFee;
    const success: SimulateSuccess<T> = hasFee
      ? { ok: true, value: native, resourceFee: BigInt((sim as { minResourceFee: string }).minResourceFee) }
      : { ok: true, value: native };
    return success;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: { kind: "rpc-error", message } };
  }
}
