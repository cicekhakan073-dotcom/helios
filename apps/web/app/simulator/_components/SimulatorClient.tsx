"use client";

/**
 * SimulatorClient — hipotetik MC + visx görselleri + senaryo karşılaştırma.
 *
 * Worker + motor: PROMPT 27'deki tx-pipeline. Effective collateral/liability:
 * Open wizard LivePreview ile aynı formül (effectiveCollateral/effectiveLiability
 * SDK fn'leri) — tutarlılık. URL state: searchParams ile paylaşılabilir.
 *
 * Asset selfServiceable: yalnız XLM (faucet var). Diğerleri için "Open this
 * position" CTA disabled + neden açıklaması (PROMPT 24 fix).
 */

import { effectiveCollateral, effectiveLiability, hfBpsToFloat, type AssetId } from "@helios/sdk";
import { IsolatedErrorBoundary } from "@helios/ui";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { AreaClosed, Bar, Line, LinePath } from "@visx/shape";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { MonteCarloInput, MonteCarloOutput } from "../../../lib/risk-radar/monte-carlo";

export interface SimulatorScenario {
  assetId: AssetId;
  principal: number;
  leverageBps: number;
  horizonDays: number;
  annualVolBps: number;
}

const ASSET_DEFAULTS: Record<
  AssetId,
  { decimals: number; cFactorBps: number; lFactorBps: number; selfServiceable: boolean }
> = {
  XLM: { decimals: 7, cFactorBps: 9000, lFactorBps: 9000, selfServiceable: true },
  USDC: { decimals: 7, cFactorBps: 9500, lFactorBps: 9500, selfServiceable: false },
  wBTC: { decimals: 8, cFactorBps: 9000, lFactorBps: 9000, selfServiceable: false },
  wETH: { decimals: 18, cFactorBps: 9000, lFactorBps: 9000, selfServiceable: false },
};

const DEBOUNCE_MS = 250;
const PATHS = 4000;

interface Props {
  initial: SimulatorScenario;
}

export function SimulatorClient({ initial }: Props) {
  const router = useRouter();
  const [scenario, setScenario] = useState<SimulatorScenario>(initial);
  const [output, setOutput] = useState<MonteCarloOutput | null>(null);
  const [compareLeverages, setCompareLeverages] = useState<number[]>([100, 150, 200]);
  const [compareOutputs, setCompareOutputs] = useState<Map<number, MonteCarloOutput>>(new Map());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const reqIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Worker mount/cleanup
  useEffect(() => {
    const w = new Worker(new URL("../../_workers/monte-carlo.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = w;
    w.onmessage = (
      e: MessageEvent<{
        id: number;
        type: string;
        data?: MonteCarloOutput;
        message?: string;
        meta?: { leverageBps?: number };
      }>,
    ) => {
      const m = e.data;
      if (m.type === "result" && m.data) {
        const lev = m.meta?.leverageBps;
        if (lev == null) {
          if (m.id !== reqIdRef.current) return;
          setOutput(m.data);
          setPending(false);
          setError(null);
        } else {
          setCompareOutputs((prev) => {
            const copy = new Map(prev);
            copy.set(lev, m.data!);
            return copy;
          });
        }
      } else if (m.type === "error") {
        setError(m.message ?? "bilinmeyen hata");
        setPending(false);
      }
    };
    return () => {
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  // Ana senaryo run
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const w = workerRef.current;
      if (!w) return;
      if (reqIdRef.current > 0) {
        w.postMessage({ id: reqIdRef.current, type: "cancel" });
      }
      const id = reqIdRef.current + 1;
      reqIdRef.current = id;
      setPending(true);
      setError(null);
      const params = buildMcParams(scenario);
      w.postMessage({ id, type: "run", params });

      // Karşılaştırma senaryoları
      setCompareOutputs(new Map());
      for (const lev of compareLeverages) {
        const cmpId = id * 1000 + lev;
        const cmpParams = buildMcParams({ ...scenario, leverageBps: lev });
        w.postMessage({ id: cmpId, type: "run", params: cmpParams, meta: { leverageBps: lev } });
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [scenario, compareLeverages]);

  // URL state senkronu
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("asset", scenario.assetId);
    params.set("principal", String(scenario.principal));
    params.set("lev", String(scenario.leverageBps));
    params.set("horizon", String(scenario.horizonDays));
    params.set("vol", String(scenario.annualVolBps));
    router.replace(`/simulator?${params.toString()}`, { scroll: false });
  }, [scenario, router]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      <ScenarioPanel scenario={scenario} onChange={setScenario} pending={pending} />
      <div className="flex flex-col gap-6">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-danger bg-danger-soft p-3 text-caption text-danger"
          >
            Hesap hatası: <span className="font-mono">{error}</span>
          </div>
        )}
        <SummaryStrip output={output} scenario={scenario} pending={pending} />
        <IsolatedErrorBoundary label="Equity fan grafiği yüklenemedi">
          <EquityFanChart output={output} />
        </IsolatedErrorBoundary>
        <IsolatedErrorBoundary label="HF zaman bandı yüklenemedi">
          <HfBandChart output={output} />
        </IsolatedErrorBoundary>
        <IsolatedErrorBoundary label="Leverage trade-off yüklenemedi">
          <LeverageTradeoff
            baseScenario={scenario}
            leverages={compareLeverages}
            outputs={compareOutputs}
            onLeveragesChange={setCompareLeverages}
          />
        </IsolatedErrorBoundary>
        <OpenCta scenario={scenario} />
        <p className="text-caption text-text-low m-0">
          ⚠️ Vol varsayımdır (gerçek tarihsel/implied feed entegre değil). Same-asset MVP&apos;de
          fiyat şoku yalnız collateral&apos;in birim değerini hareket ettirir; debt sabit notional.
          Testnet · unaudited · yatırım tavsiyesi DEĞİLDİR.
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

function buildMcParams(scenario: SimulatorScenario): MonteCarloInput {
  const meta = ASSET_DEFAULTS[scenario.assetId];
  const scale = 10n ** BigInt(meta.decimals);
  const principalRaw = BigInt(Math.round(scenario.principal * Number(scale)));
  const flashRaw = (principalRaw * BigInt(scenario.leverageBps - 100)) / 100n;
  const totalCollateralRaw = principalRaw + flashRaw;
  const borrowRaw = flashRaw;
  const effColl = effectiveCollateral(totalCollateralRaw, meta.cFactorBps);
  const effLiab = borrowRaw > 0n ? effectiveLiability(borrowRaw, meta.lFactorBps) : 0n;
  return {
    collateralBase: effColl.toString(),
    liabilityBase: effLiab.toString(),
    // Equity/getiri GERÇEK (haircut'suz) değerlerden hesaplanır — HF effective ister
    // ama equity raw ister (yoksa getiri ~%30 eksik görünürdü, c/l=0.9 XLM).
    rawCollateralBase: totalCollateralRaw.toString(),
    rawLiabilityBase: borrowRaw.toString(),
    spotPriceI128: "0",
    horizonDays: scenario.horizonDays,
    paths: PATHS,
    annualVolBps: scenario.annualVolBps,
    driftBps: 0,
  };
}

/* ───────────────────────── Scenario panel ───────────────────────── */

function ScenarioPanel({
  scenario,
  onChange,
  pending,
}: {
  scenario: SimulatorScenario;
  onChange: (s: SimulatorScenario) => void;
  pending: boolean;
}) {
  const set = <K extends keyof SimulatorScenario>(k: K, v: SimulatorScenario[K]) =>
    onChange({ ...scenario, [k]: v });
  return (
    <aside className="rounded-lg bg-space-700 border border-border-default p-5 flex flex-col gap-4 self-start">
      <header>
        <h2 className="text-h3 text-text-high m-0">Senaryo</h2>
        <p className="text-caption text-text-low m-0">Hipotetik girdiler — wallet bağlamı yok.</p>
      </header>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-micro uppercase tracking-wider text-text-low">Asset</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["XLM", "USDC", "wBTC", "wETH"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => set("assetId", id)}
              className={`rounded-md h-10 text-body font-mono ${
                scenario.assetId === id
                  ? "bg-aurora-amber text-text-on-aurora font-semibold"
                  : "bg-space-600 text-text-medium hover:bg-space-500"
              }`}
            >
              {id}
              {!ASSET_DEFAULTS[id].selfServiceable && (
                <span className="ml-1 text-micro opacity-70">·m</span>
              )}
            </button>
          ))}
        </div>
        {!ASSET_DEFAULTS[scenario.assetId].selfServiceable && (
          <span className="text-caption text-text-low">
            ·m = manuel · faucet yok; CTA disabled.
          </span>
        )}
      </fieldset>
      <NumField
        label="Principal"
        value={scenario.principal}
        min={1}
        max={1_000_000}
        step={1}
        onChange={(v) => set("principal", v)}
        hint={`= ${scenario.principal} ${scenario.assetId} (decimals ${ASSET_DEFAULTS[scenario.assetId].decimals})`}
      />
      <NumField
        label="Leverage (bps)"
        value={scenario.leverageBps}
        min={100}
        max={200}
        step={25}
        onChange={(v) => set("leverageBps", v)}
        hint={`= ${(scenario.leverageBps / 100).toFixed(2)}× · MVP cap 2× (XLM-bound)`}
      />
      <NumField
        label="Horizon (gün)"
        value={scenario.horizonDays}
        min={5}
        max={180}
        step={5}
        onChange={(v) => set("horizonDays", v)}
        hint="GBM zaman penceresi"
      />
      <NumField
        label="Yıllık vol (bps)"
        value={scenario.annualVolBps}
        min={1000}
        max={20000}
        step={500}
        onChange={(v) => set("annualVolBps", v)}
        hint={`= %${(scenario.annualVolBps / 100).toFixed(0)} varsayım · # DOĞRULA`}
      />
      <div className="text-caption text-text-low">
        {pending ? "hesaplanıyor…" : `${PATHS} path · ${scenario.horizonDays}g`}
      </div>
    </aside>
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
          onChange(Math.max(min, Math.min(max, Math.round(v / step) * step)));
        }}
        className="rounded-md bg-space-600 border border-border-default px-3 h-10 text-body text-text-high font-mono tabular focus-visible:outline-2 focus-visible:outline-aurora-teal"
      />
      <span className="text-caption text-text-low">{hint}</span>
    </label>
  );
}

/* ───────────────────────── Summary strip ───────────────────────── */

function SummaryStrip({
  output,
  scenario,
  pending,
}: {
  output: MonteCarloOutput | null;
  scenario: SimulatorScenario;
  pending: boolean;
}) {
  const probPct = (output?.liqProb ?? 0) * 100;
  const finalP50 = output?.fan.at(-1)?.equityP50 ?? 0;
  const decimals = ASSET_DEFAULTS[scenario.assetId].decimals;
  const finalP50Units = finalP50 / 10 ** decimals;
  const finalP10 = output?.fan.at(-1)?.equityP10 ?? 0;
  const finalP10Units = finalP10 / 10 ** decimals;
  let tone: "ok" | "warn" | "danger" = "ok";
  if (probPct >= 25) tone = "danger";
  else if (probPct >= 5) tone = "warn";
  const toneClass =
    tone === "danger"
      ? "border-danger bg-danger-soft"
      : tone === "warn"
        ? "border-warn bg-warn-soft"
        : "border-aurora-teal bg-aurora-teal-soft";
  return (
    <section className={`rounded-md border p-4 ${toneClass} grid grid-cols-2 md:grid-cols-4 gap-3`}>
      <div>
        <div className="text-micro uppercase tracking-wider text-text-low">
          Likidasyon olasılığı
        </div>
        <div className="text-numeric-lg text-text-high font-mono tabular" data-num>
          {pending ? "…" : `≈%${probPct.toFixed(1)}`}
        </div>
      </div>
      <div>
        <div className="text-micro uppercase tracking-wider text-text-low">
          Ortalama ilk-liq günü
        </div>
        <div className="text-numeric-lg text-text-high font-mono tabular" data-num>
          {output?.meanFirstLiqDay != null ? output.meanFirstLiqDay.toFixed(1) : "—"}
        </div>
      </div>
      <div>
        <div className="text-micro uppercase tracking-wider text-text-low">Final equity (P50)</div>
        <div className="text-numeric-lg text-text-high font-mono tabular" data-num>
          {finalP50Units.toFixed(2)} {scenario.assetId}
        </div>
      </div>
      <div>
        <div className="text-micro uppercase tracking-wider text-text-low">Final equity (P10)</div>
        <div className="text-numeric-lg text-text-high font-mono tabular" data-num>
          {finalP10Units.toFixed(2)} {scenario.assetId}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── visx Equity fan ───────────────────────── */

const CHART_W = 720;
const CHART_H = 220;
const M = { top: 12, right: 12, bottom: 28, left: 56 };
const IW = CHART_W - M.left - M.right;
const IH = CHART_H - M.top - M.bottom;

function EquityFanChart({ output }: { output: MonteCarloOutput | null }) {
  const fan = useMemo(() => output?.fan ?? [], [output]);
  const x = useMemo(
    () => scaleLinear({ domain: [0, Math.max(1, fan.at(-1)?.day ?? 1)], range: [0, IW] }),
    [fan],
  );
  const maxEq = useMemo(() => {
    if (fan.length === 0) return 1;
    let m = 0;
    for (const f of fan) if (f.equityP90 > m) m = f.equityP90;
    return m || 1;
  }, [fan]);
  const y = useMemo(() => scaleLinear({ domain: [0, maxEq], range: [IH, 0] }), [maxEq]);

  return (
    <ChartShell title="Equity dağılımı (P10–P50–P90)">
      {fan.length > 0 ? (
        <svg width={CHART_W} height={CHART_H} role="img" aria-label="Equity fan">
          <Group left={M.left} top={M.top}>
            <AreaClosed
              data={fan}
              x={(d) => x(d.day)}
              y={(d) => y(d.equityP90)}
              y0={(d) => y(d.equityP10)}
              yScale={y}
              fill="#4dd0a7"
              fillOpacity={0.18}
              stroke="none"
            />
            <LinePath
              data={fan}
              x={(d) => x(d.day)}
              y={(d) => y(d.equityP50)}
              stroke="#4dd0a7"
              strokeWidth={2}
            />
            <AxisLeft
              scale={y}
              stroke="rgba(255,255,255,0.4)"
              tickStroke="rgba(255,255,255,0.4)"
              tickLabelProps={() => ({
                fill: "rgba(255,255,255,0.6)",
                fontSize: 10,
                textAnchor: "end",
                dx: -4,
                dy: 3,
              })}
              numTicks={4}
            />
            <AxisBottom
              top={IH}
              scale={x}
              stroke="rgba(255,255,255,0.4)"
              tickStroke="rgba(255,255,255,0.4)"
              tickLabelProps={() => ({
                fill: "rgba(255,255,255,0.6)",
                fontSize: 10,
                textAnchor: "middle",
              })}
              tickFormat={(d) => `${Number(d)}g`}
              numTicks={6}
            />
          </Group>
        </svg>
      ) : (
        <EmptyChart />
      )}
    </ChartShell>
  );
}

/* ───────────────────────── visx HF bandı ───────────────────────── */

function HfBandChart({ output }: { output: MonteCarloOutput | null }) {
  const fan = useMemo(() => output?.fan ?? [], [output]);
  const x = useMemo(
    () => scaleLinear({ domain: [0, Math.max(1, fan.at(-1)?.day ?? 1)], range: [0, IW] }),
    [fan],
  );
  const y = useMemo(() => scaleLinear({ domain: [0, 3], range: [IH, 0] }), []);

  return (
    <ChartShell title="HF zaman bandı (P10–P50–P90) · likidasyon eşiği 1.00">
      {fan.length > 0 ? (
        <svg width={CHART_W} height={CHART_H} role="img" aria-label="HF band">
          <Group left={M.left} top={M.top}>
            <AreaClosed
              data={fan}
              x={(d) => x(d.day)}
              y={(d) => y(d.hfP90)}
              y0={(d) => y(d.hfP10)}
              yScale={y}
              fill="#4dd0a7"
              fillOpacity={0.18}
              stroke="none"
            />
            <LinePath
              data={fan}
              x={(d) => x(d.day)}
              y={(d) => y(d.hfP50)}
              stroke="#4dd0a7"
              strokeWidth={2}
            />
            <Line
              from={{ x: 0, y: y(1) }}
              to={{ x: IW, y: y(1) }}
              stroke="#ff5577"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <Line
              from={{ x: 0, y: y(1.3) }}
              to={{ x: IW, y: y(1.3) }}
              stroke="#f6c34d"
              strokeWidth={1}
              strokeDasharray="2 6"
            />
            <AxisLeft
              scale={y}
              stroke="rgba(255,255,255,0.4)"
              tickStroke="rgba(255,255,255,0.4)"
              tickLabelProps={() => ({
                fill: "rgba(255,255,255,0.6)",
                fontSize: 10,
                textAnchor: "end",
                dx: -4,
                dy: 3,
              })}
              tickValues={[0, 1, 1.3, 2, 3]}
              tickFormat={(v) => Number(v).toFixed(1)}
            />
            <AxisBottom
              top={IH}
              scale={x}
              stroke="rgba(255,255,255,0.4)"
              tickStroke="rgba(255,255,255,0.4)"
              tickLabelProps={() => ({
                fill: "rgba(255,255,255,0.6)",
                fontSize: 10,
                textAnchor: "middle",
              })}
              tickFormat={(d) => `${Number(d)}g`}
              numTicks={6}
            />
          </Group>
        </svg>
      ) : (
        <EmptyChart />
      )}
    </ChartShell>
  );
}

/* ───────────────────────── Leverage trade-off (compare) ───────────────────────── */

const TRADE_W = 720;
const TRADE_H = 200;
const TM = { top: 12, right: 12, bottom: 28, left: 56 };
const TIW = TRADE_W - TM.left - TM.right;
const TIH = TRADE_H - TM.top - TM.bottom;

function LeverageTradeoff({
  baseScenario,
  leverages,
  outputs,
  onLeveragesChange,
}: {
  baseScenario: SimulatorScenario;
  leverages: number[];
  outputs: Map<number, MonteCarloOutput>;
  onLeveragesChange: (next: number[]) => void;
}) {
  const decimals = ASSET_DEFAULTS[baseScenario.assetId].decimals;

  const rows = leverages.map((lev) => {
    const out = outputs.get(lev);
    const liqProb = out ? out.liqProb : null;
    const equityP50 = out?.fan.at(-1)?.equityP50 ?? null;
    const equityP10 = out?.fan.at(-1)?.equityP10 ?? null;
    const hfP50 = out?.fan.at(-1)?.hfP50 ?? null;
    return { lev, liqProb, equityP50, equityP10, hfP50 };
  });

  // Bar grafiği: leverage (×) → liqProb (%)
  const x = scaleLinear({
    domain: [1, 2.2],
    range: [0, TIW],
  });
  const y = scaleLinear({
    domain: [0, Math.max(0.5, ...rows.map((r) => r.liqProb ?? 0))],
    range: [TIH, 0],
  });

  return (
    <ChartShell title="Leverage trade-off · likidasyon olasılığı (bar) + final equity P50 (gri çizgi)">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="text-caption text-text-low">Karşılaştır:</span>
        {[100, 125, 150, 175, 200].map((lev) => {
          const active = leverages.includes(lev);
          return (
            <button
              key={lev}
              type="button"
              onClick={() =>
                onLeveragesChange(
                  active
                    ? leverages.filter((l) => l !== lev)
                    : [...leverages, lev].sort((a, b) => a - b),
                )
              }
              className={`text-caption rounded-full px-3 h-7 border ${
                active
                  ? "bg-aurora-amber text-text-on-aurora border-aurora-amber"
                  : "border-border-default bg-space-700 text-text-medium hover:bg-space-600"
              }`}
            >
              {(lev / 100).toFixed(2)}×
            </button>
          );
        })}
      </div>
      <svg width={TRADE_W} height={TRADE_H} role="img" aria-label="Leverage trade-off">
        <Group left={TM.left} top={TM.top}>
          {rows.map((r) => {
            const barX = x(r.lev / 100) - 16;
            const liq = r.liqProb ?? 0;
            const barY = y(liq);
            const barH = TIH - barY;
            const color = liq > 0.25 ? "#ff5577" : liq > 0.05 ? "#f6c34d" : "#4dd0a7";
            return (
              <Group key={r.lev}>
                <Bar
                  x={barX}
                  y={barY}
                  width={32}
                  height={Math.max(0, barH)}
                  fill={color}
                  fillOpacity={0.65}
                  rx={2}
                />
                <text
                  x={barX + 16}
                  y={barY - 4}
                  fill="rgba(255,255,255,0.85)"
                  fontSize={10}
                  textAnchor="middle"
                >
                  {(liq * 100).toFixed(1)}%
                </text>
              </Group>
            );
          })}
          <AxisLeft
            scale={y}
            stroke="rgba(255,255,255,0.4)"
            tickStroke="rgba(255,255,255,0.4)"
            tickLabelProps={() => ({
              fill: "rgba(255,255,255,0.6)",
              fontSize: 10,
              textAnchor: "end",
              dx: -4,
              dy: 3,
            })}
            tickFormat={(v) => `${Math.round(Number(v) * 100)}%`}
            numTicks={4}
          />
          <AxisBottom
            top={TIH}
            scale={x}
            stroke="rgba(255,255,255,0.4)"
            tickStroke="rgba(255,255,255,0.4)"
            tickLabelProps={() => ({
              fill: "rgba(255,255,255,0.6)",
              fontSize: 10,
              textAnchor: "middle",
            })}
            tickFormat={(v) => `${Number(v).toFixed(2)}×`}
            numTicks={5}
          />
        </Group>
      </svg>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-caption font-mono tabular">
          <thead className="text-text-low">
            <tr>
              <th className="text-left p-1">Leverage</th>
              <th className="text-right p-1">Likidasyon olasılığı</th>
              <th className="text-right p-1">HF P50 (son gün)</th>
              <th className="text-right p-1">Equity P50</th>
              <th className="text-right p-1">Equity P10</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.lev} className="border-t border-border-subtle">
                <td className="text-left p-1 text-text-high">{(r.lev / 100).toFixed(2)}×</td>
                <td className="text-right p-1 text-text-high" data-num>
                  {r.liqProb != null ? `${(r.liqProb * 100).toFixed(1)}%` : "…"}
                </td>
                <td className="text-right p-1 text-text-high" data-num>
                  {r.hfP50 != null ? r.hfP50.toFixed(2) : "…"}
                </td>
                <td className="text-right p-1 text-text-high" data-num>
                  {r.equityP50 != null
                    ? `${(r.equityP50 / 10 ** decimals).toFixed(2)} ${baseScenario.assetId}`
                    : "…"}
                </td>
                <td className="text-right p-1 text-text-high" data-num>
                  {r.equityP10 != null
                    ? `${(r.equityP10 / 10 ** decimals).toFixed(2)} ${baseScenario.assetId}`
                    : "…"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartShell>
  );
}

/* ───────────────────────── Open CTA ───────────────────────── */

function OpenCta({ scenario }: { scenario: SimulatorScenario }) {
  const self = ASSET_DEFAULTS[scenario.assetId].selfServiceable;
  const href = `/open?asset=${scenario.assetId}&lev=${scenario.leverageBps}&principal=${scenario.principal}`;
  return (
    <section className="rounded-md bg-space-700 border border-border-default p-4 flex flex-wrap items-center gap-3 justify-between">
      <div>
        <h3 className="text-h3 text-text-high m-0">Bu pozisyonu açmak ister misin?</h3>
        <p className="text-caption text-text-low m-0">
          {self
            ? "XLM aktif — wizard'a parametre taşır; pozisyon açmadan önce cüzdan bağlamanı isteyecek."
            : "Bu asset için testnet faucet yok (PROMPT 24); önce manuel fonlama gerek."}
        </p>
      </div>
      {self ? (
        <Link
          href={href}
          className="rounded-md bg-aurora-amber text-text-on-aurora h-11 px-5 inline-flex items-center font-semibold hover:bg-aurora-amber-glow"
          data-cta="open-from-simulator"
        >
          Open position →
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="rounded-md bg-space-600 text-text-low h-11 px-5 font-semibold opacity-60 cursor-not-allowed"
        >
          Open position (manuel asset)
        </button>
      )}
    </section>
  );
}

/* ───────────────────────── Chart shell ───────────────────────── */

function ChartShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md bg-space-700 border border-border-default p-4 flex flex-col gap-2 overflow-x-auto">
      <h3 className="text-body text-text-high font-semibold m-0">{title}</h3>
      {children}
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="h-44 grid place-items-center text-caption text-text-low">henüz veri yok…</div>
  );
}

/** Helper: hfBpsToFloat referansını kullanılmamış uyarısından koru. */
void hfBpsToFloat;
