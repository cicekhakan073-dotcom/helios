/**
 * Faucet rate-limit — Upstash Redis (Vercel Marketplace) + in-memory fallback.
 *
 * Production: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` env'leri set
 * edilirse `@upstash/ratelimit` sliding-window. Lokal dev'de env yoksa
 * süreç-içi in-memory fallback (yalnız bu instance için). Multi-instance
 * deploy'da fallback **yeterli değildir** — Vercel'de Upstash provision şart.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitVerdict {
  ok: boolean;
  /** Pencerede kalan istek sayısı. */
  remaining: number;
  /** Reset zaman damgası (unix ms). */
  reset: number;
  /** "redis" veya "memory" (lokal dev). */
  backend: "redis" | "memory";
}

const WINDOW = "1 h" as const;
const LIMIT = 5; // 5 istek / saat / anahtar

let cached: { kind: "redis"; limiter: Ratelimit } | { kind: "memory" } | null = null;

function buildRedisLimiter(): { limiter: Ratelimit } | null {
  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  return {
    limiter: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(LIMIT, WINDOW),
      analytics: false,
      prefix: "helios:faucet",
    }),
  };
}

/** In-memory sliding window — basit ringli sayım; tek instance. */
const memoryStore = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;

function memoryCheck(key: string): RateLimitVerdict {
  const now = Date.now();
  const hits = (memoryStore.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= LIMIT) {
    return {
      ok: false,
      remaining: 0,
      reset: hits[0]! + WINDOW_MS,
      backend: "memory",
    };
  }
  hits.push(now);
  memoryStore.set(key, hits);
  return {
    ok: true,
    remaining: LIMIT - hits.length,
    reset: now + WINDOW_MS,
    backend: "memory",
  };
}

export async function rateLimit(key: string): Promise<RateLimitVerdict> {
  if (!cached) {
    const redisLim = buildRedisLimiter();
    if (redisLim) {
      cached = { kind: "redis", limiter: redisLim.limiter };
    } else {
      cached = { kind: "memory" };
      console.warn(
        "[helios/faucet] UPSTASH_REDIS_REST_* env yok — in-memory fallback aktif (yalnız dev güvenli).",
      );
    }
  }
  if (cached.kind === "memory") return memoryCheck(key);
  const res = await cached.limiter.limit(key);
  return {
    ok: res.success,
    remaining: res.remaining,
    reset: res.reset,
    backend: "redis",
  };
}
