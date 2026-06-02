
import { DisclaimerStrip } from "@helios/ui";
import Link from "next/link";
import { Suspense } from "react";

import { ConfirmFlow } from "./_components/ConfirmFlow";

/**
 * /open/confirm — PROMPT 22 (DEVAM).
 *
 * AUDIT §3.2 — Cache Components açık; bu route tamamen client-driven (Zustand
 * store + wallet hookları + TanStack Query). RSC shell minimum; tüm dinamik
 * state Suspense fence içinde.
 */
export default function ConfirmPage() {
  return (
    <>
      <DisclaimerStrip />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <header className="mb-8 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-h1 text-text-high m-0">Confirm position</h1>
            <p className="text-body-lg text-text-medium mt-2 max-w-xl">
              Tx simulate edildi. İmzala — tek atomik işlem zincirlenir.
            </p>
          </div>
          <Link
            href="/open"
            className="text-caption text-text-low underline-offset-4 hover:underline"
          >
            ← Wizard&apos;a dön
          </Link>
        </header>
        <Suspense fallback={<ConfirmFlowSkeleton />}>
          <ConfirmFlow />
        </Suspense>
      </main>
    </>
  );
}

function ConfirmFlowSkeleton() {
  return (
    <div className="rounded-lg bg-space-700 border border-border-default p-6 h-64 animate-pulse" />
  );
}
