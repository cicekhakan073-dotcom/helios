/**
 * Cron taraması — opt-in vermiş kullanıcılar için HF okuma + rebalance tetik.
 *
 * Akış (her user için):
 *  1. `get_opt_in(user)` → active=false ise skip.
 *  2. Blend pozisyonu (underlying) + reserve config + pool oracle fiyatı.
 *  3. Effective HF (Helios SDK math).
 *  4. HF >= trigger → NoActionNeeded.
 *  5. HF < trigger → deleverage miktarını hesapla
 *     (same-asset MVP, max_deleverage cap içinde, hedef target_hf).
 *  6. Lock al → rebalance tx → log yaz → lock bırak.
 *
 * Kontrat NİHAİ guard: ensure_keeper + max_deleverage cap + min HF; off-chain
 * sayım yanlış olsa bile pool kabul etmez.
 */

import {
  ASSETS,
  ASSET_META,
  computeUserHfBps,
  effectiveCollateral,
  effectiveLiability,
  fetchPoolOraclePrice,
  getOptIn,
  hfBpsToFloat,
  loadPoolReserves,
  loadUserPosition,
  sacAddressFor,
  type AssetId,
} from "@helios/sdk";

import {
  acquireRebalanceLock,
  listOptInCandidates,
  releaseRebalanceLock,
  writeRebalanceLog,
  type RebalanceLogEntry,
} from "./optin-index";
import { rebalanceWithKeeper, type RebalanceResult } from "./rebalance-tx";

export interface ScanSummary {
  scanned: number;
  triggered: number;
  rebalanced: number;
  noAction: number;
  errors: number;
  entries: RebalanceLogEntry[];
}

const CLOSE_BUFFER_BPS = 200n; // %2 tampon (PROMPT 23-FIX dersi)

interface UserScanCtx {
  user: string;
  assetId: AssetId;
  reserveAsset: string;
  decimals: number;
  collateralRaw: bigint;
  debtRaw: bigint;
  cFactorBps: number;
  lFactorBps: number;
  priceI128: bigint;
  hfFloat: number;
  triggerHfBps: number;
  targetHfBps: number;
  maxDeleverageBps: number;
}

function pickActiveAsset(
  reserves: Awaited<ReturnType<typeof loadPoolReserves>>,
  collateral: Record<number, bigint>,
  debt: Record<number, bigint>,
): { assetId: AssetId; reserve: (typeof reserves)[number]; c: bigint; d: bigint } | null {
  for (const r of reserves) {
    const c = collateral[r.index] ?? 0n;
    const d = debt[r.index] ?? 0n;
    if (c === 0n && d === 0n) continue;
    const assetId = ASSETS.find((id) => sacAddressFor(id) === r.asset);
    if (!assetId) continue;
    return { assetId, reserve: r, c, d };
  }
  return null;
}

/**
 * Same-asset MVP deleverage çözümü.
 *
 * HF formülü: HF = (C × c) / (D / l) = C × c × l / D
 * Δd debt kapatınca + Δc=Δd collateral çekince (aynı asset):
 *   HF' = (C-Δd) × c × l / (D-Δd)
 * HF' = target için:
 *   (C-Δd) × c × l = target × (D-Δd)
 *   Δd = (C × c × l - target × D) / (c × l - target)
 *
 * Δd > max_deleverage_cap olursa cap'e indir.
 */
function computeDeleverage(
  collateralUnderlying: bigint,
  debtUnderlying: bigint,
  cFactorBps: number,
  lFactorBps: number,
  targetHfBps: number,
  maxDeleverageBps: number,
): { debtToClose: bigint; collateralToWithdraw: bigint } | null {
  if (debtUnderlying <= 0n || collateralUnderlying <= 0n) return null;
  // Tüm hesap bps cinsinden, integer aritmetiği için: c·l = cFactorBps×lFactorBps/10000^2.
  // Δd = (C·c·l - target·D) / (c·l - target). target_hf bps × 100 → HF scale = 100.
  // HF scale: hfBpsToFloat(150n) = 1.50 → 150/100. targetHfBps zaten ×100 ölçek (130=1.30).
  const cl =
    (BigInt(cFactorBps) * BigInt(lFactorBps) * BigInt(100)) / BigInt(10_000) / BigInt(10_000); // result has scale "× 100" to match HF_SCALE
  // cl unit'i: c·l × 100 (yani 0.81 → 81)
  const target = BigInt(targetHfBps); // HF×100
  const denom = cl - target;
  if (denom === 0n) return null;
  // Δd işareti:
  //  - HF < target (rebalance gereken durum): num/denom > 0 olmalı (denom negatif, num negatif → pozitif).
  let deltaD: bigint;
  if (denom < 0n) {
    deltaD = (collateralUnderlying * cl - target * debtUnderlying) / denom;
  } else {
    // denom > 0 → HF zaten target'in üstünde; deleverage gerekmez
    return null;
  }
  if (deltaD <= 0n) return null;
  const cap = (debtUnderlying * BigInt(maxDeleverageBps)) / 10_000n;
  if (deltaD > cap) deltaD = cap;
  // Buffer ile + ufak ekstra (Blend cap'ler kalan bakiyeye)
  const debtClose = (deltaD * (10_000n + CLOSE_BUFFER_BPS)) / 10_000n;
  // Same-asset: collateral_to_withdraw == debt_to_close (net çekiş 0 + bakiye delta'sı)
  const cappedDebt = debtClose > debtUnderlying ? debtUnderlying : debtClose;
  const cappedColl = cappedDebt > collateralUnderlying ? collateralUnderlying : cappedDebt;
  return { debtToClose: cappedDebt, collateralToWithdraw: cappedColl };
}

async function buildUserCtx(user: string): Promise<UserScanCtx | { skip: string } | null> {
  const opt = await getOptIn(user);
  if (!opt) return { skip: "opt-in okunamadı (kontrat yanıt vermedi)" };
  if (!opt.active) return { skip: "opt-in active=false" };

  const reserves = await loadPoolReserves();
  const position = await loadUserPosition(user);
  if (!position.hasPosition) return { skip: "pozisyon yok" };

  const active = pickActiveAsset(reserves, position.collateral, position.liabilities);
  if (!active) return { skip: "aktif reserve eşleştirilemedi" };

  const oracle = await fetchPoolOraclePrice(active.assetId);
  if (!oracle) return { skip: "oracle fiyatı yok" };

  const prices = new Map<string, bigint>();
  prices.set(active.reserve.asset, oracle.price);
  const hf = computeUserHfBps(position, reserves, prices);
  if (!hf) return { skip: "HF hesaplanamadı" };

  return {
    user,
    assetId: active.assetId,
    reserveAsset: active.reserve.asset,
    decimals: ASSET_META[active.assetId].decimals,
    collateralRaw: active.c,
    debtRaw: active.d,
    cFactorBps: active.reserve.cFactorBps,
    lFactorBps: active.reserve.lFactorBps,
    priceI128: oracle.price,
    hfFloat: hfBpsToFloat(hf.hfBps),
    triggerHfBps: opt.triggerHfBps,
    targetHfBps: opt.targetHfBps,
    maxDeleverageBps: opt.maxDeleverageBps,
  };
}

export async function runScan(keeperPublicKey: string, keeperSecret: string): Promise<ScanSummary> {
  const candidates = await listOptInCandidates();
  const summary: ScanSummary = {
    scanned: candidates.length,
    triggered: 0,
    rebalanced: 0,
    noAction: 0,
    errors: 0,
    entries: [],
  };

  for (const user of candidates) {
    const ctxOrSkip = await buildUserCtx(user).catch((err: unknown): { skip: string } => ({
      skip: err instanceof Error ? err.message : "scan hatası",
    }));
    if (!ctxOrSkip) continue;
    if ("skip" in ctxOrSkip) {
      summary.entries.push({ user, ts: Date.now(), ok: true, reason: ctxOrSkip.skip });
      summary.noAction++;
      continue;
    }
    const ctx = ctxOrSkip;
    const hfBpsCurrent = Math.round(ctx.hfFloat * 100);
    if (hfBpsCurrent >= ctx.triggerHfBps) {
      summary.entries.push({
        user,
        ts: Date.now(),
        ok: true,
        reason: `HF ${ctx.hfFloat.toFixed(2)} ≥ trigger ${(ctx.triggerHfBps / 100).toFixed(2)} (NoActionNeeded)`,
        preHf: ctx.hfFloat,
      });
      summary.noAction++;
      continue;
    }
    summary.triggered++;

    // Effective base'leri compute (off-chain doğrulama; kontrat zaten kendi okur)
    const effColl = effectiveCollateral(ctx.collateralRaw, ctx.cFactorBps);
    const effLiab = effectiveLiability(ctx.debtRaw, ctx.lFactorBps);
    void effColl;
    void effLiab;

    const dlv = computeDeleverage(
      ctx.collateralRaw,
      ctx.debtRaw,
      ctx.cFactorBps,
      ctx.lFactorBps,
      ctx.targetHfBps,
      ctx.maxDeleverageBps,
    );
    if (!dlv) {
      summary.entries.push({
        user,
        ts: Date.now(),
        ok: false,
        reason: "Deleverage hesabı geçersiz (denom=0 veya delta≤0)",
        preHf: ctx.hfFloat,
      });
      summary.errors++;
      continue;
    }

    const lock = await acquireRebalanceLock(user);
    if (!lock.ok) {
      summary.entries.push({
        user,
        ts: Date.now(),
        ok: true,
        reason: "lock bulundu — başka çalıştırma sürüyor, skip",
        preHf: ctx.hfFloat,
      });
      summary.noAction++;
      continue;
    }

    let res: RebalanceResult;
    try {
      res = await rebalanceWithKeeper(
        {
          caller: keeperPublicKey,
          user,
          assetSac: ctx.reserveAsset,
          debtAmount: dlv.debtToClose,
          collateralAmount: dlv.collateralToWithdraw,
          assetsForHf: [ctx.reserveAsset],
          pricesForHf: [ctx.priceI128],
        },
        keeperSecret,
      );
    } finally {
      if (lock.lockId) await releaseRebalanceLock(user, lock.lockId);
    }

    if (res.ok) {
      summary.rebalanced++;
      summary.entries.push({
        user,
        ts: Date.now(),
        ok: true,
        ...(res.hash ? { txHash: res.hash } : {}),
        reason: `rebalanced (debt=${dlv.debtToClose}, coll=${dlv.collateralToWithdraw})`,
        preHf: ctx.hfFloat,
      });
    } else {
      summary.errors++;
      summary.entries.push({
        user,
        ts: Date.now(),
        ok: false,
        ...(res.hash ? { txHash: res.hash } : {}),
        ...(res.reason ? { reason: res.reason } : {}),
        preHf: ctx.hfFloat,
      });
    }
  }

  for (const entry of summary.entries) {
    await writeRebalanceLog(entry);
  }
  return summary;
}
