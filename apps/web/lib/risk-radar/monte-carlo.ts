/**
 * Helios Risk Radar — Monte Carlo motor (saf, sync; worker'dan çağrılır).
 *
 * HfProjectionChart varsayımıyla TUTARLI: same-asset MVP'de fiyat şoku yalnız
 * collateral'in birim değerini hareket ettirir, debt sabit notional. SDK
 * `projectHfBps(collateral, liability, priceDeltaBps)` ile birebir aynı
 * model — fan grafiği ile projection grafiği çelişmesin (PROMPT 27 kabul).
 *
 * Volatilite varsayımdır (gerçek feed yok, # DOĞRULA). UI'da etiketli sunulur.
 */

import { HF_LIQUIDATION_BPS, hfBpsToFloat, projectHfBps } from "@helios/sdk";

export interface MonteCarloInput {
  /** Effective collateral (already factored, base units — bigint string). */
  collateralBase: string;
  /** Effective liability (factored, base units — bigint string). */
  liabilityBase: string;
  /** Spot fiyatı i128 (7-dec) string. UI etiketleri için. */
  spotPriceI128: string;
  /** Horizon: gün sayısı (örn. 30). */
  horizonDays: number;
  /** Path sayısı (örn. 5000). */
  paths: number;
  /** Yıllık vol bps (örn. 8000 → %80). Varsayımdır (UI etiketler). */
  annualVolBps: number;
  /** Yıllık sürüklenme (drift) bps. Genelde 0 — risk-neutral. */
  driftBps: number;
  /** Leverage grid (heatmap için): bps dizisi. */
  leverageGridBps?: number[];
  /** Şok grid (heatmap için): % cinsinden, örn. [-50, -25, 0, 25, 50]. */
  shockGridPct?: number[];
  /** Tohum (deterministik dev). Boşsa Math.random. */
  seed?: number;
}

export interface FanPoint {
  /** 0..horizonDays. */
  day: number;
  hfP10: number;
  hfP50: number;
  hfP90: number;
  /** Bu güne kadar likidasyon kümülatif olasılığı (0..1). */
  cumLiqProb: number;
  /** Equity (= effective_collateral·(1+priceΔ) − effective_liability) — base units.
   *  Likide olmuş path'ler 0'a clamp edilir (negatif equity üretmesin). */
  equityP10: number;
  equityP50: number;
  equityP90: number;
}

export interface HeatmapCell {
  leverageBps: number;
  shockPct: number;
  hfFloat: number;
  band: "healthy" | "caution" | "danger" | "liquidatable";
}

export interface MonteCarloOutput {
  fan: FanPoint[];
  heatmap: HeatmapCell[];
  /** Final horizon cumLiqProb (toplam likidasyon olasılığı). */
  liqProb: number;
  /** Path başına ilk-likidasyon günü ortalaması (HF<1.0 ilk geçiş) — null = hiç. */
  meanFirstLiqDay: number | null;
  /** Çalıştırma istatistiği. */
  paths: number;
  horizonDays: number;
  annualVolBps: number;
}

/* ──────────────────────────── RNG (xoroshiro128++) ──────────────────────────── */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller standart normal. */
function gaussian(rng: () => number): number {
  let u = 0;
  while (u === 0) u = rng();
  let v = 0;
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ──────────────────────────── Core simulate ──────────────────────────── */

const HF_LIQ_FLOAT = hfBpsToFloat(HF_LIQUIDATION_BPS); // 1.00

export function simulate(
  input: MonteCarloInput,
  isCancelled?: () => boolean,
): MonteCarloOutput | null {
  const collateral = BigInt(input.collateralBase);
  const liability = BigInt(input.liabilityBase);
  const paths = Math.max(1, Math.floor(input.paths));
  const days = Math.max(1, Math.floor(input.horizonDays));
  const sigma = input.annualVolBps / 10_000; // bps → 1.00
  const mu = input.driftBps / 10_000;
  const dt = 1 / 252; // trading days → yıl
  const sqrtDt = Math.sqrt(dt);
  const rng = mulberry32(input.seed ?? Math.floor(Math.random() * 2 ** 31));

  // HF[path][day] — bellek için: hfMatrix[day] = sorted HFs across paths.
  // Memory cap: paths=5000, days=30 → 150k float; OK.
  const hfByDay: number[][] = Array.from({ length: days + 1 }, () => new Array<number>(paths));
  const equityByDay: number[][] = Array.from({ length: days + 1 }, () => new Array<number>(paths));
  const firstLiqDay: Int32Array = new Int32Array(paths).fill(-1);
  // Base equity (priceΔ=0). Likide path için 0 doldurmak amacıyla referans.
  const collateralNum = Number(collateral);
  const liabilityNum = Number(liability);
  const baseEquity = Math.max(0, collateralNum - liabilityNum);

  for (let p = 0; p < paths; p++) {
    if (isCancelled?.()) return null;
    let logReturnPct = 0; // cumulative %
    let liquidated = false;
    // Day 0 — initial
    hfByDay[0]![p] = hfBpsToFloat(projectHfBps(collateral, liability, 0));
    equityByDay[0]![p] = baseEquity;
    for (let d = 1; d <= days; d++) {
      const z = gaussian(rng);
      // GBM: log return increment
      const logIncrement = (mu - 0.5 * sigma * sigma) * dt + sigma * sqrtDt * z;
      logReturnPct += logIncrement;
      // priceDeltaBps for SDK: (e^logReturn - 1) * 10000
      const ratio = Math.exp(logReturnPct);
      const deltaBps = Math.round((ratio - 1) * 10_000);
      // HF via SDK (collateral × (1+delta) / debt)
      let hfFloat: number;
      try {
        const hfBps = projectHfBps(collateral, liability, deltaBps);
        hfFloat = hfBpsToFloat(hfBps);
      } catch {
        // ZERO_DEBT → tanımsız; sonsuz büyük say
        hfFloat = 999;
      }
      hfByDay[d]![p] = hfFloat;
      if (!liquidated && hfFloat < HF_LIQ_FLOAT) {
        liquidated = true;
        firstLiqDay[p] = d;
      }
      // Equity: likide ise 0; değilse collateral*(1+delta) - debt.
      const equity = liquidated ? 0 : Math.max(0, collateralNum * ratio - liabilityNum);
      equityByDay[d]![p] = equity;
    }
  }

  // Percentiles
  const fan: FanPoint[] = [];
  for (let d = 0; d <= days; d++) {
    const hfRow = hfByDay[d]!.slice().sort((a, b) => a - b);
    const eqRow = equityByDay[d]!.slice().sort((a, b) => a - b);
    const p10 = quantile(hfRow, 0.1);
    const p50 = quantile(hfRow, 0.5);
    const p90 = quantile(hfRow, 0.9);
    let liqHits = 0;
    for (let p = 0; p < paths; p++) {
      const f = firstLiqDay[p]!;
      if (f >= 0 && f <= d) liqHits++;
    }
    fan.push({
      day: d,
      hfP10: clamp(p10, 0, 5),
      hfP50: clamp(p50, 0, 5),
      hfP90: clamp(p90, 0, 5),
      cumLiqProb: liqHits / paths,
      equityP10: quantile(eqRow, 0.1),
      equityP50: quantile(eqRow, 0.5),
      equityP90: quantile(eqRow, 0.9),
    });
  }

  let firstLiqSum = 0;
  let firstLiqCount = 0;
  for (let p = 0; p < paths; p++) {
    const f = firstLiqDay[p]!;
    if (f >= 0) {
      firstLiqSum += f;
      firstLiqCount++;
    }
  }
  const meanFirstLiqDay = firstLiqCount > 0 ? firstLiqSum / firstLiqCount : null;

  // Heatmap — leverage × şok (current pozisyondan bağımsız; saf grid).
  // L bps üzerinden: collateral=2P×c, debt=P/l varsayımı yerine kullanıcının
  // mevcut effective collateral/liability'sini ölçekle (model: leverage_bps
  // collateralı 2P:P → 200 bps mapping için projectHfBps deltası):
  // Pratik model: var olan oranı koruyarak leverage'ı kademeli artıralım — bu
  // CURRENT pozisyona TUTARLI; gerçek "if I open this" senaryosu için
  // simulateLeverage tool ayrı var.
  const leverageGrid = input.leverageGridBps ?? [100, 150, 200, 250, 300];
  const shockGrid = input.shockGridPct ?? [-40, -25, -15, -5, 0, 5, 15, 25, 40];
  const heatmap: HeatmapCell[] = [];
  for (const Lbps of leverageGrid) {
    // Mevcut oran C/D = X. Yeni leverage L_new için, collateral/debt'i yeniden
    // ölçekle: collateral *= L_new/L_current (kabaca); pratik basitlik — hücrenin
    // HF'sini ölçeklenmiş base'le projectHf'ten al.
    // Burada L_current = current collateral/(collateral-debt); aynı modelle
    // hücreye HF formülünü uygula.
    const scale = Lbps / 100; // ×
    // Sentetik base: collateral_scaled = scale × principal, debt_scaled = (scale-1) × principal.
    // Principal'i `collateral - liability` ile yaklaşık eşitle (HF projeksiyonu için).
    const principal = collateral > liability ? collateral - liability : 1n;
    const cellCollateral = (principal * BigInt(Math.round(scale * 100))) / 100n;
    const cellLiability = (principal * BigInt(Math.round((scale - 1) * 100))) / 100n;
    for (const shock of shockGrid) {
      const deltaBps = shock * 100;
      let hf: number;
      try {
        hf =
          cellLiability > 0n
            ? hfBpsToFloat(projectHfBps(cellCollateral, cellLiability, deltaBps))
            : 999;
      } catch {
        hf = 0;
      }
      heatmap.push({
        leverageBps: Lbps,
        shockPct: shock,
        hfFloat: clamp(hf, 0, 5),
        band: classify(hf),
      });
    }
  }

  return {
    fan,
    heatmap,
    liqProb: fan[days]?.cumLiqProb ?? 0,
    meanFirstLiqDay,
    paths,
    horizonDays: days,
    annualVolBps: input.annualVolBps,
  };
}

function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  const pos = (sortedAsc.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sortedAsc[lo]!;
  const b = sortedAsc[hi]!;
  return a + (b - a) * (pos - lo);
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return max;
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function classify(hf: number): HeatmapCell["band"] {
  if (hf < 1.0) return "liquidatable";
  if (hf < 1.2) return "danger";
  if (hf < 1.5) return "caution";
  return "healthy";
}
