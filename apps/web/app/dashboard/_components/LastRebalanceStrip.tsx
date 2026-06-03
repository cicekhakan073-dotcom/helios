"use client";

/**
 * LastRebalanceStrip — kullanıcının son keeper rebalance log entry'si.
 *
 * /api/keeper/log → KV'den (varsa) son N kayıt; bu istemci yalnız sahibinin
 * adresine ait kayıtları görür (route filtre).
 */

import { useQuery } from "@tanstack/react-query";

interface LogEntry {
  user: string;
  ts: number;
  ok: boolean;
  txHash?: string;
  reason?: string;
  preHf?: number;
  postHf?: number;
}

interface LogResponse {
  ok: boolean;
  entries?: LogEntry[];
}

export function LastRebalanceStrip() {
  const q = useQuery<LogEntry | null>({
    queryKey: ["helios", "keeper", "log", "recent"],
    queryFn: async () => {
      const resp = await fetch("/api/keeper/log?limit=5", { cache: "no-store" });
      if (!resp.ok) return null;
      const json = (await resp.json()) as LogResponse;
      const entries = json.entries ?? [];
      return entries[0] ?? null;
    },
    staleTime: 60 * 1000,
    refetchInterval: 120 * 1000,
    retry: 1,
  });

  if (q.isLoading) return null;
  if (q.error || !q.data) return null;
  const e = q.data;
  const when = new Date(e.ts).toLocaleString("tr-TR");
  return (
    <section className="rounded-md bg-space-700 border border-border-default p-3 text-caption text-text-medium flex flex-col gap-1">
      <strong className="text-text-high">Son otomatik rebalance</strong>
      <span>
        {when} ·{" "}
        {e.ok ? (
          <span className="text-aurora-teal">başarılı</span>
        ) : (
          <span className="text-warn">başarısız</span>
        )}
        {e.reason ? ` · ${e.reason}` : ""}
      </span>
      {e.txHash && (
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${e.txHash}`}
          target="_blank"
          rel="noreferrer noopener"
          className="font-mono text-aurora-teal underline-offset-2 hover:underline break-all"
        >
          {e.txHash}
        </a>
      )}
    </section>
  );
}
