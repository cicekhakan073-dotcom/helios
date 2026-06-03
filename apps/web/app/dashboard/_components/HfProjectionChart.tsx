"use client";

/**
 * HF projeksiyon grafiği — collateral fiyat şoku (-50%..+50%) ızgarasında HF.
 *
 * shared.projectHfBps(collateral, liability, priceDeltaBps) → her şok için HF.
 * Likidasyon eşiği (HF=1.00) yatay çizgi olarak çizilir; mevcut nokta dot ile
 * vurgulanır. Same-asset MVP varsayımı: collateral & debt aynı asset → şok yalnız
 * collateral'in birim değerini hareket ettirir, debt sabit (Helios MVP varsayımı).
 */

import { projectHfBps } from "@helios/sdk";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  collateralBase: bigint;
  liabilityBase: bigint;
  /** -50..+50 (yüzde). Default: -50..+50 step 5. */
  shocksPct?: number[];
}

interface ChartPoint {
  shockPct: number;
  hf: number;
}

function clampForChart(hf: number): number {
  // Çok yüksek HF'ler grafiği lineerleştirip 1.0 çizgisini görünmez kılar; cap 3.5x.
  if (!Number.isFinite(hf)) return 3.5;
  if (hf > 3.5) return 3.5;
  if (hf < 0) return 0;
  return hf;
}

export function HfProjectionChart({ collateralBase, liabilityBase, shocksPct }: Props) {
  const points: ChartPoint[] = useMemo(() => {
    if (liabilityBase === 0n) return [];
    const shocks = shocksPct ?? defaultShocks();
    return shocks.map((pct) => {
      const deltaBps = pct * 100;
      let hf: number;
      try {
        const hfBps = projectHfBps(collateralBase, liabilityBase, deltaBps);
        hf = Number(hfBps) / 100;
      } catch {
        hf = 0;
      }
      return { shockPct: pct, hf: clampForChart(hf) };
    });
  }, [collateralBase, liabilityBase, shocksPct]);

  const currentHf = useMemo<ChartPoint | null>(() => {
    if (liabilityBase === 0n) return null;
    try {
      const hfBps = projectHfBps(collateralBase, liabilityBase, 0);
      return { shockPct: 0, hf: clampForChart(Number(hfBps) / 100) };
    } catch {
      return null;
    }
  }, [collateralBase, liabilityBase]);

  if (points.length === 0) {
    return (
      <p className="text-caption text-text-low m-0">
        Borç yok — HF tanımsız (∞). Pozisyon açtıkça grafik aktive olur.
      </p>
    );
  }

  // A11y özet — ekran okuyucular için
  const currentPoint = points.find((p) => p.shockPct === 0);
  const liqPoint = points.find((p) => p.hf <= 1.0);
  const summary = currentPoint
    ? `HF projeksiyonu: mevcut HF ${currentPoint.hf.toFixed(2)}; ${
        liqPoint
          ? `likidasyon eşiği (HF<1.0) yaklaşık %${liqPoint.shockPct} fiyat şokunda.`
          : "şu fiyat şoku aralığında likidasyon görünmüyor."
      } Likidasyon eşiği 1.00.`
    : "HF projeksiyonu hesaplanamadı.";

  return (
    <div className="flex flex-col gap-2">
      <header className="flex items-baseline justify-between">
        <h4 className="text-body text-text-high font-semibold m-0">HF / fiyat şoku</h4>
        <span className="text-caption text-text-low">Likidasyon eşiği = 1.00</span>
      </header>
      <div className="h-56 w-full" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />
            <XAxis
              dataKey="shockPct"
              type="number"
              domain={[-50, 50]}
              ticks={[-50, -25, 0, 25, 50]}
              tickFormatter={(v: number) => `${v}%`}
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              domain={[0, 3.5]}
              ticks={[0, 1, 1.3, 2, 3]}
              tickFormatter={(v: number) => v.toFixed(1)}
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "rgba(20,24,32,0.94)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(value: unknown) => {
                if (typeof value === "number") return [value.toFixed(2), "HF"];
                if (typeof value === "string") return [value, "HF"];
                return ["—", "HF"];
              }}
              labelFormatter={(label: unknown) => {
                if (typeof label === "number") return `Fiyat Δ ${label}%`;
                if (typeof label === "string") return `Fiyat Δ ${label}%`;
                return "Fiyat Δ —";
              }}
            />
            <ReferenceLine y={1} stroke="#ff5577" strokeDasharray="4 4" />
            <ReferenceLine y={1.3} stroke="#f6c34d" strokeDasharray="2 6" />
            <Line
              type="monotone"
              dataKey="hf"
              stroke="#4dd0a7"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {currentHf && (
              <ReferenceDot
                x={currentHf.shockPct}
                y={currentHf.hf}
                r={5}
                fill="#f6c34d"
                stroke="#0c0d10"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-caption text-text-low m-0">
        ⚠️ Same-asset MVP varsayımı: şok yalnız collateral fiyatını oynatır. Debt aynı asset olduğu
        için gerçek HF eğrisi simulasyona daha duyarlıdır — likidasyon eşiği{" "}
        <span className="text-hf-danger">1.00</span>, açılış eşiği{" "}
        <span className="text-aurora-amber">1.30</span>.
      </p>
    </div>
  );
}

function defaultShocks(): number[] {
  const out: number[] = [];
  for (let s = -50; s <= 50; s += 5) out.push(s);
  return out;
}
