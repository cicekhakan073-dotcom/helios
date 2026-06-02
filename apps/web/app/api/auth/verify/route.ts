/**
 * POST /api/auth/verify
 * body: { transaction: <base64 XDR> }
 *
 * Cüzdan tarafından imzalanmış challenge'ı doğrular (SEP-10 kuralları:
 * imza + sequence + timebounds + domain). Geçerliyse httpOnly JWT cookie set
 * eder ve oturum bilgisini döner.
 */

import { WebAuth } from "@stellar/stellar-sdk";
import { NextResponse } from "next/server";

import { authConfig, SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { sessionCookieAttributes, signSession } from "@/lib/auth/session";

interface VerifyBody {
  transaction?: string;
}

export async function POST(req: Request): Promise<Response> {
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.transaction || typeof body.transaction !== "string") {
    return NextResponse.json({ error: "missing 'transaction' (base64 XDR)" }, { status: 400 });
  }

  let clientAccountID: string;
  try {
    // 1) Server imzasını doğrula, client account ID'sini çıkar
    const read = WebAuth.readChallengeTx(
      body.transaction,
      authConfig.signingPublic,
      authConfig.networkPassphrase,
      authConfig.homeDomain,
      authConfig.webAuthDomain,
    );
    clientAccountID = read.clientAccountID;

    // 2) Client'ın imzalayanları arasında client account ID'si var mı?
    //    Tek-imza pattern (master key) için verifyChallengeTxSigners yeterli.
    const signersFound = WebAuth.verifyChallengeTxSigners(
      body.transaction,
      authConfig.signingPublic,
      authConfig.networkPassphrase,
      [clientAccountID],
      authConfig.homeDomain,
      authConfig.webAuthDomain,
    );
    if (signersFound.length === 0) {
      return NextResponse.json({ error: "client signature not found" }, { status: 401 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "verify failed";
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  // 3) JWT üret + httpOnly cookie set et
  const token = await signSession(clientAccountID);
  const res = NextResponse.json({
    address: clientAccountID,
    expiresInSeconds: authConfig.sessionTtlSeconds,
  });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieAttributes());
  return res;
}
