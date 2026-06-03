/**
 * POST /api/strategies — paylaşılan strateji (Simulator → leaderboard).
 * GET /api/strategies — son N strateji listesi (public; anonim handle).
 *
 * POST: SEP-10 zorunlu; session.sub yazar (başkası adına kayıt YOK).
 * Rate-limit: faucet lib deseni, "strategies:<addr>:<ip>".
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/faucet/rate-limit";

import { insertStrategy, listStrategies } from "../../../lib/leaderboard/queries";

interface Body {
  asset?: unknown;
  leverageBps?: unknown;
  horizonDays?: unknown;
  volAssumptionBps?: unknown;
  note?: unknown;
}

const ALLOWED_ASSETS = new Set(["XLM", "USDC", "wBTC", "wETH"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 20) || 20;
  const dbConfigured = !!process.env["DATABASE_URL"];
  const strategies = await listStrategies(limit);
  return NextResponse.json({ ok: true, dbConfigured, strategies });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anon";
  const verdict = await rateLimit(`strategies:${session.sub}:${ip}`);
  if (!verdict.ok) {
    const sec = Math.max(0, Math.ceil((verdict.reset - Date.now()) / 1000));
    return NextResponse.json(
      { ok: false, code: "RATE_LIMITED", retryAfterSeconds: sec },
      { status: 429, headers: { "Retry-After": String(sec) } },
    );
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
  const horizonDays = Math.round(Number(body.horizonDays));
  const volAssumptionBps = Math.round(Number(body.volAssumptionBps));
  if (!Number.isFinite(leverageBps) || leverageBps < 100 || leverageBps > 200) {
    return NextResponse.json({ ok: false, code: "INVALID_LEVERAGE" }, { status: 400 });
  }
  if (!Number.isFinite(horizonDays) || horizonDays < 1 || horizonDays > 365) {
    return NextResponse.json({ ok: false, code: "INVALID_HORIZON" }, { status: 400 });
  }
  if (!Number.isFinite(volAssumptionBps) || volAssumptionBps < 100 || volAssumptionBps > 50_000) {
    return NextResponse.json({ ok: false, code: "INVALID_VOL" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.slice(0, 280) : undefined;

  const res = await insertStrategy({
    account: session.sub,
    asset,
    leverageBps,
    horizonDays,
    volAssumptionBps,
    ...(note ? { note } : {}),
  });
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, code: "DB_NOT_CONFIGURED", message: "DATABASE_URL yok." },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, id: res.id });
}
