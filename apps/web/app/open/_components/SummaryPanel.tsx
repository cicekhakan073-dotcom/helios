"use client";

import { ASSET_META, hfBpsToFloat } from "@helios/sdk";
import { Button } from "@helios/ui";
import Link from "next/link";

import { formatLeverage, formatPrincipal, useWizard } from "../_state/wizard-store";

import type { LivePreviewResult } from "./LivePreview";

interface Props {
  preview: LivePreviewResult;
}

/**
 * Özet kartı — kullanıcının ne aldığını / ne riske girdiğini açık dille gösterir.
 * "Continue to confirm" sadece guard'lar geçtiğinde aktif (PROMPT 22'ye geçiş).
 */
export function SummaryPanel({ preview }: Props) {
  const assetId = useWizard((s) => s.assetId);
  const principalRaw = useWizard((s) => s.principalRaw);
  const leverageBps = useWizard((s) => s.leverageBps);
  const meta = ASSET_META[assetId];

  const hfFloat = preview.hfBps != null ? hfBpsToFloat(preview.hfBps) : null;
  const canContinue = preview.hasInputs && preview.guardsPassed;

  // Disabled sebebi
  let disabledReason: string | null = null;
  if (!preview.hasInputs) {
    disabledReason = "Principal değeri girin";
  } else if (leverageBps > 500) {
    disabledReason = "Leverage 5× üst sınırı aşıyor";
  } else if (hfFloat != null && hfFloat < 1.3) {
    disabledReason = "Açılış HF minimum 1.30 olmalı";
  } else if (preview.errors.length > 0) {
    disabledReason = "Hesap hatası — girdileri kontrol edin";
  }

  return (
    <section className="rounded-lg bg-space-700 border border-border-default p-5 flex flex-col gap-4">
      <h3 className="text-h3 text-text-high m-0">Özet</h3>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body">
        <dt className="text-text-low">Vault</dt>
        <dd className="text-text-high text-right m-0 font-mono tabular">{meta.label}</dd>

        <dt className="text-text-low">Principal</dt>
        <dd className="text-text-high text-right m-0 font-mono tabular" data-num>
          {principalRaw || "—"} {assetId}
        </dd>

        <dt className="text-text-low">Leverage</dt>
        <dd className="text-text-high text-right m-0 font-mono tabular" data-num>
          {formatLeverage(leverageBps)}
        </dd>

        <dt className="text-text-low">Toplam collateral</dt>
        <dd className="text-text-high text-right m-0 font-mono tabular" data-num>
          {preview.totalCollateral != null
            ? `${formatPrincipal(preview.totalCollateral, meta.decimals, 4)} ${assetId}`
            : "—"}
        </dd>

        <dt className="text-text-low">Borç</dt>
        <dd className="text-text-high text-right m-0 font-mono tabular" data-num>
          {preview.borrowAmount != null
            ? `${formatPrincipal(preview.borrowAmount, meta.decimals, 4)} ${assetId}`
            : "—"}
        </dd>

        <dt className="text-text-low">HF (açılış)</dt>
        <dd className="text-text-high text-right m-0 font-mono tabular" data-num>
          {hfFloat != null ? hfFloat.toFixed(2) : "∞"}
        </dd>
      </dl>

      <ul className="text-caption text-text-low list-disc pl-5 m-0 flex flex-col gap-1">
        <li>Tek atomik tx — flash + supply + borrow + flash repay.</li>
        <li>HF Blend pool parametrelerinden okunur (gerçek değerler PROMPT 24 sonrası).</li>
        <li>Oracle staleness ve TWAP sanity bound on-chain uygulanır.</li>
        <li>⚠️ Testnet · unaudited · yatırım tavsiyesi değildir.</li>
      </ul>

      {canContinue ? (
        <Link
          href="/open/confirm"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-aurora-amber text-text-on-aurora px-5 h-12 font-semibold hover:bg-aurora-amber-glow shadow-glow-amber transition-[background,box-shadow] duration-[120ms]"
          data-cta="continue-to-confirm"
        >
          Continue to confirm
        </Link>
      ) : (
        <div className="flex flex-col gap-1">
          <Button variant="primary" size="lg" disabled>
            Continue to confirm
          </Button>
          {disabledReason && (
            <p className="text-caption text-text-low m-0">{disabledReason}</p>
          )}
        </div>
      )}
    </section>
  );
}
