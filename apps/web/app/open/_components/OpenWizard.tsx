"use client";

import { CopilotLauncher } from "../../_components/copilot/CopilotLauncher";
import { useWizard } from "../_state/wizard-store";

import { AssetPicker } from "./AssetPicker";
import { LeverageSlider } from "./LeverageSlider";
import { LivePreview, useLivePreview } from "./LivePreview";
import { PrincipalInput } from "./PrincipalInput";
import { SummaryPanel } from "./SummaryPanel";

/**
 * Open Position wizard root.
 *
 * Sol kolon: 3 step (AssetPicker + PrincipalInput + LeverageSlider).
 * Sağ kolon: canlı önizleme (Risk Gauge + HF + stat'lar) ve özet (Continue CTA).
 *
 * Tek hesap noktası `useLivePreview` — store değişiminde useMemo ile recompute.
 */
export function OpenWizard() {
  const preview = useLivePreview();
  const assetId = useWizard((s) => s.assetId);
  const leverageBps = useWizard((s) => s.leverageBps);
  const principalRaw = useWizard((s) => s.principalRaw);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
      <div className="flex flex-col gap-10">
        <AssetPicker />
        <PrincipalInput />
        <LeverageSlider />
      </div>
      <div className="flex flex-col gap-6">
        <LivePreview result={preview} />
        <SummaryPanel preview={preview} />
      </div>
      <CopilotLauncher
        context={{
          page: "open",
          wizard: { assetId, leverageBps, principalRaw },
        }}
      />
    </div>
  );
}
