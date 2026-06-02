/**
 * strategy_router okuma katmanı (Helios kontratı, PROMPT 12).
 *
 * Read-only çağrılar `simulateView` ile yapılır; write çağrıları (`open_position`,
 * `close_position`) PROMPT 22'de XDR build + Wallets Kit sign + RPC submit.
 */

import { getAddresses } from "../addresses";
import { simulateView, type SimulateResult } from "../rpc/simulate";

export interface RouterInfo {
  admin: string;
  isPaused: boolean;
}

export async function getRouterAdmin(): Promise<SimulateResult<string>> {
  const { helios } = getAddresses();
  return simulateView<string>(helios.strategyRouter, "get_admin", []);
}

export async function getRouterPaused(): Promise<SimulateResult<boolean>> {
  const { helios } = getAddresses();
  return simulateView<boolean>(helios.strategyRouter, "is_paused", []);
}

export async function getRouterInfo(): Promise<RouterInfo | null> {
  const [admin, paused] = await Promise.all([getRouterAdmin(), getRouterPaused()]);
  if (!admin.ok || !paused.ok) return null;
  return { admin: admin.value, isPaused: paused.value };
}
