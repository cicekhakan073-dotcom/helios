import { AuroraBackground, brand, DisclaimerStrip } from "@helios/ui";

import { ApyTable } from "./_landing/ApyTable";
import { Hero } from "./_landing/Hero";
import { HowItWorks } from "./_landing/HowItWorks";
import { SevenLayers } from "./_landing/SevenLayers";

/**
 * Helios Landing — PROMPT 20.
 *
 * AUDIT §3.2 + Next.js 16 Cache Components:
 *   - `cacheComponents: true` (next.config.ts) — PPR + `"use cache"` directive aktif
 *   - Hero/HowItWorks/SevenLayers static → prerender (default)
 *   - ApyTable `"use cache"` + `cacheLife({ revalidate: 300 })` — 5dk fonk seviyesi cache
 *   - DisclaimerStrip (UI'dan) statik content
 *
 * 90sn demo akışı (VISION.md §5):
 *   0-10s — bu sayfa: hero + APY tablosu ilk izlenim
 *   10-30s — Wallet connect (header'da WalletButton hazır)
 *   30+   — /open wizard'a geçiş (PROMPT 21)
 */
export default function LandingPage() {
  return (
    <>
      <AuroraBackground />
      <DisclaimerStrip />
      <main>
        <Hero />
        <HowItWorks />
        <ApyTable />
        <SevenLayers />
        <TrustStrip />
      </main>
      <footer className="border-t border-border-subtle py-8 px-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-caption text-text-low m-0">
            © Helios — {brand.disclaimer}
          </p>
          <p className="text-caption text-text-low m-0">
            Stellar Testnet · Soroban · Blend v2 · Reflector V3
          </p>
        </div>
      </footer>
    </>
  );
}

/** Güven/dürüstlük şeridi — landing ortasında bir kez daha. */
function TrustStrip() {
  return (
    <section className="py-12 px-6">
      <div className="mx-auto max-w-3xl rounded-lg bg-space-700 border border-border-default p-6 flex flex-col gap-3">
        <h3 className="text-h3 text-text-high m-0">Dürüstlük ilkeleri</h3>
        <ul className="text-body text-text-medium m-0 pl-6 list-disc flex flex-col gap-1">
          <li>
            <strong>Testnet-only</strong> — hiçbir akış mainnet&apos;e iletilmez. Gerçek para iması yoktur.
          </li>
          <li>
            <strong>Unaudited</strong> — Helios kontratları denetimden geçmemiştir.
          </li>
          <li>
            <strong>Not financial advice</strong> — AI Copilot çıktısı dahil tüm içerik eğitim amaçlıdır.
          </li>
          <li>
            <strong>Oracle risk</strong> — Reflector fiyatlarına staleness ve TWAP sanity bound uygulanır.
          </li>
        </ul>
      </div>
    </section>
  );
}
