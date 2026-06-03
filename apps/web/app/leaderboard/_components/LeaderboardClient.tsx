"use client";

/**
 * LeaderboardClient — public sıralama + paylaşılan stratejiler.
 *
 * - GET /api/leaderboard: anonim handle + open positions sayısı.
 * - GET /api/strategies: paylaşılan stratejiler (copy-to-simulator + open CTA).
 * - SEP-10 oturumuysa GET /api/leaderboard/me + follow butonları.
 */

import { useSession } from "@helios/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

interface LbEntry {
  account: string;
  anonHandle: string;
  showAddress: boolean;
  openPositions: number;
  latestAsset: string | null;
  latestLeverageBps: number | null;
  latestOpenedAt: string | null;
}
interface LbResp {
  ok: boolean;
  dbConfigured: boolean;
  entries: LbEntry[];
}
interface MeResp {
  ok: boolean;
  dbConfigured: boolean;
  profile: {
    account: string;
    anonHandle: string;
    showAddress: boolean;
    openPositions: number;
  } | null;
}
interface StrategyRow {
  id: string;
  account: string;
  anonHandle: string | null;
  asset: string;
  leverageBps: number;
  horizonDays: number;
  volAssumptionBps: number;
  note: string | null;
  createdAt: string;
}
interface StrategiesResp {
  ok: boolean;
  dbConfigured: boolean;
  strategies: StrategyRow[];
}

export function LeaderboardClient() {
  const sessionQ = useSession();
  const isAuthed = !!sessionQ.data?.address;
  const myAccount = sessionQ.data?.address ?? null;

  const lbQ = useQuery<LbResp>({
    queryKey: ["helios", "leaderboard", "list"],
    queryFn: async () => {
      const r = await fetch("/api/leaderboard?limit=20", { cache: "no-store" });
      return r.json() as Promise<LbResp>;
    },
    staleTime: 60 * 1000,
  });
  const meQ = useQuery<MeResp>({
    queryKey: ["helios", "leaderboard", "me"],
    queryFn: async () => {
      const r = await fetch("/api/leaderboard/me", { cache: "no-store" });
      if (r.status === 401) return { ok: false, dbConfigured: false, profile: null };
      return r.json() as Promise<MeResp>;
    },
    enabled: isAuthed,
    staleTime: 60 * 1000,
  });
  const stratQ = useQuery<StrategiesResp>({
    queryKey: ["helios", "leaderboard", "strategies"],
    queryFn: async () => {
      const r = await fetch("/api/strategies?limit=20", { cache: "no-store" });
      return r.json() as Promise<StrategiesResp>;
    },
    staleTime: 60 * 1000,
  });

  const dbConfigured = lbQ.data?.dbConfigured ?? false;

  return (
    <>
      {!dbConfigured && (
        <div className="rounded-md bg-warn-soft border border-warn p-4 text-caption text-warn">
          <strong>DB yapılandırılmadı.</strong> Sıralama ve strateji paylaşımı için
          <code className="font-mono mx-1">DATABASE_URL</code>
          env&apos;ine bir Neon serverless URL ekleyip deploy et. Şu an liste boş döner; route 500
          vermez.
        </div>
      )}

      {isAuthed && meQ.data?.profile && (
        <section className="rounded-md bg-space-700 border border-aurora-amber p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-micro uppercase tracking-wider text-text-low">Sen</div>
            <div className="text-h3 text-text-high m-0">
              {meQ.data.profile.anonHandle}{" "}
              <span className="text-caption text-text-low">
                ({meQ.data.profile.openPositions} açık pozisyon)
              </span>
            </div>
          </div>
          {!meQ.data.profile.showAddress && (
            <span className="text-caption text-text-low">adres gizli (default anonim)</span>
          )}
        </section>
      )}

      <section className="rounded-md bg-space-700 border border-border-default p-5 flex flex-col gap-3 overflow-x-auto">
        <h2 className="text-h2 text-text-high m-0">Sıralama</h2>
        {lbQ.isLoading ? (
          <p className="text-caption text-text-low">yükleniyor…</p>
        ) : (lbQ.data?.entries.length ?? 0) === 0 ? (
          <p className="text-caption text-text-low">
            Henüz kayıt yok — ilk pozisyonu aç ve listeye girmenin tadını çıkar.
          </p>
        ) : (
          <table className="w-full text-body">
            <thead className="text-text-low text-micro uppercase tracking-wider">
              <tr>
                <th className="text-left p-2">Sıra</th>
                <th className="text-left p-2">Trader</th>
                <th className="text-right p-2">Açık pozisyon</th>
                <th className="text-right p-2">Son asset</th>
                <th className="text-right p-2">Son leverage</th>
                <th className="text-right p-2">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {lbQ.data?.entries.map((e, i) => {
                const isMe = myAccount != null && e.account === myAccount;
                return (
                  <tr
                    key={e.anonHandle + i}
                    className={`border-t border-border-subtle ${isMe ? "bg-aurora-amber/10" : ""}`}
                  >
                    <td className="p-2 text-text-medium font-mono tabular" data-num>
                      {i + 1}
                    </td>
                    <td className="p-2 text-text-high font-mono">
                      {e.anonHandle}
                      {e.showAddress && e.account !== "anon" && (
                        <span className="text-caption text-text-low ml-2">
                          {e.account.slice(0, 6)}…{e.account.slice(-6)}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right font-mono tabular" data-num>
                      {e.openPositions}
                    </td>
                    <td className="p-2 text-right">{e.latestAsset ?? "—"}</td>
                    <td className="p-2 text-right font-mono tabular" data-num>
                      {e.latestLeverageBps != null
                        ? `${(e.latestLeverageBps / 100).toFixed(2)}×`
                        : "—"}
                    </td>
                    <td className="p-2 text-right">
                      {isAuthed && !isMe && e.showAddress && e.account !== "anon" ? (
                        <FollowButton followee={e.account} />
                      ) : (
                        <span className="text-caption text-text-low">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-md bg-space-700 border border-border-default p-5 flex flex-col gap-3">
        <h2 className="text-h2 text-text-high m-0">Paylaşılan stratejiler</h2>
        {stratQ.isLoading ? (
          <p className="text-caption text-text-low">yükleniyor…</p>
        ) : (stratQ.data?.strategies.length ?? 0) === 0 ? (
          <p className="text-caption text-text-low">
            Henüz paylaşılan strateji yok. /simulator → senaryo → &quot;Share&quot; ile paylaş.{" "}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {stratQ.data?.strategies.map((s) => (
              <li
                key={s.id}
                className="rounded-md bg-space-600 border border-border-subtle p-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex flex-col">
                  <span className="text-body text-text-high font-mono">
                    {s.anonHandle ?? "anon"} · {s.asset} · {(s.leverageBps / 100).toFixed(2)}× ·{" "}
                    {s.horizonDays}g · vol %{(s.volAssumptionBps / 100).toFixed(0)}
                  </span>
                  {s.note && <span className="text-caption text-text-low">{s.note}</span>}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/simulator?asset=${s.asset}&lev=${s.leverageBps}&horizon=${s.horizonDays}&vol=${s.volAssumptionBps}`}
                    className="text-caption rounded-md bg-space-700 px-3 h-9 inline-flex items-center hover:bg-space-500"
                  >
                    Copy to Simulator
                  </Link>
                  {s.asset === "XLM" ? (
                    <Link
                      href={`/open?asset=${s.asset}&lev=${s.leverageBps}`}
                      className="text-caption rounded-md bg-aurora-amber text-text-on-aurora px-3 h-9 inline-flex items-center font-semibold hover:bg-aurora-amber-glow"
                    >
                      Open position
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="text-caption rounded-md bg-space-700 text-text-low px-3 h-9 opacity-60 cursor-not-allowed"
                    >
                      Open (manuel asset)
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sessionQ.data && <ShareStrategyForm />}

      <p className="text-caption text-text-low m-0">
        ⚠️ PnL ve sıralama yalnız on-chain doğrulanabilir veriden türetilir. Mahremiyet varsayılan:
        anonim handle. Yatırım tavsiyesi DEĞİLDİR.
      </p>
    </>
  );
}

function FollowButton({ followee }: { followee: string }) {
  const queryClient = useQueryClient();
  const m = useMutation({
    mutationFn: async (action: "follow" | "unfollow") => {
      const r = await fetch("/api/follow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ followee, action }),
      });
      return r.json() as Promise<{ ok: boolean }>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["helios", "leaderboard"] });
    },
  });
  return (
    <button
      type="button"
      onClick={() => m.mutate("follow")}
      disabled={m.isPending}
      className="text-caption rounded-md bg-aurora-teal-soft border border-aurora-teal text-aurora-teal px-3 h-8 hover:bg-aurora-teal/20 disabled:opacity-50"
    >
      {m.isPending ? "…" : "Follow"}
    </button>
  );
}

function ShareStrategyForm() {
  const queryClient = useQueryClient();
  const m = useMutation({
    mutationFn: async (input: {
      asset: string;
      leverageBps: number;
      horizonDays: number;
      volAssumptionBps: number;
      note: string;
    }) => {
      const r = await fetch("/api/strategies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      return r.json() as Promise<{ ok: boolean; id?: string; code?: string }>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["helios", "leaderboard", "strategies"] });
    },
  });

  return (
    <section className="rounded-md bg-space-700 border border-border-default p-5 flex flex-col gap-3">
      <h2 className="text-h2 text-text-high m-0">Strateji paylaş</h2>
      <p className="text-caption text-text-low m-0">
        Senaryonu (asset / leverage / horizon / vol varsayım) paylaş. Yalnız kendi adına kayıt
        yapabilirsin.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const strField = (k: string): string => {
            const v = fd.get(k);
            return typeof v === "string" ? v : "";
          };
          m.mutate({
            asset: strField("asset") || "XLM",
            leverageBps: Math.round(Number(strField("lev")) || 200),
            horizonDays: Math.round(Number(strField("horizon")) || 30),
            volAssumptionBps: Math.round(Number(strField("vol")) || 8000),
            note: strField("note").slice(0, 280),
          });
        }}
        className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end"
      >
        <label className="flex flex-col gap-1">
          <span className="text-micro uppercase tracking-wider text-text-low">Asset</span>
          <select
            name="asset"
            defaultValue="XLM"
            className="rounded-md bg-space-600 border border-border-default px-2 h-10 text-body"
          >
            <option value="XLM">XLM</option>
            <option value="USDC">USDC</option>
            <option value="wBTC">wBTC</option>
            <option value="wETH">wETH</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-micro uppercase tracking-wider text-text-low">Leverage (bps)</span>
          <input
            name="lev"
            type="number"
            min={100}
            max={200}
            step={25}
            defaultValue={200}
            className="rounded-md bg-space-600 border border-border-default px-2 h-10 font-mono tabular"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-micro uppercase tracking-wider text-text-low">Horizon (gün)</span>
          <input
            name="horizon"
            type="number"
            min={1}
            max={365}
            step={1}
            defaultValue={30}
            className="rounded-md bg-space-600 border border-border-default px-2 h-10 font-mono tabular"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-micro uppercase tracking-wider text-text-low">Vol (bps)</span>
          <input
            name="vol"
            type="number"
            min={100}
            max={50000}
            step={500}
            defaultValue={8000}
            className="rounded-md bg-space-600 border border-border-default px-2 h-10 font-mono tabular"
          />
        </label>
        <button
          type="submit"
          disabled={m.isPending}
          className="rounded-md bg-aurora-amber text-text-on-aurora h-10 px-4 font-semibold disabled:opacity-50"
        >
          {m.isPending ? "…" : "Paylaş"}
        </button>
        <label className="flex flex-col gap-1 col-span-2 md:col-span-5">
          <span className="text-micro uppercase tracking-wider text-text-low">Not (opsiyonel)</span>
          <input
            name="note"
            type="text"
            maxLength={280}
            placeholder="kısa açıklama…"
            className="rounded-md bg-space-600 border border-border-default px-2 h-10"
          />
        </label>
      </form>
      {m.data && (
        <p className="text-caption text-text-low">
          {m.data.ok ? `Eklendi (id ${m.data.id?.slice(0, 8)}…)` : `Hata: ${m.data.code ?? "?"}`}
        </p>
      )}
    </section>
  );
}
