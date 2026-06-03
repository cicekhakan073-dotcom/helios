/**
 * GET /api/leaderboard?limit=20&offset=0 — public anonim sıralama.
 *
 * DB yoksa boş entries + dbConfigured=false (UI zarif "DB yapılandırılmadı"
 * göstergesi). Route 500 atmaz.
 */

import { NextResponse } from "next/server";

import { listLeaderboard } from "../../../lib/leaderboard/queries";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 20) || 20;
  const offset = Number(url.searchParams.get("offset") ?? 0) || 0;
  const dbConfigured = !!process.env["DATABASE_URL"];
  const entries = await listLeaderboard({ limit, offset });
  // Default anonim — show_address false ise account sızdırma yok.
  const safe = entries.map((e) =>
    e.showAddress
      ? e
      : {
          account: "anon",
          anonHandle: e.anonHandle,
          showAddress: false as const,
          openPositions: e.openPositions,
          latestAsset: e.latestAsset,
          latestLeverageBps: e.latestLeverageBps,
          latestOpenedAt: e.latestOpenedAt,
        },
  );
  return NextResponse.json({ ok: true, dbConfigured, entries: safe });
}
