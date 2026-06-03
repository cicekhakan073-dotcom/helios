/**
 * Helios web-push sender — VAPID kimlikli notification.
 *
 * Anahtarlar: NEXT_PUBLIC_VAPID_PUBLIC_KEY (client OK) + VAPID_PRIVATE_KEY (server-only;
 * client bundle'ında YOK — grep doğrular). VAPID_SUBJECT (mailto:…) opsiyonel; yoksa
 * generic placeholder kullanılır.
 *
 * DB yoksa ya da VAPID env yoksa send no-op döner (route 500 değil).
 */

import webpush from "web-push";

import {
  listSendableSubscriptions,
  touchSubscriptions,
  deleteSubscription,
  type PushSubRecord,
} from "./queries";

let vapidConfigured: boolean | null = null;

function ensureVapid(): boolean {
  if (vapidConfigured !== null) return vapidConfigured;
  const pub = process.env["NEXT_PUBLIC_VAPID_PUBLIC_KEY"];
  const priv = process.env["VAPID_PRIVATE_KEY"];
  if (!pub || !priv) {
    vapidConfigured = false;
    return false;
  }
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:helios@example.invalid";
  webpush.setVapidDetails(subject, pub, priv);
  vapidConfigured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Aynı tag → bildirimi günceller. */
  tag?: string;
  /** Click açacağı URL (aynı origin). */
  url?: string;
}

export interface SendResult {
  attempted: number;
  delivered: number;
  removed: number;
  configured: boolean;
}

const DEFAULT_THROTTLE_SECONDS = 10 * 60;

export async function sendToAccount(
  account: string,
  payload: PushPayload,
  opts: { throttleSeconds?: number } = {},
): Promise<SendResult> {
  if (!ensureVapid()) {
    return { attempted: 0, delivered: 0, removed: 0, configured: false };
  }
  const throttle = opts.throttleSeconds ?? DEFAULT_THROTTLE_SECONDS;
  const subs = await listSendableSubscriptions(account, throttle);
  if (subs.length === 0) {
    return { attempted: 0, delivered: 0, removed: 0, configured: true };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    ...(payload.tag ? { tag: payload.tag } : {}),
    ...(payload.url ? { url: payload.url } : {}),
  });

  let delivered = 0;
  let removed = 0;
  for (const sub of subs) {
    try {
      await sendOne(sub, body);
      delivered++;
    } catch (err) {
      // 404/410 → endpoint geçersiz, DB'den temizle. Diğerlerinde sustur.
      if (isGoneError(err)) {
        await deleteSubscription(sub.endpoint, sub.account);
        removed++;
      }
    }
  }
  if (delivered > 0) await touchSubscriptions(account);
  return { attempted: subs.length, delivered, removed, configured: true };
}

async function sendOne(sub: PushSubRecord, body: string): Promise<void> {
  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    },
    body,
  );
}

function isGoneError(err: unknown): boolean {
  if (err && typeof err === "object" && "statusCode" in err) {
    const code = err.statusCode;
    if (code === 404 || code === 410) return true;
  }
  return false;
}
