"use client";

import { ASSET_META, VAULTS } from "@helios/sdk";
import { Coins } from "lucide-react";

import { useWizard } from "../_state/wizard-store";

/** 4 vault grid (USDC/XLM/wBTC/wETH). */
export function AssetPicker() {
  const assetId = useWizard((s) => s.assetId);
  const setAsset = useWizard((s) => s.setAsset);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-h3 text-text-high m-0">1. Asset</legend>
      <p className="text-caption text-text-low m-0">
        Helios MVP&apos;de single-asset stratejisi: collateral ve borç aynı asset.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
        {VAULTS.map((vault) => {
          const meta = ASSET_META[vault.id];
          const selected = assetId === vault.id;
          return (
            <button
              key={vault.id}
              type="button"
              onClick={() => setAsset(vault.id)}
              aria-pressed={selected}
              className={`group flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors ${
                selected
                  ? "border-aurora-amber bg-aurora-amber/10"
                  : "border-border-default bg-space-700 hover:border-border-strong"
              }`}
              data-asset={vault.id}
            >
              <Coins
                className={`size-5 ${selected ? "text-aurora-amber" : "text-text-low"}`}
                aria-hidden="true"
              />
              <span className="text-h4 text-text-high m-0">{vault.label}</span>
              <span className="text-caption text-text-low m-0">
                decimals {meta.decimals} · max {(vault.maxLeverageBps / 100).toFixed(1)}×
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
