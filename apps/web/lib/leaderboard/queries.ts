/**
 * Helios Leaderboard — DB sorgu yardımcıları (Drizzle ORM).
 *
 * DB yoksa boş diziler dönülür (graceful — route 500 değil).
 */

import { and, desc, eq, sql } from "drizzle-orm";

import { anonHandleFor, getDb } from "../db/client";
import { follows, positionsSnapshot, strategies, users } from "../db/schema";

export interface LeaderboardEntry {
  account: string;
  anonHandle: string;
  showAddress: boolean;
  openPositions: number;
  latestAsset: string | null;
  latestLeverageBps: number | null;
  latestOpenedAt: string | null;
}

const PAGE_SIZE_MAX = 50;

export async function listLeaderboard(
  opts: { limit?: number; offset?: number } = {},
): Promise<LeaderboardEntry[]> {
  const db = getDb();
  if (!db) return [];
  const limit = Math.min(PAGE_SIZE_MAX, Math.max(1, opts.limit ?? 20));
  const offset = Math.max(0, opts.offset ?? 0);
  const rows = await db
    .select({
      account: users.account,
      anonHandle: users.anonHandle,
      showAddress: users.showAddress,
      openPositions: sql<number>`coalesce(count(${positionsSnapshot.id}) filter (where ${positionsSnapshot.closedAt} is null), 0)::int`,
      latestAsset: sql<
        string | null
      >`(array_agg(${positionsSnapshot.asset} order by ${positionsSnapshot.openedAt} desc) filter (where ${positionsSnapshot.closedAt} is null))[1]`,
      latestLeverageBps: sql<
        number | null
      >`(array_agg(${positionsSnapshot.leverageBps} order by ${positionsSnapshot.openedAt} desc) filter (where ${positionsSnapshot.closedAt} is null))[1]`,
      latestOpenedAt: sql<
        string | null
      >`(array_agg(${positionsSnapshot.openedAt} order by ${positionsSnapshot.openedAt} desc) filter (where ${positionsSnapshot.closedAt} is null))[1]::text`,
    })
    .from(users)
    .leftJoin(positionsSnapshot, eq(positionsSnapshot.account, users.account))
    .groupBy(users.account)
    .orderBy(
      desc(
        sql`coalesce(count(${positionsSnapshot.id}) filter (where ${positionsSnapshot.closedAt} is null), 0)`,
      ),
    )
    .limit(limit)
    .offset(offset);
  return rows;
}

export async function ensureUser(account: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .insert(users)
    .values({ account, anonHandle: anonHandleFor(account), showAddress: false })
    .onConflictDoNothing();
}

export async function getOwnProfile(account: string): Promise<{
  account: string;
  anonHandle: string;
  showAddress: boolean;
  openPositions: number;
} | null> {
  const db = getDb();
  if (!db) return null;
  await ensureUser(account);
  const rows = await db
    .select({
      account: users.account,
      anonHandle: users.anonHandle,
      showAddress: users.showAddress,
      openPositions: sql<number>`coalesce(count(${positionsSnapshot.id}) filter (where ${positionsSnapshot.closedAt} is null), 0)::int`,
    })
    .from(users)
    .leftJoin(positionsSnapshot, eq(positionsSnapshot.account, users.account))
    .where(eq(users.account, account))
    .groupBy(users.account);
  return rows[0] ?? null;
}

export async function insertSnapshot(input: {
  account: string;
  asset: string;
  leverageBps: number;
  principalRaw: bigint;
  entryPriceI128: bigint;
}): Promise<{ ok: boolean }> {
  const db = getDb();
  if (!db) return { ok: false };
  await ensureUser(input.account);
  await db.insert(positionsSnapshot).values({
    account: input.account,
    asset: input.asset,
    leverageBps: input.leverageBps,
    principalRaw: input.principalRaw,
    entryPriceI128: input.entryPriceI128.toString(),
  });
  return { ok: true };
}

export async function insertStrategy(input: {
  account: string;
  asset: string;
  leverageBps: number;
  horizonDays: number;
  volAssumptionBps: number;
  note?: string;
}): Promise<{ ok: boolean; id?: string }> {
  const db = getDb();
  if (!db) return { ok: false };
  await ensureUser(input.account);
  const rows = await db
    .insert(strategies)
    .values({
      account: input.account,
      asset: input.asset,
      leverageBps: input.leverageBps,
      horizonDays: input.horizonDays,
      volAssumptionBps: input.volAssumptionBps,
      ...(input.note ? { note: input.note } : {}),
    })
    .returning({ id: strategies.id });
  const id = rows[0]?.id;
  return id ? { ok: true, id } : { ok: true };
}

export interface StrategyListRow {
  id: string;
  account: string;
  anonHandle: string | null;
  asset: string;
  leverageBps: number;
  horizonDays: number;
  volAssumptionBps: number;
  note: string | null;
  createdAt: string;
}

export async function listStrategies(limit = 20): Promise<StrategyListRow[]> {
  const db = getDb();
  if (!db) return [];
  return db
    .select({
      id: strategies.id,
      account: strategies.account,
      anonHandle: users.anonHandle,
      asset: strategies.asset,
      leverageBps: strategies.leverageBps,
      horizonDays: strategies.horizonDays,
      volAssumptionBps: strategies.volAssumptionBps,
      note: strategies.note,
      createdAt: sql<string>`${strategies.createdAt}::text`,
    })
    .from(strategies)
    .leftJoin(users, eq(users.account, strategies.account))
    .orderBy(desc(strategies.createdAt))
    .limit(Math.min(50, Math.max(1, limit)));
}

export async function follow(
  follower: string,
  followee: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (follower === followee) return { ok: false, reason: "self-follow yasak" };
  const db = getDb();
  if (!db) return { ok: false, reason: "DB yapılandırılmadı" };
  await ensureUser(follower);
  await ensureUser(followee);
  await db.insert(follows).values({ follower, followee }).onConflictDoNothing();
  return { ok: true };
}

export async function unfollow(follower: string, followee: string): Promise<{ ok: boolean }> {
  const db = getDb();
  if (!db) return { ok: false };
  await db
    .delete(follows)
    .where(and(eq(follows.follower, follower), eq(follows.followee, followee)));
  return { ok: true };
}

export async function isFollowing(follower: string, followee: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  const rows = await db
    .select({ followee: follows.followee })
    .from(follows)
    .where(and(eq(follows.follower, follower), eq(follows.followee, followee)))
    .limit(1);
  return rows.length > 0;
}
