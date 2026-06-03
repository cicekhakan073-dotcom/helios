"use client";

/**
 * DashboardLive — gerçek pozisyon, KPI'lar, HF projeksiyon, close + opt-in.
 *
 * AUDIT 2026-06-02:
 *  §3.2 PPR — sayfa shell statik; bu client streaming bölüm.
 *  §3.3 updateTag — close başarısında RSC cache rebust.
 *  §6.4 hydration — usePosition (Blend authoritative + Neon meta + leverage fallback).
 *  §1.6 oracle staleness — HF/grafik için pool oracle + freshness rozeti.
 */

import {
  ASSET_META,
  ASSETS,
  computeUserHfBps,
  effectiveCollateral,
  effectiveLiability,
  hfBpsToFloat,
  HF_LIQUIDATION_BPS,
  liquidationPrice as calcLiquidationPrice,
  normalizeError,
  positionQueryKey,
  pushAppError,
  riskBand,
  sacAddressFor,
  txExplorerLink,
  useClosePositionSend,
  usePoolOraclePrice,
  usePoolReserves,
  usePosition,
  useRegisterOptInSend,
  useSimulateClosePosition,
  useSimulateRegisterOptIn,
  useUserBlendPosition,
  type AssetId,
  type ReserveSnapshot,
  type SignAndSendResult,
} from "@helios/sdk";
import { HealthFactorBadge, IsolatedErrorBoundary, StatTile } from "@helios/ui";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CopilotLauncher } from "../../_components/copilot/CopilotLauncher";
import { PushPanel } from "../../_components/push/PushPanel";
import { formatPrincipal } from "../../open/_state/wizard-store";

import { HfProjectionChart } from "./HfProjectionChart";
import { LastRebalanceStrip } from "./LastRebalanceStrip";
import { RiskRadar } from "./RiskRadar";

const REFRESH_TAG_PREFIX = "helios-position-";

interface Props {
  address: string;
}

interface ResolvedPosition {
  assetId: AssetId;
  reserve: ReserveSnapshot;
  /** UNDERLYING stroops (loadUserPosition b/d-token→underlying çevirir; PROMPT 23-FIX). */
  collateralUnderlying: bigint;
  debtUnderlying: bigint;
}

/**
 * Tam-kapatma tamponu: underlying borç/teminata küçük pay ekle ki read↔submit arası
 * faiz tahakkukuna rağmen Blend bakiyeye KAPAYIP tam kapatsın. Over-buffer zararsız —
 * Blend mevcut bakiyeye cap'ler (canlı doğrulandı 2026-06-03). i128::MAX YASAK (overflow→trap).
 */
const CLOSE_BUFFER_BPS = 200n; // +%2
function withCloseBuffer(amount: bigint): bigint {
  return (amount * (10_000n + CLOSE_BUFFER_BPS)) / 10_000n;
}

/** Single-asset MVP — kullanıcının ilk non-zero collateral'i. */
function resolvePosition(
  reserves: ReserveSnapshot[] | undefined,
  collateral: Record<number, bigint>,
  debt: Record<number, bigint>,
): ResolvedPosition | null {
  if (!reserves || reserves.length === 0) return null;
  for (const r of reserves) {
    const c = collateral[r.index] ?? 0n;
    const d = debt[r.index] ?? 0n;
    if (c === 0n && d === 0n) continue;
    const assetId = ASSETS.find((id) => sacAddressFor(id) === r.asset);
    if (!assetId) continue;
    return { assetId, reserve: r, collateralUnderlying: c, debtUnderlying: d };
  }
  return null;
}

export function DashboardLive({ address }: Props) {
  const reservesQ = usePoolReserves();
  const blendPosQ = useUserBlendPosition(address);
  const positionQ = usePosition(address);

  const resolved = useMemo(
    () =>
      resolvePosition(
        reservesQ.data,
        blendPosQ.data?.collateral ?? {},
        blendPosQ.data?.liabilities ?? {},
      ),
    [reservesQ.data, blendPosQ.data],
  );

  const oracleQ = usePoolOraclePrice(resolved?.assetId ?? "USDC", {
    enabled: resolved != null,
  });
  const oraclePrice = oracleQ.data?.price ?? null;

  const hfComputed = useMemo(() => {
    if (!resolved || !reservesQ.data || !oraclePrice) return null;
    const prices = new Map<string, bigint>();
    prices.set(resolved.reserve.asset, oraclePrice);
    return computeUserHfBps(
      {
        user: address,
        collateral: { [resolved.reserve.index]: resolved.collateralUnderlying },
        liabilities: { [resolved.reserve.index]: resolved.debtUnderlying },
        hasPosition: true,
      },
      reservesQ.data,
      prices,
    );
  }, [resolved, reservesQ.data, oraclePrice, address]);

  if (blendPosQ.isLoading || reservesQ.isLoading) {
    return <SkeletonPanel label="Pozisyon yükleniyor…" />;
  }
  if (blendPosQ.error || reservesQ.error) {
    return <SkeletonPanel label="Pool okuma başarısız — RPC erişimi olmayabilir." tone="warn" />;
  }
  if (!resolved) {
    return <EmptyState />;
  }

  const meta = ASSET_META[resolved.assetId];

  return (
    <>
      <KpiGrid
        meta={meta}
        resolved={resolved}
        oraclePrice={oraclePrice}
        oracleFreshness={oracleQ.data?.freshness ?? null}
        hf={hfComputed}
        leverageBps={positionQ.data?.effectiveLeverageBps ?? null}
        leverageSource={positionQ.data?.leverageSource ?? "none"}
      />
      <PositionDetail
        address={address}
        meta={meta}
        resolved={resolved}
        oraclePrice={oraclePrice}
        oracleFreshness={oracleQ.data?.freshness ?? null}
        hf={hfComputed}
      />
      <OptInPanel address={address} />
      <PushPanel />
      <LastRebalanceStrip />
      <CopilotLauncher
        context={{
          page: "dashboard",
          position: {
            assetId: resolved.assetId,
            collateralUnderlying: Number(resolved.collateralUnderlying) / 10 ** meta.decimals,
            debtUnderlying: Number(resolved.debtUnderlying) / 10 ** meta.decimals,
            hfFloat: hfComputed ? hfBpsToFloat(hfComputed.hfBps) : null,
            leverageX:
              positionQ.data?.effectiveLeverageBps != null
                ? positionQ.data.effectiveLeverageBps / 100
                : null,
          },
        }}
      />
    </>
  );
}

/* ───────────────────────── KPI ───────────────────────── */

interface KpiProps {
  meta: (typeof ASSET_META)[AssetId];
  resolved: ResolvedPosition;
  oraclePrice: bigint | null;
  oracleFreshness: "fresh" | "warn" | "stale" | null;
  hf: ReturnType<typeof computeUserHfBps>;
  leverageBps: number | null;
  leverageSource: "meta" | "blend-fallback" | "none";
}

function KpiGrid({
  meta,
  resolved,
  oraclePrice,
  oracleFreshness,
  hf,
  leverageBps,
  leverageSource,
}: KpiProps) {
  const collateralLabel = formatPrincipal(resolved.collateralUnderlying, meta.decimals, 4);
  const debtLabel = formatPrincipal(resolved.debtUnderlying, meta.decimals, 4);
  const equityRaw =
    resolved.collateralUnderlying - resolved.debtUnderlying > 0n
      ? resolved.collateralUnderlying - resolved.debtUnderlying
      : 0n;
  const equityLabel = formatPrincipal(equityRaw, meta.decimals, 4);
  const hfFloat = hf?.hfBps != null ? hfBpsToFloat(hf.hfBps) : null;
  const leverageLabel = leverageBps != null ? `${(leverageBps / 100).toFixed(2)}×` : "—";

  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <StatTile label="Toplam collateral" value={`${collateralLabel} ${resolved.assetId}`} />
      <StatTile label="Toplam borç" value={`${debtLabel} ${resolved.assetId}`} />
      <StatTile label="Net equity (raw)" value={`${equityLabel} ${resolved.assetId}`} />
      <div className="rounded-md bg-space-700 border border-border-default p-3 flex flex-col gap-1">
        <span className="text-micro uppercase tracking-wider text-text-low">Health factor</span>
        {hfFloat != null ? (
          <HealthFactorBadge hf={hfFloat} />
        ) : (
          <span className="text-caption text-text-low">
            {oraclePrice ? "borç yok (∞)" : "oracle bekleniyor"}
          </span>
        )}
        {oracleFreshness && oracleFreshness !== "fresh" && (
          <span className="text-caption text-warn">
            ⚠️ oracle {oracleFreshness === "stale" ? "stale" : "warn"}
          </span>
        )}
      </div>
      <div className="rounded-md bg-space-700 border border-border-default p-3 flex flex-col gap-1">
        <span className="text-micro uppercase tracking-wider text-text-low">Leverage</span>
        <span className="text-numeric-lg text-text-high font-mono tabular" data-num>
          {leverageLabel}
        </span>
        <span className="text-caption text-text-low">
          {leverageSource === "meta"
            ? "Helios meta"
            : leverageSource === "blend-fallback"
              ? "Blend fallback (§6.4)"
              : "—"}
        </span>
      </div>
    </section>
  );
}

/* ───────────────────────── Position detail + close ───────────────────────── */

interface DetailProps {
  address: string;
  meta: (typeof ASSET_META)[AssetId];
  resolved: ResolvedPosition;
  oraclePrice: bigint | null;
  oracleFreshness: "fresh" | "warn" | "stale" | null;
  hf: ReturnType<typeof computeUserHfBps>;
}

function PositionDetail({
  address,
  meta,
  resolved,
  oraclePrice,
  oracleFreshness,
  hf,
}: DetailProps) {
  const liqPrice = useMemo(() => {
    if (!oraclePrice || !hf) return null;
    try {
      return calcLiquidationPrice(oraclePrice, hf.totalCollateralBase, hf.totalLiabilityBase);
    } catch {
      return null;
    }
  }, [oraclePrice, hf]);

  // Şok ızgarası için collateral/liability base'i hf'den al; oracle yoksa
  // raw + factor'lerle approximate üret.
  const collateralBase =
    hf?.totalCollateralBase ??
    effectiveCollateral(resolved.collateralUnderlying, resolved.reserve.cFactorBps);
  const liabilityBase =
    hf?.totalLiabilityBase ??
    (resolved.debtUnderlying > 0n
      ? effectiveLiability(resolved.debtUnderlying, resolved.reserve.lFactorBps)
      : 0n);

  return (
    <section className="rounded-lg bg-space-700 border border-border-default p-5 flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h2 className="text-h2 text-text-high m-0">Pozisyon · {meta.label}</h2>
        <p className="text-caption text-text-low m-0">
          Single-asset MVP — collateral ve debt aynı reserve. PnL Neon indexer kuruluncaya kadar
          &quot;—&quot; (meta yükleniyor).
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-body">
        <DetailRow label="Asset" value={meta.label} />
        <DetailRow
          label="Collateral (b-token underlying)"
          value={`${formatPrincipal(resolved.collateralUnderlying, meta.decimals, 4)} ${resolved.assetId}`}
          mono
        />
        <DetailRow
          label="Borç (d-token underlying)"
          value={`${formatPrincipal(resolved.debtUnderlying, meta.decimals, 4)} ${resolved.assetId}`}
          mono
        />
        <DetailRow
          label="Oracle"
          value={oraclePrice ? `${(Number(oraclePrice) / 1e7).toFixed(4)} USD` : "—"}
          mono
        />
        <DetailRow
          label="Likidasyon fiyatı"
          value={
            liqPrice && oraclePrice
              ? `${(Number(liqPrice) / 1e7).toFixed(4)} USD (${(
                  (Number(oraclePrice - liqPrice) / Number(oraclePrice)) *
                  100
                ).toFixed(1)}% düşüş)`
              : "—"
          }
          mono
        />
        <DetailRow label="PnL" value="— (Neon meta yükleniyor)" mono />
      </div>

      <IsolatedErrorBoundary label="HF projeksiyon grafiği yüklenemedi">
        <HfProjectionChart collateralBase={collateralBase} liabilityBase={liabilityBase} />
      </IsolatedErrorBoundary>

      <IsolatedErrorBoundary label="Risk Radar (Monte Carlo) yüklenemedi">
        <RiskRadar
          collateralBase={collateralBase}
          liabilityBase={liabilityBase}
          spotPriceI128={oraclePrice}
        />
      </IsolatedErrorBoundary>

      <CloseFlow address={address} resolved={resolved} meta={meta} />

      <p className="text-caption text-text-low m-0">
        ⚠️ Testnet · unaudited · yatırım tavsiyesi değildir. Oracle {oracleFreshness ?? "fresh"} ·
        HF eşik <span className="text-hf-danger">1.00</span>.
      </p>
    </section>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-micro uppercase tracking-wider text-text-low">{label}</span>
      <span
        className={`text-body text-text-high ${mono ? "font-mono tabular" : ""}`}
        data-num={mono ? "" : undefined}
      >
        {value}
      </span>
    </div>
  );
}

/* ───────────────────────── Close flow ───────────────────────── */

function CloseFlow({
  address,
  resolved,
  meta,
}: {
  address: string;
  resolved: ResolvedPosition;
  meta: (typeof ASSET_META)[AssetId];
}) {
  const queryClient = useQueryClient();
  const [simulateOn, setSimulateOn] = useState(false);
  const [result, setResult] = useState<SignAndSendResult | null>(null);

  const closeParams = useMemo(() => {
    if (resolved.debtUnderlying <= 0n || resolved.collateralUnderlying <= 0n) return null;
    // Tam-kapatma: underlying + tampon (Blend cap'ler). collateral ≥ debt invariyantı
    // korunur (collateral > debt + ikisi de aynı oranla buffer'lanır).
    return {
      userAddress: address,
      assetId: resolved.assetId,
      debtAmount: withCloseBuffer(resolved.debtUnderlying),
      collateralAmount: withCloseBuffer(resolved.collateralUnderlying),
    };
  }, [address, resolved]);

  const simQ = useSimulateClosePosition(closeParams, { enabled: simulateOn });
  const sendM = useClosePositionSend({
    onSuccess: (res) => {
      setResult(res);
      // Optimistic UI: position → boş.
      queryClient.setQueryData(positionQueryKey(address), null);
      void queryClient.invalidateQueries({ queryKey: ["helios", "blend"] });
      try {
        // RSC cache rebust — yalnız Server Action/RH garantili; client'ta sessiz fail OK.
        const updateTag = (globalThis as unknown as { updateTag?: (tag: string) => void })
          .updateTag;
        updateTag?.(`${REFRESH_TAG_PREFIX}${address}`);
      } catch {
        /* sessiz */
      }
    },
    onError: (err) => {
      pushAppError(normalizeError(err));
    },
  });

  if (result) {
    return (
      <div className="rounded-md bg-aurora-teal-soft border border-aurora-teal p-4 flex flex-col gap-2">
        <strong className="text-text-high">Pozisyon kapatıldı ✓</strong>
        <a
          href={txExplorerLink(result.hash)}
          target="_blank"
          rel="noreferrer noopener"
          className="text-caption font-mono text-aurora-teal underline-offset-2 hover:underline break-all"
        >
          {result.hash}
        </a>
      </div>
    );
  }

  if (!closeParams) {
    return (
      <p className="text-caption text-text-low m-0">Pozisyon kapatma için borç+teminat gerekli.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md bg-space-600 border border-border-default p-4">
      <header className="flex items-baseline justify-between">
        <h3 className="text-h3 text-text-high m-0">Pozisyonu kapat</h3>
        <span className="text-caption text-text-low">
          Borç:{" "}
          <code className="font-mono">
            {formatPrincipal(resolved.debtUnderlying, meta.decimals, 4)} {resolved.assetId}
          </code>{" "}
          · Çekiş:{" "}
          <code className="font-mono">
            {formatPrincipal(resolved.collateralUnderlying, meta.decimals, 4)} {resolved.assetId}
          </code>
        </span>
      </header>

      {!simulateOn && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSimulateOn(true)}
            className="rounded-md bg-aurora-amber text-text-on-aurora h-11 px-5 font-semibold hover:bg-aurora-amber-glow"
            data-cta="close-simulate"
          >
            Simulate close
          </button>
          <span className="text-caption text-text-low">
            # DOĞRULA — close uçtan uca canlı doğrulanmadı (yalnız open). Simulate önizleme geçerse
            imza tetikleyebilirsin; hata olursa rapor edilir.
          </span>
        </div>
      )}

      {simulateOn && (
        <SimulateAndSign
          simQ={simQ}
          onSign={(preparedTx) => sendM.mutate({ preparedTx, userAddress: address })}
          isPending={sendM.isPending}
          ctaLabel="Sign & Close"
          dataCta="close-sign"
        />
      )}
    </div>
  );
}

/* ───────────────────────── Opt-in ───────────────────────── */

function OptInPanel({ address }: { address: string }) {
  const queryClient = useQueryClient();
  const [trigger, setTrigger] = useState(130);
  const [target, setTarget] = useState(180);
  const [maxDeleverage, setMaxDeleverage] = useState(5000);
  const [simulateOn, setSimulateOn] = useState(false);
  const [result, setResult] = useState<SignAndSendResult | null>(null);

  const params = {
    userAddress: address,
    triggerHfBps: trigger,
    targetHfBps: target,
    maxDeleverageBps: maxDeleverage,
  };

  const simQ = useSimulateRegisterOptIn(simulateOn ? params : null, { enabled: simulateOn });
  const sendM = useRegisterOptInSend({
    onSuccess: (res) => {
      setResult(res);
      void queryClient.invalidateQueries({ queryKey: ["helios", "contract", "opt-in"] });
      // PROMPT 29: off-chain keeper cron taraması için KV indeksine ekle.
      // Kontrat authoritative; indeks sadece "kimi taramalı" ipucu.
      void fetch("/api/keeper/optin-index", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "add" }),
      }).catch(() => {
        /* sessiz — KV yoksa cron env list'ten okur */
      });
    },
    onError: (err) => pushAppError(normalizeError(err)),
  });

  return (
    <section className="rounded-lg bg-space-700 border border-border-default p-5 flex flex-col gap-4">
      <header>
        <h2 className="text-h2 text-text-high m-0">Auto-Rebalance opt-in</h2>
        <p className="text-caption text-text-low m-0 mt-1">
          HF eşiği altına düşerse off-chain keeper (PROMPT 29) Helios rebalance&apos;ı tetikler.
          On-chain kayıt yalnız tercihin: cron çalıştırması ayrı.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <NumberField
          label="Trigger HF (×100)"
          value={trigger}
          min={100}
          max={500}
          step={5}
          onChange={(v) => setTrigger(v)}
          hint={`= ${(trigger / 100).toFixed(2)}; rebalance HF<this`}
        />
        <NumberField
          label="Target HF (×100)"
          value={target}
          min={trigger + 1}
          max={1000}
          step={5}
          onChange={(v) => setTarget(v)}
          hint={`= ${(target / 100).toFixed(2)}; rebalance sonrası hedef`}
        />
        <NumberField
          label="Max deleverage (bps)"
          value={maxDeleverage}
          min={100}
          max={10000}
          step={100}
          onChange={(v) => setMaxDeleverage(v)}
          hint={`= %${(maxDeleverage / 100).toFixed(0)}; tek seferde kapanan borç tavanı`}
        />
      </div>

      {result ? (
        <div className="rounded-md bg-aurora-teal-soft border border-aurora-teal p-4 flex flex-col gap-1">
          <strong className="text-text-high">Opt-in kayıtlı ✓</strong>
          <a
            href={txExplorerLink(result.hash)}
            target="_blank"
            rel="noreferrer noopener"
            className="text-caption font-mono text-aurora-teal underline-offset-2 hover:underline break-all"
          >
            {result.hash}
          </a>
        </div>
      ) : !simulateOn ? (
        <button
          type="button"
          onClick={() => setSimulateOn(true)}
          className="self-start rounded-md bg-aurora-amber text-text-on-aurora h-11 px-5 font-semibold hover:bg-aurora-amber-glow"
          data-cta="optin-simulate"
        >
          Simulate opt-in
        </button>
      ) : (
        <SimulateAndSign
          simQ={simQ}
          onSign={(preparedTx) => sendM.mutate({ preparedTx, userAddress: address })}
          isPending={sendM.isPending}
          ctaLabel="Sign & Enable"
          dataCta="optin-sign"
        />
      )}
    </section>
  );
}

function NumberField({
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
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className="rounded-md bg-space-700 border border-border-default px-3 h-11 text-body text-text-high font-mono tabular focus-visible:outline-3 focus-visible:outline-aurora-teal"
      />
      <span className="text-caption text-text-low">{hint}</span>
    </label>
  );
}

/* ───────────────────────── Shared simulate→sign ───────────────────────── */

function SimulateAndSign<
  Q extends {
    data?: { preparedTx: unknown; minResourceFee: bigint | null; latestLedger: number } | undefined;
    isFetching: boolean;
    error: Error | null;
  },
>({
  simQ,
  onSign,
  isPending,
  ctaLabel,
  dataCta,
}: {
  simQ: Q;
  onSign: (preparedTx: never) => void;
  isPending: boolean;
  ctaLabel: string;
  dataCta: string;
}) {
  const isSimulating = simQ.isFetching && !simQ.data;
  const preview = simQ.data;
  const simError = simQ.error;

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-caption text-text-medium">
        <dt className="text-text-low">Min resource fee</dt>
        <dd className="text-right font-mono tabular" data-num>
          {preview?.minResourceFee?.toString() ?? (isSimulating ? "…" : "—")}
        </dd>
        <dt className="text-text-low">Latest ledger</dt>
        <dd className="text-right font-mono tabular" data-num>
          {preview?.latestLedger ?? (isSimulating ? "…" : "—")}
        </dd>
      </dl>
      {simError && (
        <div
          role="alert"
          className="rounded-md border border-danger bg-danger-soft p-3 text-caption text-danger"
        >
          <strong className="block">Simulate başarısız</strong>
          <span className="font-mono text-micro break-all">{simError.message}</span>
        </div>
      )}
      <button
        type="button"
        disabled={!preview || isPending}
        onClick={() => preview && onSign(preview.preparedTx as never)}
        className="self-start rounded-md bg-aurora-amber text-text-on-aurora h-11 px-5 font-semibold disabled:opacity-50 hover:bg-aurora-amber-glow"
        data-cta={dataCta}
      >
        {isPending ? "Cüzdan açılıyor…" : ctaLabel}
      </button>
    </div>
  );
}

/* ───────────────────────── Empty / skeleton ───────────────────────── */

function EmptyState() {
  return (
    <section className="rounded-lg bg-space-700 border border-border-default p-8 flex flex-col items-center gap-4 text-center">
      <h2 className="text-h2 text-text-high m-0">Henüz pozisyon yok</h2>
      <p className="text-body text-text-medium max-w-md m-0">
        İlk kaldıraçlı pozisyonunu aç — wizard seni asset/principal/leverage seçiminden tek atomik
        tx&apos;e götürür. Same-asset MVP cap 2× (XLM-bound, AUDIT 2026-06-02).
      </p>
      <Link
        href="/open"
        className="rounded-md bg-aurora-amber text-text-on-aurora h-12 px-6 inline-flex items-center font-semibold hover:bg-aurora-amber-glow"
        data-cta="open-first-position"
      >
        İlk pozisyonunu aç →
      </Link>
    </section>
  );
}

function SkeletonPanel({ label, tone = "info" }: { label: string; tone?: "info" | "warn" }) {
  return (
    <section
      className={`rounded-lg bg-space-700 border ${
        tone === "warn" ? "border-warn" : "border-border-default"
      } p-6`}
    >
      <p className={`text-body m-0 ${tone === "warn" ? "text-warn" : "text-text-low"}`}>{label}</p>
    </section>
  );
}

// HF_LIQUIDATION_BPS şu an unused; ileride "live HF<1.05 ise CTA disabled" UI için
// bekletildi. PROMPT 24 (faucet) sonrası gerçek değerlerle aktif.
void HF_LIQUIDATION_BPS;
void riskBand;
