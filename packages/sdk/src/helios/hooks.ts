"use client";

import { useQuery } from "@tanstack/react-query";

import { VAULTS, STRATEGIES, type VaultConfig, type StrategyConfig } from "./config";
import { getOptIn, getKeeperAdmin, getKeeperRole, type OptInSettings } from "./keeper";
import { getRouterInfo, type RouterInfo } from "./router";

const HELIOS_QUERY_PREFIX = ["helios", "contract"] as const;

/** Statik MVP vault listesi. */
export function useVaults(): { data: readonly VaultConfig[] } {
  return { data: VAULTS };
}

export function useStrategies(): { data: readonly StrategyConfig[] } {
  return { data: STRATEGIES };
}

/** strategy_router admin + paused — health check için. */
export function useRouterInfo() {
  return useQuery<RouterInfo | null>({
    queryKey: [...HELIOS_QUERY_PREFIX, "router-info"],
    queryFn: getRouterInfo,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Kullanıcının keeper opt-in ayarları. */
export function useKeeperOptIn(userAddress: string | null) {
  return useQuery<OptInSettings | null>({
    queryKey: [...HELIOS_QUERY_PREFIX, "opt-in", userAddress ?? "anon"],
    queryFn: async () => (userAddress ? getOptIn(userAddress) : null),
    enabled: !!userAddress,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

/** keeper admin/role bilgisi (admin sayfası için). */
export function useKeeperInfo() {
  return useQuery<{ admin: string; keeperRole: string } | null>({
    queryKey: [...HELIOS_QUERY_PREFIX, "keeper-info"],
    queryFn: async () => {
      const [admin, role] = await Promise.all([getKeeperAdmin(), getKeeperRole()]);
      if (!admin.ok || !role.ok) return null;
      return { admin: admin.value, keeperRole: role.value };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * usePosition — Helios pozisyon meta'sı (entry_price, leverage, opt-in flag).
 *
 * AUDIT §1.1 — meta off-chain Neon DB'de (PROMPT 30). Şu an placeholder:
 * Blend `useUserBlendPosition` raw collateral/debt'i veriyor; Helios meta
 * eklenince burası Neon'dan çekecek. UI bu hook'u zaten kullanır → API
 * stabil kalır.
 */
export interface HeliosPositionMeta {
  user: string;
  entryPriceI128: bigint | null;
  leverageBps: number | null;
  openedAt: number | null;
  optInKeeper: boolean;
}

export function usePosition(userAddress: string | null) {
  return useQuery<HeliosPositionMeta | null>({
    queryKey: [...HELIOS_QUERY_PREFIX, "position", userAddress ?? "anon"],
    queryFn: () => {
      if (!userAddress) return Promise.resolve(null);
      // PROMPT 30'da Neon'dan çekilecek; şimdilik boş placeholder.
      return Promise.resolve<HeliosPositionMeta>({
        user: userAddress,
        entryPriceI128: null,
        leverageBps: null,
        openedAt: null,
        optInKeeper: false,
      });
    },
    enabled: !!userAddress,
    staleTime: 30 * 1000,
  });
}
