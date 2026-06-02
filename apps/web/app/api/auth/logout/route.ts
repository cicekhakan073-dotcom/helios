/**
 * POST /api/auth/logout — httpOnly session cookie temizler.
 */

import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/config";

export function POST(): Response {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
