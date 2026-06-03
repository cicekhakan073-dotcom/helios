import { Card, DisclaimerStrip } from "@helios/ui";
import { Suspense } from "react";

import { getSession } from "@/lib/auth/session";

import { DashboardLive } from "./_components/DashboardLive";

/**
 * /dashboard — SEP-10 korumalı sayfa (proxy.ts gate).
 *
 * AUDIT §3.2 PPR: shell prerender, `getSession` (cookies) Suspense fence altında
 * streaming. Demo (PROMPT 18) DashboardClient kaldırıldı; gerçek Dashboard
 * (PROMPT 23): KPI + pozisyon listesi + HF projeksiyon + close + opt-in.
 */
export default function DashboardPage() {
  return (
    <>
      <DisclaimerStrip />
      <main className="mx-auto max-w-5xl px-6 py-12 flex flex-col gap-6">
        <header className="flex items-baseline justify-between gap-4">
          <h1 className="text-h1 text-text-high m-0">Dashboard</h1>
          <span className="text-caption text-text-low">
            Testnet · unaudited · not financial advice
          </span>
        </header>
        <Suspense fallback={<SessionLoading />}>
          <SessionGate />
        </Suspense>
      </main>
    </>
  );
}

async function SessionGate() {
  const session = await getSession();
  const address = session?.sub;
  if (!address) {
    return (
      <Card>
        <p className="text-body text-text-medium m-0">
          Oturum bulunamadı. Cüzdan bağlamak için ana sayfaya dönüp Connect&apos;e bas.
        </p>
      </Card>
    );
  }
  return (
    <>
      <Card>
        <div className="flex flex-col gap-1">
          <span className="text-micro uppercase tracking-wider text-text-low">Bağlı kimlik</span>
          <code className="text-aurora-amber font-mono tabular text-body" data-num>
            {address.slice(0, 6)}…{address.slice(-6)}
          </code>
        </div>
      </Card>
      <DashboardLive address={address} />
    </>
  );
}

function SessionLoading() {
  return (
    <Card>
      <p className="text-body text-text-low m-0">Oturum yükleniyor…</p>
    </Card>
  );
}
