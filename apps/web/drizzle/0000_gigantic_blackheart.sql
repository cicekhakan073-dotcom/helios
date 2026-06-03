CREATE SCHEMA "helios";
--> statement-breakpoint
CREATE TABLE "helios"."follows" (
	"follower" text NOT NULL,
	"followee" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_followee_pk" PRIMARY KEY("follower","followee"),
	CONSTRAINT "no_self_follow" CHECK ("helios"."follows"."follower" <> "helios"."follows"."followee")
);
--> statement-breakpoint
CREATE TABLE "helios"."positions_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account" text NOT NULL,
	"asset" text NOT NULL,
	"leverage_bps" integer NOT NULL,
	"principal_raw" bigint NOT NULL,
	"entry_price_i128" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "helios"."push_subscriptions" (
	"endpoint" text PRIMARY KEY NOT NULL,
	"account" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "helios"."strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account" text NOT NULL,
	"asset" text NOT NULL,
	"leverage_bps" integer NOT NULL,
	"horizon_days" integer NOT NULL,
	"vol_assumption_bps" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "helios"."users" (
	"account" text PRIMARY KEY NOT NULL,
	"anon_handle" text NOT NULL,
	"show_address" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
