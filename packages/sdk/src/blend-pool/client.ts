/**
 * Blend pool + user position loader'ları (@blend-capital/blend-sdk 3.2.2).
 *
 * AUDIT §1.1 — Helios vault YOK; pozisyon defteri doğrudan Blend pool'dan
 * çekilir. HF off-chain `computeUserHfBps()` ile.
 */

import { PoolV2, PoolUser, type Pool, type Reserve } from "@blend-capital/blend-sdk";

import { getAddresses } from "../addresses";
import { effectiveCollateral, effectiveLiability, healthFactorBps, riskBand, type HfBand } from "../hf";

import { getBlendNetwork } from "./network";

/** Tek bir reserve'in UI'ya hazır snapshot'ı. */
export interface ReserveSnapshot {
  /** Asset adresi (SAC). */
  asset: string;
  /** Reserve index — `positions.collateral` / `.liabilities` map key'i. */
  index: number;
  /** decimals (config). */
  decimals: number;
  /** collateral factor — basis points (8500 = 0.85). */
  cFactorBps: number;
  /** liability factor — basis points (8000 = 0.80). */
  lFactorBps: number;
  /** UI label. */
  scalar: bigint;
}

/** Blend reserve factor scalar = 1e7 (7-dec). 9_000_000 → 9000 bps. */
const BLEND_FACTOR_SCALAR_PER_BPS = 1000;

function reserveToSnapshot(asset: string, reserve: Reserve): ReserveSnapshot {
  const cfg = reserve.config;
  return {
    asset,
    index: cfg.index,
    decimals: cfg.decimals,
    // Canlı doğrulandı 2026-06-02: pool get_reserve XLM → c_factor=9_000_000 (raw,
    // 7-dec scalar). Bps (10000-scale) için /1000 gerek.
    cFactorBps: Math.round(cfg.c_factor / BLEND_FACTOR_SCALAR_PER_BPS),
    lFactorBps: Math.round(cfg.l_factor / BLEND_FACTOR_SCALAR_PER_BPS),
    scalar: 10n ** BigInt(cfg.decimals),
  };
}

export async function loadPool(): Promise<Pool> {
  // Helios testnet pool V2 (AUDIT §1 — TestnetV2 adresi)
  const network = getBlendNetwork();
  const { blend } = getAddresses();
  return PoolV2.load(network, blend.pool);
}

/** Snapshot — reserves listesi (UI'ya açık). */
export async function loadPoolReserves(): Promise<ReserveSnapshot[]> {
  const pool = await loadPool();
  const snapshots: ReserveSnapshot[] = [];
  for (const [asset, reserve] of pool.reserves.entries()) {
    snapshots.push(reserveToSnapshot(asset, reserve));
  }
  return snapshots;
}

export interface UserPositionSnapshot {
  user: string;
  /** Reserve index → raw collateral (b-token balance). */
  collateral: Record<number, bigint>;
  /** Reserve index → raw debt (d-token balance). */
  liabilities: Record<number, bigint>;
  /** Pozisyon var mı? */
  hasPosition: boolean;
}

export async function loadUserPosition(userAddress: string): Promise<UserPositionSnapshot> {
  const { blend } = getAddresses();
  const network = getBlendNetwork();
  const pool = await loadPool();
  const poolUser: PoolUser = await PoolUser.load(network, blend.pool, pool, userAddress);

  const collateral: Record<number, bigint> = {};
  const liabilities: Record<number, bigint> = {};
  for (const [idx, value] of poolUser.positions.collateral.entries()) {
    collateral[idx] = value;
  }
  for (const [idx, value] of poolUser.positions.liabilities.entries()) {
    liabilities[idx] = value;
  }
  return {
    user: userAddress,
    collateral,
    liabilities,
    hasPosition: Object.keys(collateral).length > 0 || Object.keys(liabilities).length > 0,
  };
}

/** Off-chain HF — c_factor/l_factor zinciri Helios `hf` modülünden. */
export interface HfComputation {
  hfBps: bigint;
  band: HfBand;
  totalCollateralBase: bigint;
  totalLiabilityBase: bigint;
}

/**
 * Pozisyon + reserves + (asset → base_price) → HF.
 *
 * `prices` reserve `asset` (SAC adresi) → base price (i128).
 * MVP single-asset: tüm fiyatlar aynı decimals normalize edilmiş varsayılır.
 */
export function computeUserHfBps(
  position: UserPositionSnapshot,
  reserves: ReserveSnapshot[],
  prices: Map<string, bigint>,
): HfComputation | null {
  let totalCollateralBase = 0n;
  let totalLiabilityBase = 0n;
  for (const r of reserves) {
    const price = prices.get(r.asset);
    if (price == null) continue;
    const rawColl = position.collateral[r.index] ?? 0n;
    const rawLiab = position.liabilities[r.index] ?? 0n;
    if (rawColl > 0n) {
      const eff = effectiveCollateral(rawColl, r.cFactorBps);
      totalCollateralBase += eff * price;
    }
    if (rawLiab > 0n) {
      const eff = effectiveLiability(rawLiab, r.lFactorBps);
      totalLiabilityBase += eff * price;
    }
  }
  if (totalLiabilityBase === 0n) return null;
  const hfBps = healthFactorBps(totalCollateralBase, totalLiabilityBase);
  return { hfBps, band: riskBand(hfBps), totalCollateralBase, totalLiabilityBase };
}
