/**
 * POST /api/follow + /api/unfollow (action body) — SEP-10 zorunlu.
 * Self-follow yasak; rate-limit; DB yoksa 503.
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/faucet/rate-limit";

import { follow, unfollow } from "../../../lib/leaderboard/queries";

interface Body {
  followee?: unknown;
  action?: unknown; // "follow" | "unfollow"
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
  const verdict = await rateLimit(`follow:${session.sub}:${ip}`);
  if (!verdict.ok) {
    return NextResponse.json({ ok: false, code: "RATE_LIMITED" }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_BODY" }, { status: 400 });
  }
  const followee = typeof body.followee === "string" ? body.followee : "";
  if (!/^G[A-Z2-7]{55}$/.test(followee)) {
    return NextResponse.json({ ok: false, code: "INVALID_FOLLOWEE" }, { status: 400 });
  }
  if (followee === session.sub) {
    return NextResponse.json({ ok: false, code: "SELF_FOLLOW_FORBIDDEN" }, { status: 400 });
  }
  const action = body.action === "unfollow" ? "unfollow" : "follow";
  const res =
    action === "unfollow"
      ? await unfollow(session.sub, followee)
      : await follow(session.sub, followee);
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, code: "DB_NOT_CONFIGURED", message: "DATABASE_URL yok." },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true, action });
}
