/**
 * Helios AI Copilot — read-only tool tanımları (AI SDK v6).
 *
 * Tüm tool'lar:
 *  - YALNIZ okuma — hiçbiri tx build/sign/send etmez.
 *  - SDK server-side fetch helper'larını sarar (no React hook).
 *  - getUserPosition `session.sub`'a kapatılır; model rastgele adres okuyamaz
 *    (güvenlik: PROMPT 25 §5).
 *  - Dönüşler JSON-serializable; bigint → string. Model sayıyı parse edip
 *    yorumlar.
 *
 * AUDIT §3.5 — her tool tanımına `providerOptions.anthropic.cacheControl`
 * route'tan iliştirilir; burada tool TANIMI sabit (cache-friendly).
 */

import {
  ASSET_META,
  computeUserHfBps,
  effectiveCollateral,
  effectiveLiability,
  fetchPoolOraclePrice,
  healthFactorBps,
  hfBpsToFloat,
  liquidationPrice as calcLiquidationPrice,
  loadPoolReserves,
  loadUserPosition,
  projectHfBps,
  riskBand,
  sacAddressFor,
  type AssetId,
} from "@helios/sdk";
import { tool } from "ai";
import { z } from "zod";

const ASSET_ENUM = z.enum(["XLM", "USDC", "wBTC", "wETH"]);

function bigToString<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === "bigint") out[k] = v.toString();
    else if (v && typeof v === "object" && !Array.isArray(v))
      out[k] = bigToString(v as Record<string, unknown>);
    else out[k] = v;
  }
  return out;
}

/** Belirli bir asset için pool oracle (CAZOKR2Y) okumasının tool sarmalayıcısı. */
const getOraclePrice = tool({
  description:
    "Blend pool'un kendi oracle'ından (CAZOKR2Y) verilen Helios asset'i için anlık lastprice + freshness döner. Read-only.",
  inputSchema: z.object({
    asset: ASSET_ENUM.describe("Helios asset id: XLM | USDC | wBTC | wETH"),
  }),
  execute: async ({ asset }: { asset: AssetId }) => {
    const reading = await fetchPoolOraclePrice(asset);
    if (!reading) {
      return {
        asset,
        ok: false,
        reason:
          "Oracle bu asset için lastprice döndürmedi. wBTC/wETH testnet'te publish edilmiyor olabilir.",
      };
    }
    return {
      asset,
      ok: true,
      // 7-dec scalar (pool oracle decimals canlı doğrulandı 2026-06-02).
      priceUsd: Number(reading.price) / 10 ** reading.decimals,
      priceRaw: reading.price.toString(),
      decimals: reading.decimals,
      timestamp: Number(reading.timestamp),
      ageSeconds: reading.ageSeconds,
      freshness: reading.freshness,
      sacAddress: sacAddressFor(asset),
    };
  },
});

/** session.sub adresi için Blend pozisyon snapshot'ı + computed HF. */
function buildGetUserPosition(sessionAddress: string) {
  return tool({
    description:
      "Oturum sahibinin (yalnız) Blend pozisyonunu underlying birimlerle döner: collateral, debt, HF, risk bandı. Model başka adres okuyamaz. Read-only.",
    inputSchema: z.object({}),
    execute: async () => {
      const [reserves, position] = await Promise.all([
        loadPoolReserves(),
        loadUserPosition(sessionAddress),
      ]);
      if (!position.hasPosition) {
        return { ok: true, address: sessionAddress, hasPosition: false };
      }
      // Tek non-zero reserve bul (single-asset MVP).
      let activeAssetId: AssetId | null = null;
      let activeReserveIndex: number | null = null;
      let collateralRaw = 0n;
      let debtRaw = 0n;
      for (const r of reserves) {
        const c = position.collateral[r.index] ?? 0n;
        const d = position.liabilities[r.index] ?? 0n;
        if (c === 0n && d === 0n) continue;
        const assetId = (["XLM", "USDC", "wBTC", "wETH"] as const).find(
          (id) => sacAddressFor(id) === r.asset,
        );
        if (!assetId) continue;
        activeAssetId = assetId;
        activeReserveIndex = r.index;
        collateralRaw = c;
        debtRaw = d;
        break;
      }
      if (!activeAssetId || activeReserveIndex == null) {
        return { ok: true, address: sessionAddress, hasPosition: false };
      }
      const oracle = await fetchPoolOraclePrice(activeAssetId);
      const reserveSnap = reserves.find((r) => r.index === activeReserveIndex)!;
      const prices = new Map<string, bigint>();
      if (oracle) prices.set(reserveSnap.asset, oracle.price);
      const hf = computeUserHfBps(position, reserves, prices);
      const hfFloat = hf ? hfBpsToFloat(hf.hfBps) : null;
      const decimals = ASSET_META[activeAssetId].decimals;
      const scale = 10n ** BigInt(decimals);
      const leverageBps =
        collateralRaw > debtRaw && collateralRaw - debtRaw > 0n
          ? Number((collateralRaw * 10000n) / (collateralRaw - debtRaw))
          : null;
      return {
        ok: true,
        address: sessionAddress,
        hasPosition: true,
        asset: activeAssetId,
        collateralUnderlying: Number(collateralRaw) / Number(scale),
        debtUnderlying: Number(debtRaw) / Number(scale),
        collateralRaw: collateralRaw.toString(),
        debtRaw: debtRaw.toString(),
        decimals,
        hfFloat,
        hfBand: hf ? hf.band : null,
        leverageBps,
        leverageX: leverageBps != null ? leverageBps / 100 : null,
        oracle: oracle
          ? {
              priceUsd: Number(oracle.price) / 10 ** oracle.decimals,
              freshness: oracle.freshness,
              ageSeconds: oracle.ageSeconds,
            }
          : null,
      };
    },
  });
}

/** Asset reserve config (c/l factor + rate'ler) + tahmini APY etiketi. */
const getPoolParams = tool({
  description:
    "Verilen asset için Blend reserve config'ini döner: c_factor/l_factor (bps), decimals. Tahmini APY etiketi 'testnet'. Read-only.",
  inputSchema: z.object({
    asset: ASSET_ENUM,
  }),
  execute: async ({ asset }: { asset: AssetId }) => {
    const reserves = await loadPoolReserves();
    const sac = sacAddressFor(asset);
    const reserve = reserves.find((r) => r.asset === sac);
    if (!reserve) {
      return { ok: false, asset, reason: "Reserve bulunamadı (pool config değişmiş olabilir)." };
    }
    return {
      ok: true,
      asset,
      cFactorBps: reserve.cFactorBps,
      lFactorBps: reserve.lFactorBps,
      decimals: reserve.decimals,
      reserveIndex: reserve.index,
      sacAddress: sac,
      apyEstimateLabel: "tahmini · testnet (gerçek b_rate/d_rate değişkenliği yansımıyor)",
    };
  },
});

/** Verilen principal + leverageBps için HF / likidasyon projeksiyonu. */
const simulateLeverage = tool({
  description:
    "Verilen asset + principal (underlying, decimals'a göre tam birim) + leverageBps için HF ve likidasyon fiyatını canlı oracle ile hesaplar. Hiçbir tx tetiklemez.",
  inputSchema: z.object({
    asset: ASSET_ENUM,
    principal: z
      .number()
      .positive()
      .describe("Asset native decimals'a göre tam birim, örn. 10.0 XLM."),
    leverageBps: z
      .number()
      .int()
      .min(100)
      .max(500)
      .describe("100 = 1x; 200 = 2x; üst sınır 500 mantıksal; UI cap'i 200 (XLM-bound)."),
  }),
  execute: async ({
    asset,
    principal,
    leverageBps,
  }: {
    asset: AssetId;
    principal: number;
    leverageBps: number;
  }) => {
    const meta = ASSET_META[asset];
    const reserves = await loadPoolReserves();
    const oracle = await fetchPoolOraclePrice(asset);
    const reserve = reserves.find((r) => r.asset === sacAddressFor(asset));
    if (!reserve) return { ok: false, reason: "Reserve bulunamadı." };
    if (!oracle)
      return { ok: false, reason: "Oracle fiyatı yok — bu asset projeksiyona uygun değil." };

    const scale = 10n ** BigInt(meta.decimals);
    const principalRaw = BigInt(Math.round(principal * Number(scale)));
    const flashRaw = (principalRaw * BigInt(leverageBps - 100)) / 100n;
    const totalCollateralRaw = principalRaw + flashRaw;
    const borrowRaw = flashRaw;
    if (borrowRaw === 0n) {
      return {
        ok: true,
        asset,
        principal,
        leverageBps,
        totalCollateralUnderlying: Number(totalCollateralRaw) / Number(scale),
        borrowUnderlying: 0,
        hfFloat: null,
        hfBand: null,
        liquidationPriceUsd: null,
        notes: [
          "leverage 1× — borç yok, HF tanımsız (∞).",
          "Yine de oracle riski ve unaudited uyarısı geçerli.",
        ],
      };
    }
    const effColl = effectiveCollateral(totalCollateralRaw, reserve.cFactorBps);
    const effLiab = effectiveLiability(borrowRaw, reserve.lFactorBps);
    const hf = healthFactorBps(effColl, effLiab);
    const hfFloat = hfBpsToFloat(hf);
    const band = riskBand(hf);
    const liqPrice = calcLiquidationPrice(oracle.price, effColl, effLiab);
    // -10..-50% şok projeksiyonu — kaba risk picture.
    const shocks = [-10, -20, -30, -40, -50].map((pct) => ({
      shockPct: pct,
      hfFloat: hfBpsToFloat(projectHfBps(effColl, effLiab, pct * 100)),
    }));
    return {
      ok: true,
      asset,
      principal,
      leverageBps,
      cFactorBps: reserve.cFactorBps,
      lFactorBps: reserve.lFactorBps,
      totalCollateralUnderlying: Number(totalCollateralRaw) / Number(scale),
      borrowUnderlying: Number(borrowRaw) / Number(scale),
      hfFloat,
      hfBand: band,
      liquidationPriceUsd: Number(liqPrice) / 10 ** oracle.decimals,
      oracleFreshness: oracle.freshness,
      shockProjection: shocks,
      notes: [
        leverageBps > 200
          ? "UI cap 2× üzerinde — pool #1205 InvalidHf ile reddedebilir."
          : "UI cap 2× sınırı içinde.",
        "Same-asset MVP: collateral ve borç aynı asset → oracle hareketi her iki tarafı eşit oynatır.",
        "Oracle riski (§1.6): tek nokta hatası; staleness durumunda işlem açma.",
      ],
    };
  },
});

/** Route handler'da `tools: copilotTools(session.sub)` ile çağrılır. */
export function copilotTools(sessionAddress: string) {
  return {
    getOraclePrice,
    getUserPosition: buildGetUserPosition(sessionAddress),
    getPoolParams,
    simulateLeverage,
  };
}

// bigToString helper'ı dış ihtiyaç için public (route'ta sanitize'a gerek olursa).
export { bigToString };
