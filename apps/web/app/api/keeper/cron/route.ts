/**
 * GET/POST /api/keeper/cron — Vercel Cron tetik + manuel tetik.
 *
 * Akış:
 *   1. Bearer secret kontrolü (Authorization: Bearer <CRON_SECRET>) — yoksa 401.
 *   2. KEEPER_SECRET env şart (yoksa 503).
 *   3. Public key = Keypair.fromSecret().publicKey(); kontrat `get_keeper()`
 *      ile birebir eşleşmeli (yoksa 503; uydurma adres ile tx atmıyoruz).
 *   4. scan helper'ı çalıştır (KV opt-in indeks + env fallback).
 *   5. Özet JSON yanıt; entry'ler KV log'a yazılır (log/recent endpoint için).
 *
 * Güvenlik: Secret server-only; yanıtta sadece public hash + kullanıcı adresleri
 * görünür. Kontrat caller=keeper_role, require_auth + ensure_keeper guard'ları
 * nihai koruma (off-chain hata yapsak bile kontrat tx'i reddeder).
 */

import { Keypair } from "@stellar/stellar-sdk";
import { NextResponse } from "next/server";

import { fetchOnchainKeeperRole } from "../../../../lib/keeper/rebalance-tx";
import { runScan } from "../../../../lib/keeper/scan";

export const maxDuration = 60;

function unauthorized(reason = "missing or invalid bearer secret") {
  return NextResponse.json({ ok: false, code: "UNAUTHORIZED", message: reason }, { status: 401 });
}

async function handle(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env["CRON_SECRET"];
  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        code: "CRON_SECRET_MISSING",
        message: "CRON_SECRET env yok. Vercel project env'ine ekleyip yeniden deploy et.",
      },
      { status: 503 },
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return unauthorized();
  }

  const keeperSecret = process.env["KEEPER_SECRET"];
  if (!keeperSecret) {
    return NextResponse.json(
      {
        ok: false,
        code: "KEEPER_SECRET_MISSING",
        message:
          "KEEPER_SECRET env yok. Helios keeper kontratının init'te bağlanmış rolünün secret'ı ile aynı olmalı.",
      },
      { status: 503 },
    );
  }

  let keeperPublic: string;
  try {
    keeperPublic = Keypair.fromSecret(keeperSecret).publicKey();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_KEEPER_SECRET",
        message: "KEEPER_SECRET geçerli bir Stellar secret değil.",
      },
      { status: 503 },
    );
  }

  const onchainKeeper = await fetchOnchainKeeperRole();
  if (!onchainKeeper) {
    return NextResponse.json(
      {
        ok: false,
        code: "ONCHAIN_KEEPER_READ_FAILED",
        message: "keeper.get_keeper() okunamadı (RPC?). Tetik durduruldu.",
      },
      { status: 503 },
    );
  }
  if (onchainKeeper !== keeperPublic) {
    return NextResponse.json(
      {
        ok: false,
        code: "KEEPER_ROLE_MISMATCH",
        message: `On-chain keeper rolü ${onchainKeeper} ≠ env publicKey ${keeperPublic}. Tx ATMIYORUZ.`,
      },
      { status: 503 },
    );
  }

  const summary = await runScan(keeperPublic, keeperSecret);
  return NextResponse.json({
    ok: true,
    keeper: keeperPublic,
    summary: {
      scanned: summary.scanned,
      triggered: summary.triggered,
      rebalanced: summary.rebalanced,
      noAction: summary.noAction,
      errors: summary.errors,
    },
    entries: summary.entries,
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
