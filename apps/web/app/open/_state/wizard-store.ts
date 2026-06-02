"use client";

/**
 * Open Position wizard state — Zustand.
 *
 * - assetId: USDC | XLM | wBTC | wETH
 * - principalRaw: input field raw string (UI'ya bağlı)
 * - principal: parse edilmiş bigint (asset native decimals; tek-asset MVP)
 * - leverageBps: 100..MAX (100 = 1x; step 25 = 0.25x)
 *
 * Persist edilmez — kullanıcı sekme kapatınca temizlenir (özellikle).
 */

import { create } from "zustand";

import type { AssetId } from "@helios/sdk";

const DEFAULT_ASSET: AssetId = "USDC";
const DEFAULT_LEVERAGE_BPS = 100; // 1x (slider başlangıcı)

export const MIN_LEVERAGE_BPS = 100;
export const MAX_LEVERAGE_BPS = 500; // 5x (strategy_router.init max_leverage_bps)
export const LEVERAGE_STEP_BPS = 25; // 0.25x

interface WizardState {
  assetId: AssetId;
  principalRaw: string;
  leverageBps: number;

  setAsset: (id: AssetId) => void;
  setPrincipalRaw: (v: string) => void;
  setLeverageBps: (v: number) => void;
  reset: () => void;
}

export const useWizard = create<WizardState>((set) => ({
  assetId: DEFAULT_ASSET,
  principalRaw: "",
  leverageBps: DEFAULT_LEVERAGE_BPS,

  setAsset: (id) => set({ assetId: id }),
  setPrincipalRaw: (v) => set({ principalRaw: v }),
  setLeverageBps: (v) =>
    set({
      leverageBps: Math.max(MIN_LEVERAGE_BPS, Math.min(MAX_LEVERAGE_BPS, Math.round(v))),
    }),
  reset: () =>
    set({
      assetId: DEFAULT_ASSET,
      principalRaw: "",
      leverageBps: DEFAULT_LEVERAGE_BPS,
    }),
}));

/** UI'da kullanılacak `bigint` principal — asset decimals'a göre ölçeklenmiş. */
export function parsePrincipal(raw: string, decimals: number): bigint | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = /^(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) return null;
  const intPart = match[1] ?? "0";
  const fracPart = (match[2] ?? "").padEnd(decimals, "0").slice(0, decimals);
  try {
    return BigInt(intPart) * 10n ** BigInt(decimals) + BigInt(fracPart || "0");
  } catch {
    return null;
  }
}

/** `bigint` → human-readable (UI gösterimi). */
export function formatPrincipal(value: bigint, decimals: number, places = 4): string {
  const denom = 10n ** BigInt(decimals);
  const whole = value / denom;
  const frac = value % denom;
  if (frac === 0n) return whole.toString();
  const fracStr = (frac + denom).toString().slice(1).padStart(decimals, "0").slice(0, places);
  return `${whole.toString()}.${fracStr.replace(/0+$/, "") || "0"}`;
}

/** Leverage bps → "3.0x" gibi. */
export function formatLeverage(bps: number): string {
  return `${(bps / 100).toFixed(2)}×`;
}
