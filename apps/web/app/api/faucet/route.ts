/**
 * POST /api/faucet — testnet adresine XLM fonlama (Friendbot proxy'si).
 *
 * Akış:
 *   1. Body: { address, asset? }. asset opsiyonel; şu an yalnız "XLM" desteklenir.
 *   2. Validasyon: address G… ile başlar, 56 char, mainnet/muxed reddi.
 *   3. Rate limit (Upstash veya in-memory fallback) — adres+IP başına 5/saat.
 *   4. Friendbot çağrısı (server-side fetch). "already funded" zarif handle.
 *
 * NOT — USDC/wBTC/wETH için otomatik faucet imkansız: SAC'lerin issuer'ı
 * `GATALTGTWIOT…` (Blend testnet)' ve secret bizde yok (canlı doğrulandı
 * 2026-06-03). Bu route XLM-only; diğer asset için UI manuel yönlendirme.
 */

import { NextResponse } from "next/server";

import { rateLimit } from "../../../lib/faucet/rate-limit";

const FRIENDBOT_URL = "https://friendbot.stellar.org";

// NOT: `export const runtime` Next.js 16 Cache Components ile uyumsuz; default
// (Node.js) runtime'da çalışıyoruz — Upstash + fetch zaten Node API ister.

interface FaucetBody {
  address?: unknown;
  asset?: unknown;
}

export async function POST(req: Request) {
  let body: FaucetBody;
  try {
    body = (await req.json()) as FaucetBody;
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_BODY", message: "Geçersiz JSON gövdesi." },
      { status: 400 },
    );
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  const asset = typeof body.asset === "string" ? body.asset.toUpperCase() : "XLM";

  // — Adres validasyonu (server-side; client validasyonuna güvenmiyoruz) —
  if (!/^G[A-Z2-7]{55}$/.test(address)) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_ADDRESS",
        message: "G… ile başlayan 56 karakter Stellar adresi gerekli.",
      },
      { status: 400 },
    );
  }
  if (address.startsWith("M")) {
    return NextResponse.json(
      {
        ok: false,
        code: "MUXED_FORBIDDEN",
        message: "Muxed account (M…) Soroban'da desteklenmez.",
      },
      { status: 400 },
    );
  }
  if (asset !== "XLM") {
    return NextResponse.json(
      {
        ok: false,
        code: "ASSET_NOT_SUPPORTED",
        message:
          "Şu an yalnız XLM otomatik. USDC/wBTC/wETH için issuer secret'ı bizde yok — manuel yol UI'da gösteriliyor.",
      },
      { status: 400 },
    );
  }

  // — Rate-limit (adres + IP, hangisi varsa) —
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anon";
  const verdict = await rateLimit(`xlm:${address}:${ip}`);
  if (!verdict.ok) {
    const resetSec = Math.max(0, Math.ceil((verdict.reset - Date.now()) / 1000));
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMITED",
        message: `Hız limiti aşıldı. ~${resetSec}sn sonra tekrar dene.`,
        retryAfterSeconds: resetSec,
        backend: verdict.backend,
      },
      { status: 429, headers: { "Retry-After": String(resetSec) } },
    );
  }

  // — Friendbot —
  const url = `${FRIENDBOT_URL}/?addr=${encodeURIComponent(address)}`;
  let fbResp: Response;
  try {
    fbResp = await fetch(url, { method: "GET", cache: "no-store" });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        code: "FRIENDBOT_UNREACHABLE",
        message:
          err instanceof Error ? `Friendbot erişilemedi: ${err.message}` : "Friendbot erişilemedi.",
      },
      { status: 502 },
    );
  }

  let fbJson: unknown = null;
  try {
    fbJson = await fbResp.json();
  } catch {
    /* friendbot bazen text döner — sessiz */
  }

  // "already funded" — Friendbot 400 op_already_exists döner.
  if (!fbResp.ok) {
    const detail =
      fbJson && typeof fbJson === "object" ? (fbJson as Record<string, unknown>) : null;
    const resultCodes = detail?.["extras"];
    const opCodes =
      resultCodes && typeof resultCodes === "object"
        ? (resultCodes as Record<string, unknown>)["result_codes"]
        : null;
    const opStr = JSON.stringify(opCodes ?? detail ?? null);
    if (opStr.includes("op_already_exists")) {
      return NextResponse.json({
        ok: true,
        alreadyFunded: true,
        message: "Hesap zaten testnet'te fonlu — tekrar fonlama gerekmiyor.",
        backend: verdict.backend,
        remaining: verdict.remaining,
      });
    }
    return NextResponse.json(
      {
        ok: false,
        code: "FRIENDBOT_REJECTED",
        message: `Friendbot reddetti (${fbResp.status}).`,
        detail: opStr.slice(0, 240),
      },
      { status: 502 },
    );
  }

  const hash =
    fbJson && typeof fbJson === "object" ? (fbJson as Record<string, unknown>)["hash"] : null;

  return NextResponse.json({
    ok: true,
    funded: true,
    hash: typeof hash === "string" ? hash : null,
    explorerUrl:
      typeof hash === "string" ? `https://stellar.expert/explorer/testnet/tx/${hash}` : null,
    backend: verdict.backend,
    remaining: verdict.remaining,
  });
}
