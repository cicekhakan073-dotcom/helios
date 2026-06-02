/**
 * `strategy_router.close_position(user, asset, debt_amount, collateral_amount)` tx builder.
 *
 * AUDIT 2026-06-03 — close artık `pool.submit(...)` ile WithdrawCollateral + Repay
 * (flash gerek YOK; çift-borç bug'ından sonra route sadeleşti). Validasyon:
 * `collateral_amount ≥ debt_amount` (net çekiş fonlanabilsin + bitiş HF ≥ 1).
 */

import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Memo,
  Networks,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";

import { getAddresses, sacAddressFor, type AssetId } from "../../addresses";
import { getRpcServer } from "../../rpc/server";

export interface BuildClosePositionParams {
  /** Pozisyonu kapatan kullanıcı (G…). Muxed (M…) yasak. */
  userAddress: string;
  /** Açılan pozisyonun asset'i. */
  assetId: AssetId;
  /** Geri ödenecek borç (Blend d-token underlying). */
  debtAmount: bigint;
  /** Çekilecek teminat (Blend b-token underlying). */
  collateralAmount: bigint;
}

export class ClosePositionBuildError extends Error {
  public override readonly name = "ClosePositionBuildError";
  constructor(
    public readonly code: "MUXED_FORBIDDEN" | "INVALID_INPUT" | "MISSING_SAC" | "RPC_ERROR",
    message: string,
  ) {
    super(message);
  }
}

function assertNotMuxed(address: string): void {
  if (address.startsWith("M")) {
    throw new ClosePositionBuildError(
      "MUXED_FORBIDDEN",
      "Muxed account (M…) Soroban tx'inde yasaktır.",
    );
  }
  if (!address.startsWith("G")) {
    throw new ClosePositionBuildError("INVALID_INPUT", "Geçersiz Stellar adres formatı.");
  }
}

function scvI128(value: bigint): xdr.ScVal {
  return xdr.ScVal.scvI128(
    new xdr.Int128Parts({
      hi: xdr.Int64.fromString(((value >> 64n) & 0xffffffffffffffffn).toString()),
      lo: xdr.Uint64.fromString((value & 0xffffffffffffffffn).toString()),
    }),
  );
}

export async function buildClosePositionTx(params: BuildClosePositionParams) {
  const { userAddress, assetId, debtAmount, collateralAmount } = params;

  assertNotMuxed(userAddress);
  if (debtAmount <= 0n || collateralAmount <= 0n) {
    throw new ClosePositionBuildError(
      "INVALID_INPUT",
      "debt_amount ve collateral_amount pozitif olmalı.",
    );
  }
  if (collateralAmount < debtAmount) {
    throw new ClosePositionBuildError(
      "INVALID_INPUT",
      "collateral_amount ≥ debt_amount olmalı (net çekiş için).",
    );
  }

  const sacAddress = sacAddressFor(assetId);
  if (!sacAddress) {
    throw new ClosePositionBuildError("MISSING_SAC", `${assetId} SAC resolve edilemedi.`);
  }

  const server = getRpcServer();
  let source: Account;
  try {
    const acc = await server.getAccount(userAddress);
    source = new Account(acc.accountId(), acc.sequenceNumber());
  } catch (err) {
    throw new ClosePositionBuildError(
      "RPC_ERROR",
      err instanceof Error ? `getAccount: ${err.message}` : "getAccount başarısız",
    );
  }

  const { helios } = getAddresses();
  const router = new Contract(helios.strategyRouter);
  const op = router.call(
    "close_position",
    Address.fromString(userAddress).toScVal(),
    Address.fromString(sacAddress).toScVal(),
    scvI128(debtAmount),
    scvI128(collateralAmount),
  );

  return new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
    memo: Memo.none(),
  })
    .addOperation(op)
    .setTimeout(60)
    .build();
}
