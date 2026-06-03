/**
 * Drizzle migration config.
 *
 * Kullanım (DATABASE_URL set'lendikten sonra, yerel/manuel):
 *   pnpm dlx drizzle-kit generate
 *   pnpm dlx drizzle-kit push
 *
 * DATABASE_URL yokken bu dosya kullanılmaz; build/typecheck dokunmaz.
 */

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "postgres://placeholder:pg@localhost/_unused",
  },
});
