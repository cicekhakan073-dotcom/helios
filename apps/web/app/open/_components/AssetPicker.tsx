"use client";

import { ASSET_META, usePoolOraclePrice, VAULTS, type AssetId } from "@helios/sdk";
import { Coins } from "lucide-react";

import { useWizard } from "../_state/wizard-store";

interface VaultLike {
  id: AssetId;
  label: string;
  maxLeverageBps: number;
}

/** 4 vault grid (USDC/XLM/wBTC/wETH). Fiyat akışı olmayan asset'ler disable. */
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
        {VAULTS.map((vault) => (
          <AssetCard
            key={vault.id}
            vault={vault}
            selected={assetId === vault.id}
            onSelect={setAsset}
          />
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Tek vault kartı — kendi pool-oracle fiyatını okur (AUDIT 2026-06-02 §6.1 +
 * DOĞRULAMA 2026-06-02). Fiyat akışı YOKSA (oracle lastprice=null, örn. testnet
 * wBTC/wETH) kart disable + "fiyat akışı yok" rozeti. Data-driven: feed açılırsa
 * otomatik aktifleşir, hardcode yok. Yüklenirken disable ETMEZ (flash önlenir).
 */
function AssetCard({
  vault,
  selected,
  onSelect,
}: {
  vault: VaultLike;
  selected: boolean;
  onSelect: (id: AssetId) => void;
}) {
  const meta = ASSET_META[vault.id];
  const priceQ = usePoolOraclePrice(vault.id);
  // Yalnız KESİN fiyatsız ise disable: query başarıyla döndü ve data === null.
  const noFeed = priceQ.isSuccess && priceQ.data === null;

  return (
    <button
      type="button"
      onClick={() => {
        if (!noFeed) onSelect(vault.id);
      }}
      aria-pressed={selected}
      aria-disabled={noFeed}
      disabled={noFeed}
      className={`group flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors ${
        noFeed
          ? "border-border-subtle bg-space-800 opacity-50 cursor-not-allowed"
          : selected
            ? "border-aurora-amber bg-aurora-amber/10"
            : "border-border-default bg-space-700 hover:border-border-strong"
      }`}
      data-asset={vault.id}
      data-no-feed={noFeed ? "true" : "false"}
    >
      <Coins
        className={`size-5 ${selected && !noFeed ? "text-aurora-amber" : "text-text-low"}`}
        aria-hidden="true"
      />
      <span className="text-h4 text-text-high m-0">{vault.label}</span>
      {noFeed ? (
        <span className="text-micro uppercase tracking-wider text-warn bg-warn-soft rounded-sm px-2 py-0.5">
          Fiyat akışı yok · testnet
        </span>
      ) : (
        <span className="text-caption text-text-low m-0">
          decimals {meta.decimals} · max {(vault.maxLeverageBps / 100).toFixed(1)}×
        </span>
      )}
    </button>
  );
}
