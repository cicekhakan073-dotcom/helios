"use client";

/**
 * Open Position TanStack hook'ları — simulate (query) + send (mutation).
 *
 * Simulate: enabled iken paramlar değişince yeniden hesaplar; preparedTx +
 * minResourceFee + hostError döner. UI önizleme bunu canlı tüketir.
 * Send: kullanıcı imzalar + RPC'ye gönderir; success'te hash + ledger.
 */

import { useMutation, useQuery, type UseMutationOptions } from "@tanstack/react-query";

import { signAndSendOpenPosition, type SignAndSendResult, type OpenPositionSendError } from "./send";
import { simulateOpenPosition, type SimulatePreview, type OpenPositionSimulateError } from "./simulate";
import { type BuildOpenPositionParams } from "./tx-builder";

const OPEN_POSITION_PREFIX = ["helios", "open-position"] as const;

export interface UseSimulateOpenPositionOpts {
  /** Tüm zorunlu paramlar değiştiğinde simulate çalışır. */
  enabled?: boolean;
}

/**
 * Build + simulate read-only kombo. UI live preview için.
 * `staleTime: 0` çünkü kullanıcının leverage slider'ı 100ms gecikme ile re-fetch'i tetikler.
 */
export function useSimulateOpenPosition(
  params: BuildOpenPositionParams | null,
  opts?: UseSimulateOpenPositionOpts,
) {
  const enabled =
    (opts?.enabled ?? true) &&
    params != null &&
    params.principal > 0n &&
    params.leverageBps >= 100 &&
    params.leverageBps <= 500;

  return useQuery<SimulatePreview, OpenPositionSimulateError | Error>({
    queryKey: [
      ...OPEN_POSITION_PREFIX,
      "simulate",
      params?.userAddress ?? "-",
      params?.assetId ?? "-",
      params?.principal?.toString() ?? "-",
      params?.leverageBps ?? 0,
    ],
    queryFn: () => {
      if (!params) throw new Error("simulate: paramlar null");
      return simulateOpenPosition(params);
    },
    enabled,
    staleTime: 0,
    retry: false,
  });
}

export interface UseOpenPositionSendVariables {
  preparedTx: SimulatePreview["preparedTx"];
  userAddress: string;
}

/**
 * Sign + send mutation. UI "Sign & Send" tıklayınca tetikler.
 * Hata normalize: WalletError (USER_REJECTED) ve OpenPositionSendError ayrı kodlar.
 */
export function useOpenPositionSend(
  options?: Omit<
    UseMutationOptions<SignAndSendResult, OpenPositionSendError | Error, UseOpenPositionSendVariables>,
    "mutationFn"
  >,
) {
  return useMutation<SignAndSendResult, OpenPositionSendError | Error, UseOpenPositionSendVariables>({
    mutationFn: ({ preparedTx, userAddress }) =>
      signAndSendOpenPosition(preparedTx, userAddress),
    ...options,
  });
}
