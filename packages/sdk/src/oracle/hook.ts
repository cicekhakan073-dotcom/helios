"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchOraclePrice, type OraclePriceReading } from "./client";

import type { AssetId } from "../addresses";


const ORACLE_QUERY_PREFIX = ["helios", "oracle"] as const;

/**
 * useOraclePrice — Reflector lastprice + decimals + freshness.
 *
 * `staleTime: 30s` çünkü Reflector feed'lerinin resolution'ı ~5dk; daha kısa
 * sürede yeniden çekmek gereksiz RPC trafiği.
 */
export function useOraclePrice(asset: AssetId, opts?: { enabled?: boolean }) {
  return useQuery<OraclePriceReading | null>({
    queryKey: [...ORACLE_QUERY_PREFIX, "price", asset],
    queryFn: () => fetchOraclePrice(asset),
    enabled: opts?.enabled ?? true,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 1,
  });
}
