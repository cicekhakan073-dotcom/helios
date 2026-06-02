/**
 * `strategy_router.open_position(user, asset, principal, leverage_bps)` tx builder.
 *
 * AUDIT §1.1/§1.2 — Helios router içeride Blend `pool.flash_loan(user, FlashLoan, requests)`
 * çağrısı yapar. Tek `InvokeHostFunctionOp` altında zincirlenir. MEMO_NONE zorunlu;
 * muxed account (M…) tx'i kuran tarafça reddedilir.
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

import { getAddresses, ASSET_META, type AssetId } from "../../addresses";
import { getRpcServer } from "../../rpc/server";

export interface BuildOpenPositionParams {
  /** Pozisyonu açan kullanıcı (G…). Muxed (M…) yasak. */
  userAddress: string;
  /** Seçili AssetId (USDC/XLM/wBTC/wETH). */
  assetId: AssetId;
  /** Principal (asset native decimals). */
  principal: bigint;
  /** 100..500 — `strategy_router.max_leverage_bps` ile aynı sınırlar. */
  leverageBps: number;
}

export class OpenPositionBuildError extends Error {
  public override readonly name = "OpenPositionBuildError";
  constructor(
    public readonly code: "MUXED_FORBIDDEN" | "MISSING_SAC" | "INVALID_INPUT" | "RPC_ERROR",
    message: string,
  ) {
    super(message);
  }
}

/** AssetId → SAC adresi (NEXT_PUBLIC_*_SAC env'den). PROMPT 24 sonrası dolar. */
function resolveSac(assetId: AssetId): string {
  const meta = ASSET_META[assetId];
  if (meta.reflector.kind !== "Stellar") {
    // wBTC/wETH "Other(symbol)" — Helios router için yine de SAC gerek
    // (Blend reserve `Stellar(SAC)` register edilir). PROMPT 24 sonrası dolacak.
  }
  const envKey =
    meta.reflector.kind === "Stellar"
      ? meta.reflector.sacAddressEnvKey
      : `NEXT_PUBLIC_MOCK_${assetId.toUpperCase().replace("W", "W")}_SAC`;
  const sac =
    typeof process !== "undefined" && process.env ? process.env[envKey] ?? "" : "";
  if (!sac) {
    throw new OpenPositionBuildError(
      "MISSING_SAC",
      `${assetId} için SAC adresi yok (env: ${envKey}). PROMPT 24 (faucet) deploy sonrası set edilir.`,
    );
  }
  return sac;
}

function assertNotMuxed(address: string): void {
  if (address.startsWith("M")) {
    throw new OpenPositionBuildError(
      "MUXED_FORBIDDEN",
      "Muxed account (M…) Soroban tx'inde yasaktır (AUDIT §3.1 — tx-build aşaması kontrolü).",
    );
  }
  if (!address.startsWith("G")) {
    throw new OpenPositionBuildError("INVALID_INPUT", "Geçersiz Stellar adres formatı.");
  }
}

/** ScVal i128 helper. */
function scvI128(value: bigint): xdr.ScVal {
  return xdr.ScVal.scvI128(
    new xdr.Int128Parts({
      hi: xdr.Int64.fromString(((value >> 64n) & 0xffffffffffffffffn).toString()),
      lo: xdr.Uint64.fromString((value & 0xffffffffffffffffn).toString()),
    }),
  );
}

function scvU32(value: number): xdr.ScVal {
  return xdr.ScVal.scvU32(value);
}

/**
 * **Raw** (henüz simulate edilmemiş) open_position tx'i.
 *
 * `assembleTransaction(raw, sim).build()` ile footprint + resource fee
 * yapıştırılır; sonrası imza + send.
 */
export async function buildOpenPositionTx(params: BuildOpenPositionParams) {
  const { userAddress, assetId, principal, leverageBps } = params;

  // 1) Validations
  assertNotMuxed(userAddress);
  if (principal <= 0n) {
    throw new OpenPositionBuildError("INVALID_INPUT", "Principal sıfır veya negatif olamaz.");
  }
  if (leverageBps < 100 || leverageBps > 500) {
    throw new OpenPositionBuildError(
      "INVALID_INPUT",
      "Leverage 100..500 (1×..5×) aralığında olmalı.",
    );
  }

  // 2) SAC adresi
  const sacAddress = resolveSac(assetId);

  // 3) Source account (sequence için RPC'den)
  const server = getRpcServer();
  let source: Account;
  try {
    const acc = await server.getAccount(userAddress);
    source = new Account(acc.accountId(), acc.sequenceNumber());
  } catch (err) {
    throw new OpenPositionBuildError(
      "RPC_ERROR",
      err instanceof Error ? `getAccount: ${err.message}` : "getAccount başarısız",
    );
  }

  // 4) Contract.call("open_position", user, asset, principal, leverage_bps)
  const { helios } = getAddresses();
  const router = new Contract(helios.strategyRouter);
  const op = router.call(
    "open_position",
    Address.fromString(userAddress).toScVal(),
    Address.fromString(sacAddress).toScVal(),
    scvI128(principal),
    scvU32(leverageBps),
  );

  // 5) TransactionBuilder — MEMO_NONE zorunlu (AUDIT §3.1, Soroban kısıtı)
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
    memo: Memo.none(),
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  return tx;
}
