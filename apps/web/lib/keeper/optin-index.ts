/**
 * Keeper opt-in indeksi — KV set + env override.
 *
 * AUDIT 2026-06-03: Soroban storage enumerable değil; keeper kontratı opt-in
 * adresleri listelemez. İndeks UI'dan beslenir (Dashboard register_opt_in
 * başarısında POST), kontrat **authoritative** kalır — cron her adres için
 * `get_opt_in(user).active` kontrolü yapar; bayat indeks zararsız.
 *
 * Sources:
 *  - Upstash KV set `helios:keeper:optin` (üyelik = G-adresi)
 *  - `KEEPER_USER_LIST` env (CSV, dev/demo fallback)
 *
 * Upstash yoksa yalnız env list döner — production'da gerçek KV önerilir.
 */

import { Redis } from "@upstash/redis";

const KV_KEY = "helios:keeper:optin";

let cachedRedis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (cachedRedis !== undefined) return cachedRedis;
  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
  if (!url || !token) {
    cachedRedis = null;
    return null;
  }
  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

function parseCsvList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^G[A-Z2-7]{55}$/.test(s));
}

export async function listOptInCandidates(): Promise<string[]> {
  const envList = parseCsvList(process.env["KEEPER_USER_LIST"]);
  const redis = getRedis();
  if (!redis) return Array.from(new Set(envList));
  try {
    const members = await redis.smembers(KV_KEY);
    return Array.from(new Set([...members, ...envList]));
  } catch (err) {
    console.warn(
      "[helios/keeper] optin-index smembers başarısız, env fallback:",
      err instanceof Error ? err.message : String(err),
    );
    return envList;
  }
}

export async function addOptInCandidate(
  user: string,
): Promise<{ ok: boolean; backend: "redis" | "memory" }> {
  if (!/^G[A-Z2-7]{55}$/.test(user)) return { ok: false, backend: "memory" };
  const redis = getRedis();
  if (!redis) return { ok: true, backend: "memory" };
  try {
    await redis.sadd(KV_KEY, user);
    return { ok: true, backend: "redis" };
  } catch (err) {
    console.warn(
      "[helios/keeper] optin-index sadd başarısız:",
      err instanceof Error ? err.message : String(err),
    );
    return { ok: false, backend: "memory" };
  }
}

export async function removeOptInCandidate(user: string): Promise<{ ok: boolean }> {
  if (!/^G[A-Z2-7]{55}$/.test(user)) return { ok: false };
  const redis = getRedis();
  if (!redis) return { ok: true };
  try {
    await redis.srem(KV_KEY, user);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

const LOCK_TTL_SEC = 5 * 60;

export async function acquireRebalanceLock(
  user: string,
): Promise<{ ok: boolean; lockId?: string }> {
  const redis = getRedis();
  if (!redis) return { ok: true, lockId: `inproc-${user}` }; // dev: lock yok
  const lockId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  try {
    const res = await redis.set(`helios:keeper:lock:${user}`, lockId, {
      nx: true,
      ex: LOCK_TTL_SEC,
    });
    return res ? { ok: true, lockId } : { ok: false };
  } catch {
    return { ok: false };
  }
}

export async function releaseRebalanceLock(user: string, _lockId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(`helios:keeper:lock:${user}`);
  } catch {
    /* sessiz */
  }
}

export interface RebalanceLogEntry {
  user: string;
  ts: number;
  ok: boolean;
  txHash?: string;
  reason?: string;
  preHf?: number;
  postHf?: number;
}

export async function writeRebalanceLog(entry: RebalanceLogEntry): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.lpush("helios:keeper:log", JSON.stringify(entry));
    await redis.ltrim("helios:keeper:log", 0, 199); // son 200 entry
  } catch {
    /* sessiz */
  }
}

export async function readRecentRebalanceLog(limit = 20): Promise<RebalanceLogEntry[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.lrange("helios:keeper:log", 0, limit - 1);
    const out: RebalanceLogEntry[] = [];
    for (const r of raw) {
      try {
        const parsed: unknown = typeof r === "string" ? JSON.parse(r) : r;
        if (parsed && typeof parsed === "object") out.push(parsed as RebalanceLogEntry);
      } catch {
        /* skip */
      }
    }
    return out;
  } catch {
    return [];
  }
}
