/**
 * server-only — SEP-10 auth config + env validation.
 *
 * Tüm değerler env'den okunur; secret'lar **client'a sızmaz** (NEXT_PUBLIC_*
 * prefix'i KESİNLİKLE yok). Eksik env değişkeni → erken atılan hata
 * (build/start aşamasında catch edilir).
 */

import "server-only";

const CHALLENGE_TIMEOUT_SECONDS = 5 * 60; // 5dk (AUDIT: replay önleme için kısa)
const SESSION_TTL_SECONDS = 60 * 60 * 8;  // 8 saat (oturum)

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Eksik env değişkeni: ${name}`);
  return v;
}

export const authConfig = {
  signingPublic: req("HELIOS_SEP10_SIGNING_PUBLIC"),
  signingSecret: req("HELIOS_SEP10_SIGNING_SECRET"),
  jwtSecret: req("HELIOS_JWT_SECRET"),
  homeDomain: req("HELIOS_HOME_DOMAIN"),
  webAuthDomain: req("HELIOS_WEB_AUTH_DOMAIN"),
  networkPassphrase: "Test SDF Network ; September 2015",
  challengeTimeoutSeconds: CHALLENGE_TIMEOUT_SECONDS,
  sessionTtlSeconds: SESSION_TTL_SECONDS,
} as const;

export const SESSION_COOKIE_NAME = "helios-session";
