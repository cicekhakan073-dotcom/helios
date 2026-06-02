"use client";

import { useQuery } from "@tanstack/react-query";

import {
  loadPoolReserves,
  loadUserPosition,
  type ReserveSnapshot,
  type UserPositionSnapshot,
} from "./client";

const BLEND_QUERY_PREFIX = ["helios", "blend"] as const;

/**
 * usePoolReserves — Blend pool reserve listesi (c_factor / l_factor / decimals).
 * Pool config nadiren değişir; `staleTime: 5dk`.
 */
export function usePoolReserves() {
  return useQuery<ReserveSnapshot[]>({
    queryKey: [...BLEND_QUERY_PREFIX, "reserves"],
    queryFn: loadPoolReserves,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * useUserBlendPosition — kullanıcının Blend pozisyonu (collateral + debt).
 * Tx sonrası invalidate edilir (PROMPT 22).
 */
export function useUserBlendPosition(address: string | null, opts?: { enabled?: boolean }) {
  return useQuery<UserPositionSnapshot | null>({
    queryKey: [...BLEND_QUERY_PREFIX, "user-position", address ?? "anon"],
    queryFn: async () => (address ? loadUserPosition(address) : null),
    enabled: !!address && (opts?.enabled ?? true),
    staleTime: 30 * 1000,
    retry: 1,
  });
}
