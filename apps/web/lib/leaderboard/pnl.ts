/**
 * Helios PnL helper — yalnız on-chain doğrulanabilir veriden türetilir.
 *
 * Same-asset MVP: collateral & debt aynı asset → fiyat hareketi her iki
 * tarafı eşit ölçekler. Net equity hareketi yalnız oracle fiyatı * net
 * collateral exposure'den gelir. Entry/spot oranı %değişimle çarpılır.
 *
 * tahmini · testnet etiketi UI'da zorunlu (yatırım tavsiyesi DEĞİL).
 */

import { ASSET_META, effectiveCollateral, effectiveLiability, type AssetId } from "@helios/sdk";

export interface PnlInputs {
  /** Underlying — Blend pozisyon snapshot'ı. */
  collateralUnderlying: bigint;
  debtUnderlying: bigint;
  /** Açılış oracle fiyatı i128 (7-dec). */
  entryPriceI128: bigint;
  /** Güncel oracle fiyatı i128 (7-dec). */
  spotPriceI128: bigint;
  /** Asset; reserve factor ve decimals için. */
  assetId: AssetId;
  cFactorBps: number;
  lFactorBps: number;
}

export interface PnlEstimate {
  /** Kuruşa kadar ölçeklendirilmiş equity (spot fiyatla) — underlying birim. */
  equityCurrent: bigint;
  /** Açılış equity. */
  equityEntry: bigint;
  /** Mutlak fark. */
  pnlAbsolute: bigint;
  /** Yüzde değişim (×10000 ölçek, bps benzeri). */
  pnlBps: number;
}

/**
 * Same-asset MVP equity = effective_collateral × (1 + Δp) − effective_liability
 * Spot vs entry için ayrı equity hesaplanır; PnL = current - entry.
 *
 * Fiyat oranı: spot / entry (her ikisi 7-dec; ölçek sadeleşir → BigInt int
 * div'i ile yaklaşık; bps düzeyinde yeterli).
 */
export function computePnl(input: PnlInputs): PnlEstimate | null {
  if (input.entryPriceI128 <= 0n) return null;
  if (input.collateralUnderlying === 0n) return null;
  const effColl = effectiveCollateral(input.collateralUnderlying, input.cFactorBps);
  const effLiab =
    input.debtUnderlying > 0n ? effectiveLiability(input.debtUnderlying, input.lFactorBps) : 0n;
  // priceRatioBps = spot/entry × 10000
  const priceRatioBps = Number((input.spotPriceI128 * 10_000n) / input.entryPriceI128);
  const currentCollateral = (effColl * BigInt(priceRatioBps)) / 10_000n;
  const entryCollateral = effColl; // entry price ratio = 1
  const equityCurrent = currentCollateral > effLiab ? currentCollateral - effLiab : 0n;
  const equityEntry = entryCollateral > effLiab ? entryCollateral - effLiab : 0n;
  const pnlAbsolute = equityCurrent - equityEntry;
  let pnlBps = 0;
  if (equityEntry > 0n) {
    pnlBps = Number((pnlAbsolute * 10_000n) / equityEntry);
  }
  void ASSET_META[input.assetId];
  return { equityCurrent, equityEntry, pnlAbsolute, pnlBps };
}
