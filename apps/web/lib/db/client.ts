/**
 * Helios DB client — Neon serverless + Drizzle (PostgreSQL).
 *
 * `DATABASE_URL` yoksa `getDb()` → null; route handler'lar boş yanıt verir
 * (route 500 değil; UI "DB yapılandırılmadı" göstergesi). Faucet/Upstash
 * deseniyle uyumlu graceful degrade.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export type HeliosDb = NeonHttpDatabase<typeof schema>;

let cached: HeliosDb | null | undefined;

export function getDb(): HeliosDb | null {
  if (cached !== undefined) return cached;
  const url = process.env["DATABASE_URL"];
  if (!url) {
    cached = null;
    return null;
  }
  const sqlClient = neon(url);
  cached = drizzle(sqlClient, { schema });
  return cached;
}

/** Default anonim handle — 8-char base36 hash adresten türetilir. */
export function anonHandleFor(account: string): string {
  let h = 0;
  for (let i = 0; i < account.length; i++) {
    h = (h * 31 + account.charCodeAt(i)) >>> 0;
  }
  return `helios_${h.toString(36).padStart(8, "0").slice(0, 8)}`;
}
