/// <reference lib="webworker" />

/**
 * Monte Carlo worker — UI thread'i kilitlemeden HF fan + heatmap üretir.
 *
 * Mesaj protokolü:
 *   in:  { id, type: "run", params: MonteCarloInput }
 *   in:  { id, type: "cancel" }
 *   out: { id, type: "result", data: MonteCarloOutput }
 *   out: { id, type: "error", message: string }
 *   out: { id, type: "cancelled" }
 *
 * Next 16 + Turbopack pattern: `new Worker(new URL("./monte-carlo.worker.ts",
 * import.meta.url), { type: "module" })` — TS desteklenir (Turbopack docs).
 */

import {
  simulate,
  type MonteCarloInput,
  type MonteCarloOutput,
} from "../../lib/risk-radar/monte-carlo";

interface RunMessage {
  id: number;
  type: "run";
  params: MonteCarloInput;
}
interface CancelMessage {
  id: number;
  type: "cancel";
}
type InboundMessage = RunMessage | CancelMessage;

interface ResultMessage {
  id: number;
  type: "result";
  data: MonteCarloOutput;
}
interface ErrorMessage {
  id: number;
  type: "error";
  message: string;
}
interface CancelledMessage {
  id: number;
  type: "cancelled";
}

export type WorkerOutboundMessage = ResultMessage | ErrorMessage | CancelledMessage;

const cancelledIds = new Set<number>();

self.onmessage = (e: MessageEvent<InboundMessage>) => {
  const msg = e.data;
  if (msg.type === "cancel") {
    cancelledIds.add(msg.id);
    return;
  }
  if (msg.type !== "run") return;

  try {
    const out = simulate(msg.params, () => cancelledIds.has(msg.id));
    if (out === null) {
      const reply: CancelledMessage = { id: msg.id, type: "cancelled" };
      (self as unknown as Worker).postMessage(reply);
      cancelledIds.delete(msg.id);
      return;
    }
    const reply: ResultMessage = { id: msg.id, type: "result", data: out };
    (self as unknown as Worker).postMessage(reply);
  } catch (err) {
    const reply: ErrorMessage = {
      id: msg.id,
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    };
    (self as unknown as Worker).postMessage(reply);
  } finally {
    cancelledIds.delete(msg.id);
  }
};
