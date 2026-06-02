import type { NextConfig } from "next";

/**
 * Helios — apps/web Next.js 16 config
 *
 * Bu dosya iskeletten gelir. Cache Components (top-level `cacheComponents: true`),
 * Turbopack rules, image patterns ve diğer üretim ayarları PROMPT 20'de eklenir.
 *
 * AUDIT 2026-05-31 §3.2 hatırlatma:
 *   - `experimental.cacheComponents` veya `experimental.ppr` KULLANMA — kaldırıldı.
 *   - Stable form: top-level `cacheComponents: true`.
 *   - `middleware.ts` yerine `proxy.ts` (PROMPT 17).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // AUDIT 2026-05-31 §3.2 — top-level `cacheComponents: true`.
  // Bu flag PPR (Partial Prerendering) + `"use cache"` directive + cacheLife/cacheTag'i
  // aynı bayrak altında açar; `experimental.ppr` + `experimental.dynamicIO` + `experimental.useCache`
  // KALDIRILDI (Next.js 16).
  cacheComponents: true,

  // Workspace paketlerinin transpile edilmesini sağla (UI/SDK TS kaynak olarak gönderildiğinden).
  transpilePackages: ["@helios/ui", "@helios/sdk"],
};

export default nextConfig;
