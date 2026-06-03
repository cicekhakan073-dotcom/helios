/**
 * POST /api/push/subscribe — PushSubscription.toJSON() body alır, session.sub
 * ile DB'ye kaydeder. SEP-10 zorunlu. DB yoksa "push yapılandırılmadı".
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

import { saveSubscription } from "../../../../lib/push/queries";

interface Body {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
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
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth : "";
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ ok: false, code: "INVALID_SUBSCRIPTION" }, { status: 400 });
  }
  const dbConfigured = !!process.env["DATABASE_URL"];
  const res = await saveSubscription({ endpoint, account: session.sub, p256dh, auth });
  if (!res.ok) {
    return NextResponse.json({
      ok: true,
      persisted: false,
      reason: "DB_NOT_CONFIGURED",
      message: "Push yapılandırılmadı (DATABASE_URL yok); subscription kaydedilmedi.",
      dbConfigured,
    });
  }
  return NextResponse.json({ ok: true, persisted: true });
}
