/**
 * Sign + send + poll — Wallets Kit ile imzalat, RPC'ye gönder, sonuç bekle.
 */

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import { Networks, rpc, TransactionBuilder, type Transaction } from "@stellar/stellar-sdk";

import { getRpcServer } from "../../rpc/server";

export class OpenPositionSendError extends Error {
  public override readonly name = "OpenPositionSendError";
  constructor(
    public readonly code:
      | "USER_REJECTED"
      | "SEND_FAILED"
      | "TX_FAILED"
      | "TIMEOUT"
      | "RPC_ERROR",
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

/**
 * Wallets Kit ile imzalat → RPC'ye gönder → polling ile final result.
 *
 * Polling: max 30 sn (15 × 2sn). Hala NOT_FOUND ise TIMEOUT atılır.
 */
export async function signAndSendOpenPosition(
  preparedTx: Transaction,
  userAddress: string,
): Promise<SignAndSendResult> {
  // 1) Imza — Freighter popup
  let signedXdr: string;
  try {
    const result = await StellarWalletsKit.signTransaction(preparedTx.toXDR(), {
      networkPassphrase: Networks.TESTNET,
      address: userAddress,
    });
    signedXdr = result.signedTxXdr;
  } catch (err) {
    throw new OpenPositionSendError(
      "USER_REJECTED",
      err instanceof Error ? err.message : "imza reddedildi",
    );
  }

  // 2) Send
  const server = getRpcServer();
  const signedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
  let sendResp: rpc.Api.SendTransactionResponse;
  try {
    sendResp = await server.sendTransaction(signedTx);
  } catch (err) {
    throw new OpenPositionSendError(
      "RPC_ERROR",
      err instanceof Error ? `sendTransaction: ${err.message}` : "send başarısız",
    );
  }

  if (sendResp.status === "ERROR") {
    throw new OpenPositionSendError(
      "SEND_FAILED",
      `RPC tx'i reddetti (status=ERROR): ${sendResp.errorResult?.result().toString() ?? "no detail"}`,
    );
  }

  // PENDING / DUPLICATE / TRY_AGAIN_LATER → polling
  const hash = sendResp.hash;
  let attempts = 0;
  const MAX_ATTEMPTS = 15;
  const POLL_MS = 2000;

  while (attempts < MAX_ATTEMPTS) {
    await new Promise<void>((r) => setTimeout(r, POLL_MS));
    attempts += 1;
    let txResp: rpc.Api.GetTransactionResponse;
    try {
      txResp = await server.getTransaction(hash);
    } catch (err) {
      // Ağ titremesi — yeniden dene
      if (attempts >= MAX_ATTEMPTS) {
        throw new OpenPositionSendError(
          "RPC_ERROR",
          err instanceof Error ? `getTransaction: ${err.message}` : "polling başarısız",
        );
      }
      continue;
    }

    if (txResp.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
      continue;
    }
    if (txResp.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return { hash, ledger: txResp.ledger };
    }
    if (txResp.status === rpc.Api.GetTransactionStatus.FAILED) {
      const resultXdr = txResp.resultXdr.toXDR("base64");
      throw new OpenPositionSendError(
        "TX_FAILED",
        `Tx revert oldu (host error). XDR: ${resultXdr.slice(0, 80)}…`,
      );
    }
  }

  throw new OpenPositionSendError(
    "TIMEOUT",
    `Tx ${MAX_ATTEMPTS * POLL_MS}ms içinde sonuçlanmadı (hash=${hash}).`,
  );
}

/** Stellar Expert testnet tx linki — UI'da göstermek için. */
export function txExplorerLink(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}
