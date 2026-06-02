/**
 * SEP-40 Reflector — Asset enum + PriceData ScVal serileştirme.
 *
 * Reflector kontratı `Asset::Stellar(Address)` ve `Asset::Other(Symbol)`
 * variant'larını alır. `lastprice(asset)` çağrısı için ScVal kurmamız gerek;
 * `scValToNative` dönüş PriceData'sını JS object'e çevirir.
 */

import { Address, xdr } from "@stellar/stellar-sdk";

import { ASSET_META, type AssetId } from "../addresses";

/** Asset::Stellar(addr) ScVal */
function stellarAsset(sacAddress: string): xdr.ScVal {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("Stellar"),
    Address.fromString(sacAddress).toScVal(),
  ]);
}

/** Asset::Other(symbol) ScVal */
function otherAsset(symbol: string): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Other"), xdr.ScVal.scvSymbol(symbol)]);
}

/**
 * Helios `AssetId`'sini Reflector `Asset` ScVal'ına çevir.
 * SAC adresleri PROMPT 24'te mock-token deploy'undan gelir; o güne kadar
 * `Stellar(_)` variant'lar için fallback adres veriyoruz (testnet'te
 * gerçek RPC çağrısı PROMPT 24 sonrası canlı sonuç verir).
 */
export function assetToScVal(assetId: AssetId): xdr.ScVal {
  const meta = ASSET_META[assetId];
  if (meta.reflector.kind === "Stellar") {
    const envKey = meta.reflector.sacAddressEnvKey;
    const sac =
      typeof process !== "undefined" && process.env
        ? process.env[envKey] ?? ""
        : "";
    if (!sac) {
      throw new Error(
        `Reflector "Stellar(...)" variant için ${envKey} eksik (PROMPT 24 faucet deploy bekleniyor)`,
      );
    }
    return stellarAsset(sac);
  }
  return otherAsset(meta.reflector.symbol);
}

/** Reflector `PriceData { price: i128, timestamp: u64 }` JS karşılığı. */
export interface PriceData {
  price: bigint;
  timestamp: bigint;
}

/** scValToNative dönüşü `{ price: BigInt, timestamp: BigInt }` veya `Option::None`. */
export function parsePriceData(raw: unknown): PriceData | null {
  if (raw == null) return null;
  if (typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const price = obj["price"];
  const timestamp = obj["timestamp"];
  if (typeof price !== "bigint" || typeof timestamp !== "bigint") return null;
  return { price, timestamp };
}
