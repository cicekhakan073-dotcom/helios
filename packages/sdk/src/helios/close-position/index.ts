"use client";

/**
 * Close Position — build + simulate + send + hooks.
 * Pipeline open-position ile ortak (tx-pipeline.ts).
 */

import { useMutation, useQuery, type UseMutationOptions } from "@tanstack/react-query";

import {
  signAndSendPreparedTx,
  simulatePreparedTx,
  type SignAndSendResult,
  type SimulatePreview,
  type TxSendError,
  type TxSimulateError,
} from "../tx-pipeline";

import {
  buildClosePositionTx,
  type ClosePositionBuildError,
  type BuildClosePositionParams,
} from "./tx-builder";

export {
  buildClosePositionTx,
  ClosePositionBuildError,
  type BuildClosePositionParams,
} from "./tx-builder";

const CLOSE_POSITION_PREFIX = ["helios", "close-position"] as const;

async function simulateClosePosition(params: BuildClosePositionParams): Promise<SimulatePreview> {
  const raw = await buildClosePositionTx(params);
  return simulatePreparedTx(raw);
}

export function useSimulateClosePosition(
  params: BuildClosePositionParams | null,
  opts?: { enabled?: boolean },
) {
  const enabled =
    (opts?.enabled ?? true) &&
    params != null &&
    params.debtAmount > 0n &&
    params.collateralAmount >= params.debtAmount;
  return useQuery<SimulatePreview, TxSimulateError | ClosePositionBuildError | Error>({
    queryKey: [
      ...CLOSE_POSITION_PREFIX,
      "simulate",
      params?.userAddress ?? "-",
      params?.assetId ?? "-",
      params?.debtAmount?.toString() ?? "-",
      params?.collateralAmount?.toString() ?? "-",
    ],
    queryFn: () => {
      if (!params) throw new Error("simulate: paramlar null");
      return simulateClosePosition(params);
    },
    enabled,
    staleTime: 0,
    retry: false,
  });
}

export interface UseCloseSendVariables {
  preparedTx: SimulatePreview["preparedTx"];
  userAddress: string;
}

export function useClosePositionSend(
  options?: Omit<
    UseMutationOptions<SignAndSendResult, TxSendError | Error, UseCloseSendVariables>,
    "mutationFn"
  >,
) {
  return useMutation<SignAndSendResult, TxSendError | Error, UseCloseSendVariables>({
    mutationFn: ({ preparedTx, userAddress }) => signAndSendPreparedTx(preparedTx, userAddress),
    ...options,
  });
}
