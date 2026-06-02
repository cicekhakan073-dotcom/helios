import { DisclaimerStrip } from "@helios/ui";

import { OpenWizard } from "./_components/OpenWizard";

/**
 * /open — Open Position wizard (PROMPT 21).
 *
 * Tüm wizard client-side state — Suspense gerek yok, RSC shell minimum.
 * AUDIT §3.2 — `cacheComponents` açık ama bu route dinamik client (no dynamic
 * server API), default davranış zaten dinamik render.
 */
export default function OpenPage() {
  return (
    <>
      <DisclaimerStrip />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <header className="mb-8">
          <h1 className="text-h1 text-text-high m-0">Open position</h1>
          <p className="text-body-lg text-text-medium mt-2 max-w-2xl">
            Asset seç, principal&apos;ı gir, leverage slider&apos;ını kaydır.
            Health Factor ve likidasyon fiyatı canlı güncellenir.
          </p>
        </header>
        <OpenWizard />
      </main>
    </>
  );
}
