/**
 * GET /api/auth/me — mevcut oturum bilgisi.
 *
 * Oturumsuz → 401. Var → { address, expiresAt }.
 */

import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

export async function GET(): Promise<Response> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({
    address: session.sub,
    issuedAt: session.iat,
    expiresAt: session.exp,
  });
}
