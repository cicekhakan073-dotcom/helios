/**
 * server-only — JWT (HS256, jose) + httpOnly cookie helper'ları.
 *
 * - `signSession(address)` → JWT string, payload: { sub: address, iat, exp }
 * - `verifySession(token)` → SessionPayload | null
 * - `getSession()` → cookie'den okur (Server Component / Route Handler)
 * - `requireSession()` → oturum yoksa Error fırlatır (Route Handler 401)
 */

import "server-only";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

import { authConfig, SESSION_COOKIE_NAME } from "./config";

export interface SessionPayload {
  /** Stellar address (G...) */
  sub: string;
  /** Issued at (unix sec). */
  iat: number;
  /** Expiry (unix sec). */
  exp: number;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(authConfig.jwtSecret);
}

export async function signSession(address: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(address)
    .setIssuer("helios")
    .setIssuedAt(now)
    .setExpirationTime(now + authConfig.sessionTtlSeconds)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: "helios",
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.iat !== "number" || typeof payload.exp !== "number") {
      return null;
    }
    return { sub: payload.sub, iat: payload.iat, exp: payload.exp };
  } catch {
    return null;
  }
}

/** Cookie'den oturumu okur (RSC + Route Handler). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Route Handler içinde kullanılacak — yoksa Response 401 ile döndürülür. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError("Oturum yok veya süresi dolmuş");
  return session;
}

export class UnauthorizedError extends Error {
  public override readonly name = "UnauthorizedError";
}

/** Cookie set/clear (Set-Cookie header'larını üretir). */
export function sessionCookieAttributes(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: authConfig.sessionTtlSeconds,
  };
}
