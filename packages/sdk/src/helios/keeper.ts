/**
 * keeper okuma katmanı (Helios kontratı, PROMPT 14).
 *
 * Off-chain cron (PROMPT 29) on-chain `rebalance` tetikler; UI yalnız
 * opt-in registry'yi okur.
 */

import { getAddresses } from "../addresses";
import { simulateView, type SimulateResult } from "../rpc/simulate";

import { addressArg } from "./scval";

export interface OptInSettings {
  /** HF < trigger → rebalance aktif. */
  triggerHfBps: number;
  /** Cron hedef HF (off-chain referans). */
  targetHfBps: number;
  /** Tek seferde debt'in en fazla yüzde kaçı kapatılabilir (×10000). */
  maxDeleverageBps: number;
  /** Kullanıcı opt-in'i aktif mi (false = opt-out). */
  active: boolean;
}

export async function isOptedIn(userAddress: string): Promise<SimulateResult<boolean>> {
  const { helios } = getAddresses();
  return simulateView<boolean>(helios.keeper, "is_opted_in", [addressArg(userAddress)]);
}

/** `OptIn` struct → JS object. scValToNative `#[contracttype]` struct'ı
 *  snake_case alanlarla obje olarak verir; field isimleri Rust ile aynı. */
export async function getOptIn(userAddress: string): Promise<OptInSettings | null> {
  const { helios } = getAddresses();
  const res = await simulateView<unknown>(helios.keeper, "get_opt_in", [addressArg(userAddress)]);
  if (!res.ok) return null;
  const obj = res.value;
  if (obj == null || typeof obj !== "object") return null;
  const raw = obj as Record<string, unknown>;
  const trigger = raw["trigger_hf_bps"];
  const target = raw["target_hf_bps"];
  const max = raw["max_deleverage_bps"];
  const active = raw["active"];
  if (
    typeof trigger !== "bigint" && typeof trigger !== "number"
  ) return null;
  if (typeof target !== "bigint" && typeof target !== "number") return null;
  if (typeof max !== "bigint" && typeof max !== "number") return null;
  if (typeof active !== "boolean") return null;
  return {
    triggerHfBps: Number(trigger),
    targetHfBps: Number(target),
    maxDeleverageBps: Number(max),
    active,
  };
}

export async function getKeeperAdmin(): Promise<SimulateResult<string>> {
  const { helios } = getAddresses();
  return simulateView<string>(helios.keeper, "get_admin", []);
}

export async function getKeeperRole(): Promise<SimulateResult<string>> {
  const { helios } = getAddresses();
  return simulateView<string>(helios.keeper, "get_keeper", []);
}
