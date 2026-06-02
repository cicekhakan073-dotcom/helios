/**
 * Reflector lastprice / decimals client'ı.
 *
 * AUDIT §1.6 — her fiyat okuması staleness check geçer (UI/UX katmanı).
 * `lastprice` Option olduğu için `null` değer dönebilir; UI bunu "Unavailable"
 * gösterir.
 */

import { getAddresses, type AssetId, ASSET_META } from "../addresses";
import { simulateView } from "../rpc/simulate";

import { assetToScVal, parsePriceData, type PriceData } from "./scval";

/** AUDIT §1.6 — UI guard sabitleri (saniye). */
export const ORACLE_STALENESS_WARN_SEC = 5 * 60;
export const ORACLE_STALENESS_HARD_SEC = 10 * 60;

export interface OraclePriceReading {
  asset: AssetId;
  /** Reflector lastprice değeri (decimals'a göre ölçeklenmemiş). */
  price: bigint;
  /** Decimals (Reflector decimals() — feed başına aynı). */
  decimals: number;
  /** Oracle güncellemesi (unix sec). */
  timestamp: bigint;
  /** UI hesaplaması: `now − timestamp` (sn). */
  ageSeconds: number;
  /** AUDIT §1.6 — UI "stale" rozet ya da işlem engelleme. */
  freshness: "fresh" | "warn" | "stale";
}

function feedAddressFor(assetId: AssetId): string {
  const meta = ASSET_META[assetId];
  const { reflector } = getAddresses();
  return meta.feed === "stellarDex" ? reflector.stellarDex : reflector.externalCexDex;
}

/** `feedAddress.lastprice(asset)` simulate'i; `null` = veri yok. */
export async function fetchLastPrice(assetId: AssetId): Promise<PriceData | null> {
  const feed = feedAddressFor(assetId);
  const arg = assetToScVal(assetId);
  const res = await simulateView<unknown>(feed, "lastprice", [arg]);
  if (!res.ok) return null;
  return parsePriceData(res.value);
}

/** `feedAddress.decimals()` simulate'i. */
export async function fetchDecimals(assetId: AssetId): Promise<number | null> {
  const feed = feedAddressFor(assetId);
  const res = await simulateView<unknown>(feed, "decimals", []);
  if (!res.ok) return null;
  if (typeof res.value === "number") return res.value;
  if (typeof res.value === "bigint") return Number(res.value);
  return null;
}

/** UI'nın tüketeceği zenginleştirilmiş okuma. */
export async function fetchOraclePrice(assetId: AssetId): Promise<OraclePriceReading | null> {
  const [price, decimals] = await Promise.all([fetchLastPrice(assetId), fetchDecimals(assetId)]);
  if (!price || decimals == null) return null;
  const now = Math.floor(Date.now() / 1000);
  const age = now - Number(price.timestamp);
  const freshness: OraclePriceReading["freshness"] =
    age <= ORACLE_STALENESS_WARN_SEC ? "fresh" : age <= ORACLE_STALENESS_HARD_SEC ? "warn" : "stale";
  return {
    asset: assetId,
    price: price.price,
    decimals,
    timestamp: price.timestamp,
    ageSeconds: age,
    freshness,
  };
}
