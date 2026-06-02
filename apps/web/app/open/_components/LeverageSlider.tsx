"use client";

import {
  formatLeverage,
  LEVERAGE_STEP_BPS,
  MAX_LEVERAGE_BPS,
  MIN_LEVERAGE_BPS,
  useWizard,
} from "../_state/wizard-store";

export function LeverageSlider() {
  const leverageBps = useWizard((s) => s.leverageBps);
  const setLeverage = useWizard((s) => s.setLeverageBps);

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-h3 text-text-high m-0">3. Leverage</legend>
      <p className="text-caption text-text-low m-0">
        Slider ile kaldıracı seç (1× = sade pozisyon, 5× = MAX). Klavye: ← / → ile ±0.25×.
      </p>
      <div className="flex items-center gap-4 mt-2">
        <input
          type="range"
          min={MIN_LEVERAGE_BPS}
          max={MAX_LEVERAGE_BPS}
          step={LEVERAGE_STEP_BPS}
          value={leverageBps}
          onChange={(e) => setLeverage(Number(e.target.value))}
          aria-label="Leverage"
          aria-valuemin={MIN_LEVERAGE_BPS}
          aria-valuemax={MAX_LEVERAGE_BPS}
          aria-valuenow={leverageBps}
          aria-valuetext={formatLeverage(leverageBps)}
          className="flex-1 accent-aurora-amber"
        />
        <span
          className="text-numeric-lg text-text-high tabular font-mono min-w-20 text-right"
          data-num
          aria-hidden="true"
        >
          {formatLeverage(leverageBps)}
        </span>
      </div>
      <div className="flex justify-between text-caption text-text-low font-mono">
        <span>1×</span>
        <span>2×</span>
        <span>3×</span>
        <span>4×</span>
        <span>5× max</span>
      </div>
    </fieldset>
  );
}
