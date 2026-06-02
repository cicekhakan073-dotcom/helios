/**
 * Pool oracle (CAZOKR2Y) — Blend pool'un kendi fiyat kaynağı.
 *
 * AUDIT 2026-06-02 §6.1 + DOĞRULAMA 2026-06-02 (ROADMAP-CHANGELOG):
 *   - Pool oracle SEP-40 Asset enum'unu kullanır; 4 reserve için doğru sorgu
 *     `Stellar(SAC_address)` variantıdır (Other(symbol) DEĞİL).
 *   - HF tutarlılığı için Helios fiyat okumaları BURAYA gider — Blend'in iç
 *     HF kaynağıyla birebir aynı oracle.
 *   - decimals = 7, base = USD (canlı doğrulandı 2026-06-02).
 *   - wBTC/wETH `lastprice` = null (oracle publish etmiyor); UI graceful
 *     "fiyat akışı yok" göstermeli.
 */

import { Address, xdr } from "@stellar/stellar-sdk";

import { getAddresses, sacAddressFor, type AssetId } from "../addresses";
import { simulateView } from "../rpc/simulate";

import { ORACLE_STALENESS_HARD_SEC, ORACLE_STALENESS_WARN_SEC, type OraclePriceReading } from "./client";
import { parsePriceData, type PriceData } from "./scval";


/** `Asset::Stellar(addr)` ScVal — pool oracle bunu bekler. */
function stellarSacAsset(sacAddress: string): xdr.ScVal {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("Stellar"),
    Address.fromString(sacAddress).toScVal(),
  ]);
}

/** `pool_oracle.lastprice(Stellar(sac))` — null = fiyat yok. */
export async function fetchPoolOracleLastPrice(assetId: AssetId): Promise<PriceData | null> {
  const oracle = getAddresses().blend.poolOracle;
  const sac = sacAddressFor(assetId);
  const res = await simulateView<unknown>(oracle, "lastprice", [stellarSacAsset(sac)]);
  if (!res.ok) return null;
  return parsePriceData(res.value);
}

let cachedDecimals: number | null = null;
/** `pool_oracle.decimals()` — feed başına aynı, in-memory cache OK. */
export async function fetchPoolOracleDecimals(): Promise<number | null> {
  if (cachedDecimals !== null) return cachedDecimals;
  const oracle = getAddresses().blend.poolOracle;
  const res = await simulateView<unknown>(oracle, "decimals", []);
  if (!res.ok) return null;
  const v = typeof res.value === "number" ? res.value : typeof res.value === "bigint" ? Number(res.value) : null;
  if (v != null) cachedDecimals = v;
  return v;
}

/** UI için zenginleştirilmiş okuma — null = fiyat akışı yok (graceful). */
export async function fetchPoolOraclePrice(assetId: AssetId): Promise<OraclePriceReading | null> {
  const [price, decimals] = await Promise.all([
    fetchPoolOracleLastPrice(assetId),
    fetchPoolOracleDecimals(),
  ]);
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
