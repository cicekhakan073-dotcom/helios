/**
 * Helios — Vitest paylaşılan base config.
 *
 * Her workspace kendi vitest.config.ts'inde bunu mergeConfig ile uzatır.
 * Frontend testleri için jsdom; SDK saf TS testleri default (node).
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/.turbo/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.{test,spec}.{ts,tsx}", "src/**/index.ts"],
    },
    clearMocks: true,
    restoreMocks: true,
  },
});
