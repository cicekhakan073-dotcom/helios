/**
 * Helios Social Leaderboard — Drizzle schema (PostgreSQL / Neon serverless).
 *
 * PROMPT 30 — yalnız on-chain doğrulanabilir veriden türetilen anonim PnL,
 * paylaşılan strateji, follow ilişkileri. Default mahremiyet: anonim handle;
 * show_address opt-in.
 *
 * Migration: drizzle-kit generate + push (DATABASE_URL set'lendiğinde manuel).
 */

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/** Anonim handle = "helios_" + hash(account).slice(0,8) gibi; UI'da gizler. */
export const users = pgTable("users", {
  /** Stellar G… (56 char). */
  account: text("account").primaryKey(),
  anonHandle: text("anon_handle").notNull(),
  showAddress: boolean("show_address").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

/** Pozisyon AÇILDIĞINDA (open confirm success) snapshot — entry price'ın
 *  authoritative kaynağı. PnL bu satır + on-chain pozisyon + güncel oracle'dan
 *  TÜREVdir; tahmini · testnet. */
export const positionsSnapshot = pgTable("positions_snapshot", {
  id: uuid("id").defaultRandom().primaryKey(),
  account: text("account").notNull(),
  asset: text("asset").notNull(), // "XLM"|"USDC"|"wBTC"|"wETH"
  leverageBps: integer("leverage_bps").notNull(),
  principalRaw: bigint("principal_raw", { mode: "bigint" }).notNull(),
  /** Açılış oracle fiyatı i128 (string olarak saklanır; Postgres bigint range
   *  i128 için yetersiz olabilir, text alanına bigint döküm sınırlı — text). */
  entryPriceI128: text("entry_price_i128").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

/** Paylaşılan strateji parametreleri (Simulator → leaderboard). */
export const strategies = pgTable("strategies", {
  id: uuid("id").defaultRandom().primaryKey(),
  account: text("account").notNull(),
  asset: text("asset").notNull(),
  leverageBps: integer("leverage_bps").notNull(),
  horizonDays: integer("horizon_days").notNull(),
  volAssumptionBps: integer("vol_assumption_bps").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

/** Follow ilişkisi — kompozit PK; self-follow CHECK ile yasaklı. */
export const follows = pgTable(
  "follows",
  {
    follower: text("follower").notNull(),
    followee: text("followee").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.follower, t.followee] }),
    check("no_self_follow", sql`${t.follower} <> ${t.followee}`),
  ],
);

/** Web Push subscription (PROMPT 31). Bir account birden çok cihaz olabilir;
 *  endpoint PK (gerçek browser endpoint). lastSentAt → keeper scan spam guard. */
export const pushSubscriptions = pgTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  account: text("account").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
});

export type UserRow = typeof users.$inferSelect;
export type PositionSnapshotRow = typeof positionsSnapshot.$inferSelect;
export type StrategyRow = typeof strategies.$inferSelect;
export type FollowRow = typeof follows.$inferSelect;
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
