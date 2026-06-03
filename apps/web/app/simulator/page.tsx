import { DisclaimerStrip } from "@helios/ui";
import { Suspense } from "react";

import { SimulatorClient, type SimulatorScenario } from "./_components/SimulatorClient";

/**
 * /simulator — Public Monte Carlo keşif sayfası.
 *
 * Next 16: `searchParams` Promise olarak gelir; await ile çözülür. searchParams
 * kullanımı sayfayı dinamik yapar (cache yok) — istenen davranış, paylaşılabilir
 * URL state.
 *
 * proxy.ts'in PROTECTED_PREFIXES listesinde DEĞİL — auth gerekmiyor; hipotetik
 * senaryo keşfi. Cüzdan/SDK bağlamı yok.
 */
export default function SimulatorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <DisclaimerStrip />
      <main className="mx-auto max-w-6xl px-6 py-12 flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1 text-text-high m-0">Simulator</h1>
          <p className="text-body text-text-medium m-0 max-w-2xl">
            Hipotetik kaldıraçlı pozisyonu Monte Carlo ile simüle et: getiri P10/P50/P90, HF bandı,
            likidasyon olasılığı ve leverage trade-off. Same-asset MVP varsayımı; volatilite
            varsayımdır; testnet; yatırım tavsiyesi DEĞİLDİR.
          </p>
        </header>
        <Suspense fallback={<SimulatorSkeleton />}>
          <SimulatorFromUrl searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function SimulatorFromUrl({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const initial = parseScenario(sp);
  return <SimulatorClient initial={initial} />;
}

function SimulatorSkeleton() {
  return (
    <div className="rounded-md bg-space-700 border border-border-default h-64 animate-pulse" />
  );
}

function asString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function clampNumber(raw: string | undefined, def: number, min: number, max: number): number {
  if (!raw) return def;
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function parseScenario(sp: Record<string, string | string[] | undefined>): SimulatorScenario {
  const assetRaw = asString(sp["asset"])?.toUpperCase();
  const assetId =
    assetRaw === "USDC" || assetRaw === "WBTC" || assetRaw === "WETH"
      ? (assetRaw.replace("WBTC", "wBTC").replace("WETH", "wETH") as "USDC" | "wBTC" | "wETH")
      : ("XLM" as const);
  return {
    assetId,
    principal: clampNumber(asString(sp["principal"]), 100, 1, 1_000_000),
    leverageBps: Math.round(clampNumber(asString(sp["lev"]), 200, 100, 200) / 25) * 25,
    horizonDays: clampNumber(asString(sp["horizon"]), 30, 5, 180),
    annualVolBps: Math.round(clampNumber(asString(sp["vol"]), 8000, 1000, 20000) / 500) * 500,
  };
}
