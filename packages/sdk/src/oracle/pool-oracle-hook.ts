"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchPoolOraclePrice } from "./pool-oracle";

import type { AssetId } from "../addresses";
import type { OraclePriceReading } from "./client";

const POOL_ORACLE_QUERY_PREFIX = ["helios", "oracle", "pool"] as const;

/**
 * usePoolOraclePrice — Blend pool'un kendi oracle'ından lastprice.
 *
 * HF tutarlılığı için kullanın (Helios sim/preview ile Blend kontratı aynı
 * fiyat kaynağını okur). Reflector V3 hook'u (`useOraclePrice`) referans
 * gösterim için ayrı kalır.
 *
 * `staleTime: 30s`, `refetchInterval: 60s` — oracle resolution ~5dk.
 */
export function usePoolOraclePrice(asset: AssetId, opts?: { enabled?: boolean }) {
  return useQuery<OraclePriceReading | null>({
    queryKey: [...POOL_ORACLE_QUERY_PREFIX, "price", asset],
    queryFn: () => fetchPoolOraclePrice(asset),
    enabled: opts?.enabled ?? true,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 1,
  });
}
