/**
 * GET /api/keeper/log?limit=20 — son keeper rebalance log entry'leri.
 *
 * SEP-10 oturumu gerekli; herkesin kendi adresine ait son entry'leri görür.
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

import { readRecentRebalanceLog } from "../../../../lib/keeper/optin-index";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.max(1, Math.min(100, limitRaw ? Number(limitRaw) || 20 : 20));
  const log = await readRecentRebalanceLog(limit);
  const mine = log.filter((entry) => entry.user === session.sub);
  return NextResponse.json({ ok: true, entries: mine });
}
