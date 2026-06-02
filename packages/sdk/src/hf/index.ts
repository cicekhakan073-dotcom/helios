/**
 * Helios Health Factor — TS aynası (Rust `shared::hf` ile birebir).
 *
 * **Tek doğruluk kaynağı drift testi:** `src/hf/index.test.ts` aynı girdilerle
 * Rust unit testlerinin sonuçlarını üretir. Sabit değişirse her iki dilde de
 * aynı anda güncellenmelidir.
 *
 * Sayısal eşikler design-system.md §1.4 ve `packages/ui/src/tokens.ts` ile
 * de aynalanır.
 */

// ===== Eşikler (Rust HF_*_BPS sabitleriyle birebir) =====

export const HF_HEALTHY_MIN_BPS = 150n; // 1.50
export const HF_CAUTION_MIN_BPS = 120n; // 1.20
export const HF_LIQUIDATION_BPS = 100n; // 1.00

export const BPS_DENOM = 10_000n;
export const HF_SCALE = 100n;

// ===== Risk band =====

export type HfBand = "healthy" | "caution" | "danger" | "liquidatable";

export function riskBand(hfBps: bigint): HfBand {
  if (hfBps < HF_LIQUIDATION_BPS) return "liquidatable";
  if (hfBps < HF_CAUTION_MIN_BPS) return "danger";
  if (hfBps < HF_HEALTHY_MIN_BPS) return "caution";
  return "healthy";
}

// ===== Saf math =====

export class HfError extends Error {
  public override readonly name = "HfError";
  constructor(public readonly code: "INVALID_PARAMS" | "ZERO_DEBT" | "OVERFLOW", message: string) {
    super(message);
  }
}

/** Raw collateral → effective (c_factor discount). c_factor_bps ≤ 10_000. */
export function effectiveCollateral(raw: bigint, cFactorBps: number): bigint {
  if (cFactorBps > 10_000) throw new HfError("INVALID_PARAMS", "c_factor > 1.0 anlamsız");
  return (raw * BigInt(cFactorBps)) / BPS_DENOM;
}

/** Raw liability → effective (l_factor inflate). l_factor_bps in (0, 10_000]. */
export function effectiveLiability(raw: bigint, lFactorBps: number): bigint {
  if (lFactorBps === 0) throw new HfError("INVALID_PARAMS", "l_factor sıfır");
  if (lFactorBps > 10_000) throw new HfError("INVALID_PARAMS", "l_factor > 1.0 anlamsız");
  return (raw * BPS_DENOM) / BigInt(lFactorBps);
}

/** HF (×100 ölçek). liability=0 → `ZERO_DEBT`. */
export function healthFactorBps(collateralBase: bigint, liabilityBase: bigint): bigint {
  if (collateralBase < 0n || liabilityBase < 0n) {
    throw new HfError("INVALID_PARAMS", "negatif base");
  }
  if (liabilityBase === 0n) throw new HfError("ZERO_DEBT", "borç sıfır");
  return (collateralBase * HF_SCALE) / liabilityBase;
}

/** Collateral fiyat şoku altında HF. `priceDeltaBps`: -2000 = -%20. */
export function projectHfBps(
  collateralBase: bigint,
  liabilityBase: bigint,
  priceDeltaBps: number,
): bigint {
  if (liabilityBase === 0n) throw new HfError("ZERO_DEBT", "borç sıfır");
  const multiplier = BPS_DENOM + BigInt(priceDeltaBps);
  if (multiplier <= 0n) return 0n;
  const newCollateral = (collateralBase * multiplier) / BPS_DENOM;
  return healthFactorBps(newCollateral, liabilityBase);
}

/** HF=1 olduğu fiyat (current_price × liability / collateral). */
export function liquidationPrice(
  currentPrice: bigint,
  collateralBase: bigint,
  liabilityBase: bigint,
): bigint {
  if (currentPrice < 0n || collateralBase < 0n || liabilityBase < 0n) {
    throw new HfError("INVALID_PARAMS", "negatif input");
  }
  if (collateralBase === 0n) throw new HfError("INVALID_PARAMS", "collateral sıfır");
  if (liabilityBase === 0n) return 0n;
  return (currentPrice * liabilityBase) / collateralBase;
}

/** UI'da `1.36` gibi gösterim. */
export function hfBpsToFloat(hfBps: bigint): number {
  return Number(hfBps) / Number(HF_SCALE);
}
