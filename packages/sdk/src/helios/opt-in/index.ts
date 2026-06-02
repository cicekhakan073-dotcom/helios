"use client";

/**
 * keeper.register_opt_in — Auto-Rebalancer kayıt tx'i.
 *
 * İmza: `register_opt_in(user, trigger_hf_bps, target_hf_bps, max_deleverage_bps)`.
 * Validasyon (kontratla aynı): trigger ≥ HF_LIQUIDATION (≥1.00),
 * target > trigger, 0 < max_deleverage_bps ≤ 10000.
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
import { useMutation, useQuery, type UseMutationOptions } from "@tanstack/react-query";

import { getAddresses } from "../../addresses";
import { getRpcServer } from "../../rpc/server";
import {
  signAndSendPreparedTx,
  simulatePreparedTx,
  type SignAndSendResult,
  type SimulatePreview,
  type TxSendError,
  type TxSimulateError,
} from "../tx-pipeline";

export interface RegisterOptInParams {
  userAddress: string;
  triggerHfBps: number;
  targetHfBps: number;
  maxDeleverageBps: number;
}

export class RegisterOptInBuildError extends Error {
  public override readonly name = "RegisterOptInBuildError";
  constructor(
    public readonly code: "INVALID_INPUT" | "MUXED_FORBIDDEN" | "RPC_ERROR",
    message: string,
  ) {
    super(message);
  }
}

function scvU32(value: number): xdr.ScVal {
  return xdr.ScVal.scvU32(value);
}

async function buildRegisterOptInTx(params: RegisterOptInParams) {
  const { userAddress, triggerHfBps, targetHfBps, maxDeleverageBps } = params;

  if (userAddress.startsWith("M")) {
    throw new RegisterOptInBuildError("MUXED_FORBIDDEN", "Muxed account (M…) Soroban'da yasak.");
  }
  if (!userAddress.startsWith("G")) {
    throw new RegisterOptInBuildError("INVALID_INPUT", "Geçersiz Stellar adres formatı.");
  }
  if (triggerHfBps < 100) {
    throw new RegisterOptInBuildError("INVALID_INPUT", "trigger_hf_bps ≥ 100 (1.00) olmalı.");
  }
  if (targetHfBps <= triggerHfBps) {
    throw new RegisterOptInBuildError("INVALID_INPUT", "target_hf_bps > trigger_hf_bps olmalı.");
  }
  if (maxDeleverageBps === 0 || maxDeleverageBps > 10_000) {
    throw new RegisterOptInBuildError(
      "INVALID_INPUT",
      "max_deleverage_bps 1..10000 aralığında olmalı.",
    );
  }

  const server = getRpcServer();
  let source: Account;
  try {
    const acc = await server.getAccount(userAddress);
    source = new Account(acc.accountId(), acc.sequenceNumber());
  } catch (err) {
    throw new RegisterOptInBuildError(
      "RPC_ERROR",
      err instanceof Error ? `getAccount: ${err.message}` : "getAccount başarısız",
    );
  }

  const { helios } = getAddresses();
  const keeper = new Contract(helios.keeper);
  const op = keeper.call(
    "register_opt_in",
    Address.fromString(userAddress).toScVal(),
    scvU32(triggerHfBps),
    scvU32(targetHfBps),
    scvU32(maxDeleverageBps),
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

const OPT_IN_PREFIX = ["helios", "opt-in"] as const;

async function simulateRegisterOptIn(params: RegisterOptInParams): Promise<SimulatePreview> {
  const raw = await buildRegisterOptInTx(params);
  return simulatePreparedTx(raw);
}

export function useSimulateRegisterOptIn(
  params: RegisterOptInParams | null,
  opts?: { enabled?: boolean },
) {
  return useQuery<SimulatePreview, TxSimulateError | RegisterOptInBuildError | Error>({
    queryKey: [
      ...OPT_IN_PREFIX,
      "simulate",
      params?.userAddress ?? "-",
      params?.triggerHfBps ?? 0,
      params?.targetHfBps ?? 0,
      params?.maxDeleverageBps ?? 0,
    ],
    queryFn: () => {
      if (!params) throw new Error("simulate: paramlar null");
      return simulateRegisterOptIn(params);
    },
    enabled: (opts?.enabled ?? true) && params != null,
    staleTime: 0,
    retry: false,
  });
}

export interface UseOptInSendVariables {
  preparedTx: SimulatePreview["preparedTx"];
  userAddress: string;
}

export function useRegisterOptInSend(
  options?: Omit<
    UseMutationOptions<SignAndSendResult, TxSendError | Error, UseOptInSendVariables>,
    "mutationFn"
  >,
) {
  return useMutation<SignAndSendResult, TxSendError | Error, UseOptInSendVariables>({
    mutationFn: ({ preparedTx, userAddress }) => signAndSendPreparedTx(preparedTx, userAddress),
    ...options,
  });
}
