/**
 * POST /api/copilot — AI Strategy Copilot (read-only tools + prompt caching).
 *
 * Akış:
 *   1. Auth — getSession (SEP-10). Yoksa 401.
 *   2. Rate-limit — copilot key'i (adres+IP), saatte 30 istek (Upstash veya in-memory).
 *   3. ANTHROPIC_API_KEY varsa anthropic provider; yoksa 503 (dev restart hatırlatması).
 *   4. streamText({ model, system, messages, tools, providerOptions }) →
 *      result.toUIMessageStreamResponse() ile streaming yanıt.
 *
 * Güvenlik:
 *  - Hiçbir tool tx imzalamaz/yayımlamaz (lib/copilot/tools.ts okur).
 *  - getUserPosition yalnız session.sub adresini okur (parametresiz).
 *  - System prompt + tool tanımları ephemeral cache (TTL 1h) — provider key
 *    değişmediği sürece tekrar gönderiminde token cache hit.
 *  - Secret server-only; client'a sızmaz.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/faucet/rate-limit";

import { COPILOT_SYSTEM_PROMPT } from "../../../lib/copilot/system-prompt";
import { copilotTools } from "../../../lib/copilot/tools";

export const maxDuration = 60; // streaming + tool calls için 60s headroom.

interface CopilotBody {
  messages?: UIMessage[];
}

export async function POST(req: Request) {
  // — 1. Auth —
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json(
      {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Copilot için SEP-10 oturumu gerekli. Önce cüzdanı bağla + sign-in.",
      },
      { status: 401 },
    );
  }

  // — 2. Rate-limit —
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anon";
  const verdict = await rateLimit(`copilot:${session.sub}:${ip}`);
  if (!verdict.ok) {
    const resetSec = Math.max(0, Math.ceil((verdict.reset - Date.now()) / 1000));
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: `Copilot hız limiti aşıldı. ~${resetSec}sn sonra tekrar dene.`,
        retryAfterSeconds: resetSec,
        backend: verdict.backend,
      },
      { status: 429, headers: { "Retry-After": String(resetSec) } },
    );
  }

  // — 3. Provider kontrolü —
  if (!process.env["ANTHROPIC_API_KEY"]) {
    return NextResponse.json(
      {
        ok: false,
        code: "ANTHROPIC_KEY_MISSING",
        message:
          "ANTHROPIC_API_KEY env yok. .env.local'a ekleyip dev sunucusunu RESTART et (env build-time okunur).",
      },
      { status: 503 },
    );
  }

  // — 4. Body —
  let body: CopilotBody;
  try {
    body = (await req.json()) as CopilotBody;
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_BODY", message: "Geçersiz JSON gövdesi." },
      { status: 400 },
    );
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json(
      { ok: false, code: "EMPTY_MESSAGES", message: "messages[] boş olamaz." },
      { status: 400 },
    );
  }

  // — 5. streamText —
  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: COPILOT_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: copilotTools(session.sub),
    // AUDIT §3.5 — system prompt + tool tanımları cache'lenir; TTL 1h.
    providerOptions: {
      anthropic: {
        cacheControl: { type: "ephemeral", ttl: "1h" },
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
