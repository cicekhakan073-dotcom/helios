"use client";

import {
  ASSET_META,
  effectiveCollateral,
  effectiveLiability,
  hfBpsToFloat,
  healthFactorBps,
  HF_LIQUIDATION_BPS,
  HfError,
  liquidationPrice as calcLiquidationPrice,
  riskBand,
  useOraclePrice,
} from "@helios/sdk";
import { HealthFactorBadge, RiskGauge, StatTile } from "@helios/ui";
import { useMemo } from "react";

import { formatPrincipal, parsePrincipal, useWizard } from "../_state/wizard-store";

// MVP Blend reserve assumption — gerçek değerler PROMPT 24 sonrası canlı pool'dan
// okunacak. Bunlar `default_reserve_config()` mock'ıyla aynı (c=0.85, l=0.80).
const ASSUMED_C_FACTOR_BPS = 8500;
const ASSUMED_L_FACTOR_BPS = 8000;

const MIN_OPEN_HF_BPS = 130n; // strategy_router.init min_open_hf_bps (1.30)
const MAX_LEVERAGE_BPS_GUARD = 500; // strategy_router.init max_leverage_bps

export interface LivePreviewResult {
  hasInputs: boolean;
  hfBps: bigint | null;
  hfBand: "healthy" | "caution" | "danger" | "liquidatable" | null;
  liquidationPriceI128: bigint | null;
  liqDistancePct: number | null;
  totalCollateral: bigint | null;
  borrowAmount: bigint | null;
  oraclePriceReady: boolean;
  errors: string[];
  guardsPassed: boolean;
}

export function useLivePreview(): LivePreviewResult {
  const assetId = useWizard((s) => s.assetId);
  const principalRaw = useWizard((s) => s.principalRaw);
  const leverageBps = useWizard((s) => s.leverageBps);
  const meta = ASSET_META[assetId];

  const oracleQ = useOraclePrice(assetId, { enabled: meta.reflector.kind === "Other" });
  const oraclePrice = oracleQ.data?.price ?? null;

  return useMemo(() => {
    const errors: string[] = [];
    const principal = parsePrincipal(principalRaw, meta.decimals);

    if (principal == null || principal <= 0n) {
      return {
        hasInputs: false,
        hfBps: null,
        hfBand: null,
        liquidationPriceI128: null,
        liqDistancePct: null,
        totalCollateral: null,
        borrowAmount: null,
        oraclePriceReady: !!oraclePrice,
        errors,
        guardsPassed: false,
      };
    }

    // flash_amount = principal × (leverage − 100) / 100
    const flashAmount = (principal * BigInt(leverageBps - 100)) / 100n;
    const totalCollateral = principal + flashAmount;
    const borrowAmount = flashAmount;

    if (borrowAmount === 0n) {
      // 1x — leverage yok, klasik supply
      return {
        hasInputs: true,
        hfBps: null,
        hfBand: null,
        liquidationPriceI128: null,
        liqDistancePct: null,
        totalCollateral,
        borrowAmount,
        oraclePriceReady: !!oraclePrice,
        errors,
        guardsPassed: leverageBps <= MAX_LEVERAGE_BPS_GUARD,
      };
    }

    let hfBps: bigint | null = null;
    let hfBand: ReturnType<typeof riskBand> | null = null;
    let liquidationPriceI128: bigint | null = null;
    let liqDistancePct: number | null = null;

    try {
      const effColl = effectiveCollateral(totalCollateral, ASSUMED_C_FACTOR_BPS);
      const effLiab = effectiveLiability(borrowAmount, ASSUMED_L_FACTOR_BPS);
      hfBps = healthFactorBps(effColl, effLiab);
      hfBand = riskBand(hfBps);

      if (oraclePrice && oraclePrice > 0n) {
        liquidationPriceI128 = calcLiquidationPrice(oraclePrice, effColl, effLiab);
        // % distance — basit cinsten (liq fiyatı current'a göre ne kadar düşük)
        const liqFloat = Number(liquidationPriceI128);
        const priceFloat = Number(oraclePrice);
        liqDistancePct = ((priceFloat - liqFloat) / priceFloat) * 100;
      }
    } catch (err) {
      if (err instanceof HfError) {
        errors.push(err.message);
      } else {
        errors.push("HF hesabı başarısız");
      }
    }

    const guardsPassed =
      leverageBps <= MAX_LEVERAGE_BPS_GUARD &&
      hfBps != null &&
      hfBps >= MIN_OPEN_HF_BPS &&
      errors.length === 0;

    return {
      hasInputs: true,
      hfBps,
      hfBand,
      liquidationPriceI128,
      liqDistancePct,
      totalCollateral,
      borrowAmount,
      oraclePriceReady: !!oraclePrice,
      errors,
      guardsPassed,
    };
  }, [principalRaw, leverageBps, meta.decimals, oraclePrice]);
}

/** Yan panel — canlı türetilen metrikler + risk göstergesi. */
export function LivePreview({ result }: { result: LivePreviewResult }) {
  const assetId = useWizard((s) => s.assetId);
  const meta = ASSET_META[assetId];

  const hfFloat = result.hfBps != null ? hfBpsToFloat(result.hfBps) : null;

  return (
    <aside
      aria-live="polite"
      className="flex flex-col gap-4 rounded-lg bg-space-700 border border-border-default p-5"
    >
      <header>
        <h3 className="text-h3 text-text-high m-0">Canlı önizleme</h3>
        <p className="text-caption text-text-low m-0">
          Slider/principal değiştikçe anında güncellenir.
        </p>
      </header>

      {!result.hasInputs ? (
        <p className="text-body text-text-low m-0">Asset + principal gir, hesap canlanır.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-text-low">Health Factor</span>
            {hfFloat != null ? (
              <HealthFactorBadge hf={hfFloat} />
            ) : (
              <span className="text-caption text-text-low">leverage 1× — HF ∞</span>
            )}
          </div>

          {hfFloat != null && (
            <div className="flex justify-center -my-2">
              <RiskGauge hf={hfFloat} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Total collateral"
              value={result.totalCollateral != null ? formatPrincipal(result.totalCollateral, meta.decimals, 2) : "—"}
            />
            <StatTile
              label="Borç (flash)"
              value={result.borrowAmount != null ? formatPrincipal(result.borrowAmount, meta.decimals, 2) : "—"}
            />
            <StatTile
              label="Liq. fiyatı"
              value={
                result.liquidationPriceI128 != null
                  ? result.liquidationPriceI128.toString()
                  : result.oraclePriceReady
                    ? "—"
                    : "oracle bekleniyor"
              }
            />
            <StatTile
              label="Liq. uzaklığı"
              value={result.liqDistancePct != null ? `${result.liqDistancePct.toFixed(1)}%` : "—"}
            />
          </div>

          {result.errors.length > 0 && (
            <ul className="list-disc pl-5 text-caption text-warn">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          {/* HF guard görsel uyarısı */}
          {hfFloat != null && hfFloat < 1.3 && (
            <p className="text-caption text-hf-danger m-0">
              ⚠️ HF {hfFloat.toFixed(2)} — minimum açılış eşiği <strong>1.30</strong> altında.
              Leverage&apos;ı düşür ya da principal&apos;ı artır.
            </p>
          )}
          {result.hfBps != null && result.hfBps < HF_LIQUIDATION_BPS && (
            <p className="text-caption text-hf-liquidatable m-0">
              ⚠️ HF 1.00 altında — pozisyon açılırken zaten likide olur.
            </p>
          )}
        </>
      )}

      <p className="text-caption text-text-low m-0 mt-2">
        ⚠️ Tüm değerler tahmini; testnet/unaudited. Yatırım tavsiyesi değildir.
      </p>
    </aside>
  );
}
