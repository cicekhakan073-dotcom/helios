"use client";

import { useWizard } from "../_state/wizard-store";

const QUICK = [100, 1_000, 10_000];

export function PrincipalInput() {
  const assetId = useWizard((s) => s.assetId);
  const principalRaw = useWizard((s) => s.principalRaw);
  const setRaw = useWizard((s) => s.setPrincipalRaw);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-h3 text-text-high m-0">2. Principal</legend>
      <p className="text-caption text-text-low m-0">
        Yatıracağın başlangıç tutarı (asset native birimde, ondalık nokta).
      </p>
      <div className="relative">
        <input
          inputMode="decimal"
          aria-label={`${assetId} miktarı`}
          value={principalRaw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={`0.00 ${assetId}`}
          className="w-full rounded-md bg-space-700 border border-border-default px-4 h-14 text-numeric-lg text-text-high font-mono tabular focus-visible:outline-3 focus-visible:outline-aurora-teal focus-visible:outline-offset-2"
          data-num
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-caption text-text-low font-mono">
          {assetId}
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setRaw(String(q))}
            className="rounded-sm bg-space-600 text-caption text-text-medium px-3 py-1 hover:bg-space-500 transition-colors"
          >
            {q.toLocaleString("tr-TR")}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
