/**
 * GET /api/leaderboard/me — kendi profil + sıralama (SEP-10 gerektirir).
 *
 * proxy.ts PROTECTED prefix listesinde; oturumsuz isteği proxy yakalar.
 * DB yoksa profil null + dbConfigured=false.
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

import { getOwnProfile } from "../../../../lib/leaderboard/queries";

export async function GET() {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }
  const dbConfigured = !!process.env["DATABASE_URL"];
  const profile = await getOwnProfile(session.sub);
  return NextResponse.json({ ok: true, dbConfigured, profile });
}
