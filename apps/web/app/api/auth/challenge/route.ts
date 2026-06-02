/**
 * GET /api/auth/challenge?account=G...
 *
 * SEP-10 challenge transaction üretir. Server signing key ile imzalı, cüzdan
 * imzalayıp `/api/auth/verify`'a POST eder.
 */

import { Keypair, WebAuth } from "@stellar/stellar-sdk";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/config";

export function GET(req: Request): Response {
  const url = new URL(req.url);
  const account = url.searchParams.get("account");

  if (!account) {
    return NextResponse.json({ error: "missing 'account' query param" }, { status: 400 });
  }
  if (!account.startsWith("G") || account.length !== 56) {
    return NextResponse.json({ error: "invalid Stellar account (G... 56 char)" }, { status: 400 });
  }

  try {
    const serverKeypair = Keypair.fromSecret(authConfig.signingSecret);
    const challenge = WebAuth.buildChallengeTx(
      serverKeypair,
      account,
      authConfig.homeDomain,
      authConfig.challengeTimeoutSeconds,
      authConfig.networkPassphrase,
      authConfig.webAuthDomain,
    );
    return NextResponse.json({
      transaction: challenge,
      network_passphrase: authConfig.networkPassphrase,
      server_address: authConfig.signingPublic,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "challenge build failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
