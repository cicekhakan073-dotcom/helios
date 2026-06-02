/**
 * Challenge → Wallets Kit signTransaction → Verify uçtan uca sarmalayıcı.
 */

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";

import { network } from "../index";

import { fetchChallenge, verifyChallenge, type VerifyResponse } from "./client";

/**
 * SEP-10 uçtan uca akış:
 *   1. GET /api/auth/challenge?account → unsigned XDR
 *   2. Wallets Kit signTransaction → signed XDR
 *   3. POST /api/auth/verify → httpOnly JWT cookie set
 */
export async function signInWithStellar(address: string): Promise<VerifyResponse> {
  const challenge = await fetchChallenge(address);
  if (challenge.network_passphrase !== network.passphrase) {
    throw new Error("challenge network_passphrase Helios SDK ile uyumsuz");
  }
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(challenge.transaction, {
    networkPassphrase: challenge.network_passphrase,
    address,
  });
  return verifyChallenge(signedTxXdr);
}
