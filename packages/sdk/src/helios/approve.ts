"use client";

/**
 * SAC allowance (approve) — Blend pool'un kullanıcının asset'ini çekebilmesi için.
 *
 * NEDEN: Blend `pool.flash_loan/submit` collateral'ı `transfer_from(spender=pool)` ile
 * çeker → `allowance(user → pool)` gerekir. Yoksa SAC `Error(Contract, #9)`
 * "not enough allowance to spend" verir (canlı doğrulandı 2026-06-03). open_position
 * öncesi kullanıcı bir kez approve etmeli.
 *
 * Tek InvokeHostFunctionOp, MEMO_NONE; build → simulate → sign (Wallets Kit) → send.
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

import { getAddresses, sacAddressFor, type AssetId } from "../addresses";
import { getRpcServer } from "../rpc/server";

import { signAndSendPreparedTx, simulatePreparedTx } from "./tx-pipeline";

/** Allowance ömrü (ledger). Testnet ~5s/ledger → ~6 gün. max_entry_ttl altında. */
const ALLOWANCE_TTL_LEDGERS = 100_000;

function scvI128(value: bigint): xdr.ScVal {
  return xdr.ScVal.scvI128(
    new xdr.Int128Parts({
      hi: xdr.Int64.fromString(((value >> 64n) & 0xffffffffffffffffn).toString()),
      lo: xdr.Uint64.fromString((value & 0xffffffffffffffffn).toString()),
    }),
  );
}

export interface ApproveParams {
  userAddress: string;
  assetId: AssetId;
  /** Pool'a verilecek allowance (asset stroops). */
  amount: bigint;
}

/**
 * Kullanıcı → Blend pool için SAC `approve`. build+simulate+sign+send.
 * open_position'dan ÖNCE çağrılır.
 */
export async function approvePoolSpend(params: ApproveParams): Promise<{ hash: string }> {
  const { userAddress, assetId, amount } = params;
  if (userAddress.startsWith("M")) throw new Error("Muxed account (M…) yasak.");
  const sac = sacAddressFor(assetId);
  if (!sac) throw new Error(`${assetId} için SAC adresi resolve edilemedi.`);

  const { blend } = getAddresses();
  const server = getRpcServer();
  const acc = await server.getAccount(userAddress);
  const source = new Account(acc.accountId(), acc.sequenceNumber());
  const latest = await server.getLatestLedger();
  const expirationLedger = latest.sequence + ALLOWANCE_TTL_LEDGERS;

  const token = new Contract(sac);
  const op = token.call(
    "approve",
    Address.fromString(userAddress).toScVal(), // from
    Address.fromString(blend.pool).toScVal(), // spender = Blend pool
    scvI128(amount),
    xdr.ScVal.scvU32(expirationLedger),
  );

  const raw = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
    memo: Memo.none(),
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  const prepared = await simulatePreparedTx(raw);
  const res = await signAndSendPreparedTx(prepared.preparedTx, userAddress);
  return { hash: res.hash };
}
