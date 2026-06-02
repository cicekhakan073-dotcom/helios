"use client";

import { useQuery } from "@tanstack/react-query";

import { loadUserPosition, type UserPositionSnapshot } from "../blend-pool/client";

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
 * Helios position meta — AUDIT §1.1 meta off-chain (Neon, PROMPT 30 indexer'la dolar).
 * Tx success → optimistic UI (PROMPT 22 DEVAM §6.2c); authoritative değer indexer.
 */
export interface HeliosPositionMeta {
  user: string;
  entryPriceI128: bigint | null;
  leverageBps: number | null;
  openedAt: number | null;
  optInKeeper: boolean;
}

/** Neon meta best-effort fetch — PROMPT 30 öncesinde placeholder.
 *  PROMPT 30'da gerçek `await fetch("/api/helios/position/...")` olacak; dönüş tipi
 *  `Promise` kaldığı için çağıranlar değişmez. Şimdilik await yok → `Promise.resolve`. */
function fetchHeliosMeta(userAddress: string): Promise<HeliosPositionMeta> {
  return Promise.resolve({
    user: userAddress,
    entryPriceI128: null,
    leverageBps: null,
    openedAt: null,
    optInKeeper: false,
  });
}

/**
 * §6.4 leverage tahmini — meta yoksa raw collateral/debt'ten.
 *
 * Single-asset MVP varsayımı: kullanıcının tek non-zero collateral ve tek
 * non-zero liability'si var; aynı reserve değil de farklı reserve'ler olabilir,
 * formül collateral ÷ (collateral − debt) HAM b/d token cinsinden bir oran;
 * USD bazlı kesin değer DEĞİL ama UI'ya kabaca "kaç× kaldıraç" tahmini verir.
 */
function estimateLeverageBpsFromBlend(snap: UserPositionSnapshot): number | null {
  const cValues = Object.values(snap.collateral).filter((v) => v > 0n);
  const dValues = Object.values(snap.liabilities).filter((v) => v > 0n);
  if (cValues.length === 0) return null;
  const c = cValues.reduce<bigint>((acc, v) => acc + v, 0n);
  const d = dValues.reduce<bigint>((acc, v) => acc + v, 0n);
  if (c <= d) return null;
  const denom = c - d;
  if (denom <= 0n) return null;
  // leverage_bps = c / (c - d) * 10000
  const bps = Number((c * 10000n) / denom);
  if (bps < 100 || bps > 100_000) return null;
  return bps;
}

export interface PositionHydrated {
  meta: HeliosPositionMeta;
  blend: UserPositionSnapshot | null;
  /** Sürüklenmiş kaynak: "meta" (Neon authoritative) ya da "blend-fallback". */
  leverageSource: "meta" | "blend-fallback" | "none";
  /** Final leverage bps (meta varsa o; yoksa Blend tahmini; yoksa null). */
  effectiveLeverageBps: number | null;
}

/**
 * usePosition — AUDIT 2026-06-02 §6.4 hydration:
 *   1) Blend pool'dan authoritative collateral/debt çek.
 *   2) Neon'dan meta best-effort çek (boşsa zarar yok).
 *   3) leverage_bps: meta varsa onu kullan; yoksa raw collateral/debt'ten tahmin et.
 *
 * Tx success sonrası `queryClient.setQueryData(...)` ile optimistic patch'lenir.
 */
export function usePosition(userAddress: string | null) {
  return useQuery<PositionHydrated | null>({
    queryKey: [...HELIOS_QUERY_PREFIX, "position", userAddress ?? "anon"],
    queryFn: async () => {
      if (!userAddress) return null;
      const [meta, blend] = await Promise.all([
        fetchHeliosMeta(userAddress),
        loadUserPosition(userAddress).catch(() => null),
      ]);
      let leverageSource: PositionHydrated["leverageSource"] = "none";
      let effectiveLeverageBps: number | null = null;
      if (meta.leverageBps != null) {
        leverageSource = "meta";
        effectiveLeverageBps = meta.leverageBps;
      } else if (blend) {
        const est = estimateLeverageBpsFromBlend(blend);
        if (est != null) {
          leverageSource = "blend-fallback";
          effectiveLeverageBps = est;
        }
      }
      return { meta, blend, leverageSource, effectiveLeverageBps };
    },
    enabled: !!userAddress,
    staleTime: 30 * 1000,
  });
}

/** Tx success sonrası `queryClient.setQueryData(positionQueryKey(addr), …)` için. */
export const positionQueryKey = (userAddress: string) =>
  [...HELIOS_QUERY_PREFIX, "position", userAddress] as const;
