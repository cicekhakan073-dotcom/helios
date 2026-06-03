"use client";

/**
 * RiskRadar — Monte Carlo HF fan + likidasyon olasılığı + leverage×şok heatmap.
 *
 * Hesap web worker'da; UI thread bloklamadan path sayısı artırılabilir.
 * Volatilite varsayımdır (gerçek feed yok, # DOĞRULA) — kullanıcı slider ile
 * değiştirebilir; UI etiketinde "varsayım · testnet" geçer.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonteCarloInput, MonteCarloOutput } from "../../../lib/risk-radar/monte-carlo";

interface Props {
  collateralBase: bigint;
  liabilityBase: bigint;
  spotPriceI128?: bigint | null;
}

interface FanRow {
  day: number;
  hfP10: number;
  hfP50: number;
  hfP90: number;
  hfBand: [number, number];
  cumLiqProb: number;
}

const DEFAULT_HORIZON = 30;
const DEFAULT_PATHS = 5000;
const DEFAULT_VOL_BPS = 8000; // %80 yıllık (kripto/testnet için kaba varsayım)
const DEBOUNCE_MS = 250;

export function RiskRadar({ collateralBase, liabilityBase, spotPriceI128 }: Props) {
  const [horizon, setHorizon] = useState(DEFAULT_HORIZON);
  const [paths, setPaths] = useState(DEFAULT_PATHS);
  const [annualVolBps, setAnnualVolBps] = useState(DEFAULT_VOL_BPS);
  const [output, setOutput] = useState<MonteCarloOutput | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Worker oluştur / temizle
  useEffect(() => {
    const w = new Worker(new URL("../../_workers/monte-carlo.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = w;
    w.onmessage = (
      e: MessageEvent<{ id: number; type: string; data?: MonteCarloOutput; message?: string }>,
    ) => {
      const m = e.data;
      if (m.id !== reqIdRef.current) return; // bayat mesaj
      if (m.type === "result" && m.data) {
        setOutput(m.data);
        setPending(false);
        setError(null);
      } else if (m.type === "error") {
        setError(m.message ?? "bilinmeyen hata");
        setPending(false);
      } else if (m.type === "cancelled") {
        setPending(false);
      }
    };
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  // Borç yoksa worker'ı tetiklemeden çık
  const noDebt = liabilityBase === 0n;

  // Debounce + run
  useEffect(() => {
    if (noDebt) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const w = workerRef.current;
      if (!w) return;
      // Önceki req'i iptal et
      if (reqIdRef.current > 0) {
        w.postMessage({ id: reqIdRef.current, type: "cancel" });
      }
      const id = reqIdRef.current + 1;
      reqIdRef.current = id;
      setPending(true);
      setError(null);
      const params: MonteCarloInput = {
        collateralBase: collateralBase.toString(),
        liabilityBase: liabilityBase.toString(),
        spotPriceI128: (spotPriceI128 ?? 0n).toString(),
        horizonDays: horizon,
        paths,
        annualVolBps,
        driftBps: 0,
      };
      w.postMessage({ id, type: "run", params });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [collateralBase, liabilityBase, spotPriceI128, horizon, paths, annualVolBps, noDebt]);

  const fanRows: FanRow[] = useMemo(
    () =>
      output?.fan.map((f) => ({
        day: f.day,
        hfP10: f.hfP10,
        hfP50: f.hfP50,
        hfP90: f.hfP90,
        hfBand: [f.hfP10, f.hfP90],
        cumLiqProb: f.cumLiqProb,
      })) ?? [],
    [output],
  );

  if (noDebt) {
    return (
      <section className="rounded-md bg-space-700 border border-border-default p-5 flex flex-col gap-2">
        <h3 className="text-h3 text-text-high m-0">Risk Radar (Monte Carlo)</h3>
        <p className="text-caption text-text-low m-0">
          Borç yok — HF tanımsız (∞). Pozisyon açıldığında fan + heatmap aktive olur.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-md bg-space-700 border border-border-default p-5 flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-4 flex-wrap">
        <div className="flex flex-col">
          <h3 className="text-h3 text-text-high m-0">Risk Radar (Monte Carlo)</h3>
          <span className="text-caption text-text-low">
            GBM fiyat yolu — same-asset MVP; vol varsayım · testnet · # DOĞRULA
          </span>
        </div>
        <span className="text-caption text-text-low">
          {pending ? "hesaplanıyor…" : `${output?.paths ?? 0} path · ${output?.horizonDays ?? 0}g`}
        </span>
      </header>

      <ControlsRow
        horizon={horizon}
        paths={paths}
        annualVolBps={annualVolBps}
        onHorizon={setHorizon}
        onPaths={setPaths}
        onVol={setAnnualVolBps}
      />

      <SummaryBox output={output} horizonDays={horizon} />

      <div
        className="h-56 w-full"
        role="img"
        aria-label={
          output
            ? `Monte Carlo HF fan grafiği: ${output.paths} path, ${output.horizonDays} gün, yıllık vol %${(output.annualVolBps / 100).toFixed(0)}. Final medyan HF ${
                output.fan.at(-1)?.hfP50?.toFixed(2) ?? "—"
              }, likidasyon olasılığı %${(output.liqProb * 100).toFixed(1)}.`
            : "Monte Carlo hesaplanıyor."
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={fanRows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />
            <XAxis
              dataKey="day"
              type="number"
              domain={[0, horizon]}
              tickFormatter={(v: number) => `${v}g`}
              stroke="rgba(255,255,255,0.4)"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              domain={[0, 3]}
              ticks={[0, 1, 1.3, 1.5, 2, 3]}
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
              formatter={(value: unknown, name: unknown) => {
                const nameStr = typeof name === "string" ? name : "";
                if (typeof value === "number") return [value.toFixed(2), nameStr];
                if (typeof value === "string") return [value, nameStr];
                return ["—", nameStr];
              }}
              labelFormatter={(label: unknown) => {
                if (typeof label === "number") return `Gün ${label}`;
                if (typeof label === "string") return `Gün ${label}`;
                return "Gün —";
              }}
            />
            <ReferenceLine y={1} stroke="#ff5577" strokeDasharray="4 4" />
            <ReferenceLine y={1.3} stroke="#f6c34d" strokeDasharray="2 6" />
            <Area
              type="monotone"
              dataKey="hfBand"
              stroke="none"
              fill="#4dd0a7"
              fillOpacity={0.18}
              isAnimationActive={false}
              name="P10–P90"
            />
            <Line
              type="monotone"
              dataKey="hfP50"
              stroke="#4dd0a7"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name="medyan"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <HeatmapView output={output} />

      {error && (
        <div
          role="alert"
          className="rounded-md border border-danger bg-danger-soft p-3 text-caption text-danger"
        >
          Hesap hatası: <span className="font-mono">{error}</span>
        </div>
      )}

      <p className="text-caption text-text-low m-0">
        ⚠️ Volatilite varsayımdır (gerçek tarihsel/implied feed entegre değil). Yıllık vol
        slider&apos;ı duyarlılık testi içindir. Same-asset MVP&apos;de fiyat şoku yalnız
        collateral&apos;in birim değerini hareket ettirir; debt sabit notional. Yatırım tavsiyesi
        değildir.
      </p>
    </section>
  );
}

/* ───────────────────────── Controls ───────────────────────── */

function ControlsRow({
  horizon,
  paths,
  annualVolBps,
  onHorizon,
  onPaths,
  onVol,
}: {
  horizon: number;
  paths: number;
  annualVolBps: number;
  onHorizon: (n: number) => void;
  onPaths: (n: number) => void;
  onVol: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <NumField
        label="Horizon (gün)"
        value={horizon}
        min={5}
        max={180}
        step={5}
        onChange={onHorizon}
        hint="GBM zaman penceresi"
      />
      <NumField
        label="Path sayısı"
        value={paths}
        min={500}
        max={20000}
        step={500}
        onChange={onPaths}
        hint="çok path → daha pürüzsüz; daha yavaş"
      />
      <NumField
        label="Yıllık vol (bps)"
        value={annualVolBps}
        min={1000}
        max={20000}
        step={500}
        onChange={onVol}
        hint={`= %${(annualVolBps / 100).toFixed(0)} varsayım · # DOĞRULA`}
      />
    </div>
  );
}

function NumField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-micro uppercase tracking-wider text-text-low">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isFinite(v)) return;
          onChange(Math.max(min, Math.min(max, Math.round(v))));
        }}
        className="rounded-md bg-space-600 border border-border-default px-3 h-10 text-body text-text-high font-mono tabular focus-visible:outline-2 focus-visible:outline-aurora-teal"
      />
      <span className="text-caption text-text-low">{hint}</span>
    </label>
  );
}

/* ───────────────────────── Summary ───────────────────────── */

function SummaryBox({
  output,
  horizonDays,
}: {
  output: MonteCarloOutput | null;
  horizonDays: number;
}) {
  if (!output) return null;
  const probPct = output.liqProb * 100;
  const meanDay = output.meanFirstLiqDay;
  let tone: "ok" | "warn" | "danger" = "ok";
  if (probPct >= 25) tone = "danger";
  else if (probPct >= 5) tone = "warn";

  return (
    <div
      className={`rounded-md p-3 flex flex-col gap-1 border ${
        tone === "danger"
          ? "border-danger bg-danger-soft"
          : tone === "warn"
            ? "border-warn bg-warn-soft"
            : "border-aurora-teal bg-aurora-teal-soft"
      }`}
    >
      <strong className="text-text-high">
        ≈%{probPct.toFixed(1)} olasılıkla {horizonDays} gün içinde likidasyon
      </strong>
      <span className="text-caption text-text-medium">
        Ortalama ilk-likidasyon günü: {meanDay != null ? meanDay.toFixed(1) : "—"} · medyan HF
        eğrisi ve P10–P90 bandı aşağıda. Likidasyon eşiği 1.00 (kırmızı), açılış eşiği 1.30 (amber).
      </span>
    </div>
  );
}

/* ───────────────────────── Heatmap ───────────────────────── */

function HeatmapView({ output }: { output: MonteCarloOutput | null }) {
  if (!output || output.heatmap.length === 0) return null;
  // Group by leverage; columns = shockPct.
  const leverages = Array.from(new Set(output.heatmap.map((c) => c.leverageBps))).sort(
    (a, b) => a - b,
  );
  const shocks = Array.from(new Set(output.heatmap.map((c) => c.shockPct))).sort((a, b) => a - b);
  const cell = (lev: number, shock: number) =>
    output.heatmap.find((c) => c.leverageBps === lev && c.shockPct === shock);

  return (
    <div className="flex flex-col gap-2">
      <header className="flex items-baseline justify-between">
        <h4 className="text-body text-text-high font-semibold m-0">Leverage × fiyat şoku</h4>
        <span className="text-caption text-text-low">renk = HF bandı</span>
      </header>
      <div
        className="grid gap-1 text-micro font-mono"
        style={{
          gridTemplateColumns: `60px repeat(${shocks.length}, minmax(40px, 1fr))`,
        }}
      >
        <div />
        {shocks.map((s) => (
          <div key={s} className="text-text-low text-center">
            {s > 0 ? `+${s}%` : `${s}%`}
          </div>
        ))}
        {leverages.map((lev) => (
          <FragmentRow
            key={lev}
            label={`${(lev / 100).toFixed(2)}×`}
            cells={shocks.map((s) => cell(lev, s))}
          />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({
  label,
  cells,
}: {
  label: string;
  cells: ReturnType<MonteCarloOutput["heatmap"]["find"]>[];
}) {
  return (
    <>
      <div className="text-text-low text-right pr-1">{label}</div>
      {cells.map((c, i) => (
        <div
          key={i}
          className={`rounded h-7 grid place-items-center text-text-high ${bandClass(c?.band)}`}
          title={c ? `HF ${c.hfFloat.toFixed(2)}` : "—"}
        >
          {c?.hfFloat.toFixed(2) ?? "—"}
        </div>
      ))}
    </>
  );
}

function bandClass(band: "healthy" | "caution" | "danger" | "liquidatable" | undefined): string {
  switch (band) {
    case "healthy":
      return "bg-aurora-teal/35";
    case "caution":
      return "bg-aurora-amber/35";
    case "danger":
      return "bg-warn/40";
    case "liquidatable":
      return "bg-danger/50";
    default:
      return "bg-space-600";
  }
}
