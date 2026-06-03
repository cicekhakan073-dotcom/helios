/**
 * POST /api/positions/snapshot — open confirm success'inden çağrılır.
 *
 * Entry-price authoritative kaydı (§6.4 PnL boşluğunu doldurur). SEP-10 zorunlu;
 * yalnız session.sub yazar.
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

import { insertSnapshot } from "../../../../lib/leaderboard/queries";

interface Body {
  asset?: unknown;
  leverageBps?: unknown;
  principalRaw?: unknown; // string (bigint)
  entryPriceI128?: unknown; // string
}

const ALLOWED_ASSETS = new Set(["XLM", "USDC", "wBTC", "wETH"]);

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_BODY" }, { status: 400 });
  }
  const asset = typeof body.asset === "string" ? body.asset : "";
  if (!ALLOWED_ASSETS.has(asset)) {
    return NextResponse.json({ ok: false, code: "INVALID_ASSET" }, { status: 400 });
  }
  const leverageBps = Math.round(Number(body.leverageBps));
  if (!Number.isFinite(leverageBps) || leverageBps < 100 || leverageBps > 200) {
    return NextResponse.json({ ok: false, code: "INVALID_LEVERAGE" }, { status: 400 });
  }
  const principalStr = typeof body.principalRaw === "string" ? body.principalRaw : "";
  const entryStr = typeof body.entryPriceI128 === "string" ? body.entryPriceI128 : "";
  let principalRaw: bigint;
  let entryPriceI128: bigint;
  try {
    principalRaw = BigInt(principalStr);
    entryPriceI128 = BigInt(entryStr);
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_AMOUNTS" }, { status: 400 });
  }
  if (principalRaw <= 0n || entryPriceI128 <= 0n) {
    return NextResponse.json({ ok: false, code: "INVALID_AMOUNTS" }, { status: 400 });
  }
  const res = await insertSnapshot({
    account: session.sub,
    asset,
    leverageBps,
    principalRaw,
    entryPriceI128,
  });
  if (!res.ok) {
    // DB yokken sessiz başarı — Confirm akışını bloklamayalım. UI etiket: "DB yapılandırılmadı".
    return NextResponse.json({ ok: true, persisted: false, reason: "DB_NOT_CONFIGURED" });
  }
  return NextResponse.json({ ok: true, persisted: true });
}
