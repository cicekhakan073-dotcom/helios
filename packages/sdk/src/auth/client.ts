/**
 * Auth client — Helios SEP-10 endpoint'lerine fetch sarmalayıcı.
 *
 * Tarayıcı tarafında çalışır. Cookie-tabanlı oturum (`credentials: "include"`
 * implicit — same-origin'de zaten gönderilir).
 */

export interface ChallengeResponse {
  transaction: string;
  network_passphrase: string;
  server_address: string;
}

export interface SessionInfo {
  address: string;
  issuedAt: number;
  expiresAt: number;
}

export interface VerifyResponse {
  address: string;
  expiresInSeconds: number;
}

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function fetchChallenge(account: string): Promise<ChallengeResponse> {
  const url = `/api/auth/challenge?account=${encodeURIComponent(account)}`;
  return asJson<ChallengeResponse>(await fetch(url, { method: "GET" }));
}

export async function verifyChallenge(signedXdr: string): Promise<VerifyResponse> {
  return asJson<VerifyResponse>(
    await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transaction: signedXdr }),
    }),
  );
}

export async function fetchSession(): Promise<SessionInfo | null> {
  const res = await fetch("/api/auth/me", { method: "GET" });
  if (res.status === 401) return null;
  return asJson<SessionInfo>(res);
}

export async function logoutSession(): Promise<void> {
  const res = await fetch("/api/auth/logout", { method: "POST" });
  if (!res.ok) throw new Error(`logout failed: HTTP ${res.status}`);
}
