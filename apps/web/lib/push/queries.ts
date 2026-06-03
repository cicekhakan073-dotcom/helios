/**
 * Push subscription DB sorguları — DB yoksa boş/no-op.
 */

import { and, eq, or, sql } from "drizzle-orm";

import { getDb } from "../db/client";
import { pushSubscriptions } from "../db/schema";

export interface PushSubRecord {
  endpoint: string;
  account: string;
  p256dh: string;
  auth: string;
}

export async function saveSubscription(input: PushSubRecord): Promise<{ ok: boolean }> {
  const db = getDb();
  if (!db) return { ok: false };
  await db
    .insert(pushSubscriptions)
    .values({
      endpoint: input.endpoint,
      account: input.account,
      p256dh: input.p256dh,
      auth: input.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { account: input.account, p256dh: input.p256dh, auth: input.auth },
    });
  return { ok: true };
}

export async function deleteSubscription(
  endpoint: string,
  account: string,
): Promise<{ ok: boolean }> {
  const db = getDb();
  if (!db) return { ok: false };
  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.account, account)));
  return { ok: true };
}

export async function listSubscriptionsForAccount(account: string): Promise<PushSubRecord[]> {
  const db = getDb();
  if (!db) return [];
  return db
    .select({
      endpoint: pushSubscriptions.endpoint,
      account: pushSubscriptions.account,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.account, account));
}

/** Spam guard: belirli aralıkta lastSentAt yenisi. Argümana göre
 *  account için TÜM endpoint'lerin lastSentAt'i güncellenir. */
export async function touchSubscriptions(account: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .update(pushSubscriptions)
    .set({ lastSentAt: sql`now()` })
    .where(eq(pushSubscriptions.account, account));
}

/** lastSentAt < (now - intervalSeconds) olan sub'lar; gönderim hak edenler. */
export async function listSendableSubscriptions(
  account: string,
  intervalSeconds: number,
): Promise<PushSubRecord[]> {
  const db = getDb();
  if (!db) return [];
  return db
    .select({
      endpoint: pushSubscriptions.endpoint,
      account: pushSubscriptions.account,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.account, account),
        or(
          sql`${pushSubscriptions.lastSentAt} is null`,
          sql`${pushSubscriptions.lastSentAt} < now() - make_interval(secs => ${intervalSeconds})`,
        ),
      ),
    );
}
