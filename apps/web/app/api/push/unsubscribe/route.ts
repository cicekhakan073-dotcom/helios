/**
 * POST /api/push/unsubscribe — session.sub'a ait endpoint'i DB'den siler.
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

import { deleteSubscription } from "../../../../lib/push/queries";

interface Body {
  endpoint?: unknown;
}

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
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) {
    return NextResponse.json({ ok: false, code: "INVALID_ENDPOINT" }, { status: 400 });
  }
  const res = await deleteSubscription(endpoint, session.sub);
  if (!res.ok) {
    return NextResponse.json({ ok: true, persisted: false, reason: "DB_NOT_CONFIGURED" });
  }
  return NextResponse.json({ ok: true, persisted: true });
}
