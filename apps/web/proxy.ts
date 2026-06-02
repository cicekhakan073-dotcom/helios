/**
 * Helios — Next.js 16 `proxy.ts` (eski `middleware.ts`; AUDIT §3.1).
 *
 * Node.js runtime'da çalışır. Network boundary'sini sıkılaştırır:
 *   - /dashboard/**, /api/copilot/**, /api/keeper/cron/**, /api/leaderboard/me
 *     gibi prefix'leri **oturum şartı** ile sınırlar.
 *   - JWT geçersiz / yok → 401 (API) veya redirect (sayfa).
 *
 * Public path'ler (/, /kitchen-sink, /api/auth/*, /static, ...) açık.
 *
 * AUDIT §3.1 yorumu: middleware.ts deprecated; bu dosya `proxy` adıyla
 * default export edilir, NextRequest tipini kullanır.
 */

import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { verifySession } from "@/lib/auth/session";

/** Oturum şartı koşulan path prefix'leri. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/api/copilot",
  "/api/keeper/cron",
  "/api/leaderboard/me",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Response header (debug + frontend için ağ rozeti)
  const headers = new Headers();
  headers.set("x-helios-network", "testnet");

  if (!isProtected(pathname)) {
    return NextResponse.next({ headers });
  }

  // Korumalı yol → oturum kontrolü
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    const signInUrl = new URL("/", req.url);
    signInUrl.searchParams.set("auth", "required");
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Oturum geçerli — devam et + debug header (sub kısaltılmış)
  headers.set("x-helios-auth", `${session.sub.slice(0, 4)}…${session.sub.slice(-4)}`);
  return NextResponse.next({ headers });
}

export const config = {
  /**
   * Eşleşme deseni: statik asset'ler ve Next internals dışındaki tüm path'ler.
   * proxy.ts yalnız Node.js runtime'da çalışır (AUDIT §3.1).
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff|woff2)).*)",
  ],
};
