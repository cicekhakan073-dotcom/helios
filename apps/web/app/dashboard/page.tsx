import { Card, DisclaimerStrip } from "@helios/ui";
import { Suspense } from "react";

import { getSession } from "@/lib/auth/session";

import { DashboardClient } from "./client";

/**
 * /dashboard — SEP-10 korumalı sayfa (proxy.ts gate).
 *
 * Cache Components pattern (AUDIT §3.2):
 *   - Sayfa shell'i (başlık, disclaimer, layout) statik prerender
 *   - `cookies()` çağrısı `<Suspense>` boundary altında dinamik
 *   - PPR: shell anında, dinamik content streaming
 */
export default function DashboardPage() {
  return (
    <>
      <DisclaimerStrip />
      <main className="mx-auto max-w-3xl px-6 py-12 flex flex-col gap-6">
        <h1 className="text-h1 text-text-high m-0">Dashboard</h1>
        <Suspense fallback={<SessionLoading />}>
          <SessionAndContent />
        </Suspense>
        <p className="text-caption text-text-low m-0">
          Bu sayfa PROMPT 18 için canlı SDK hook&apos;larını gösterir — gerçek Dashboard PROMPT 23&apos;te gelir.
        </p>
      </main>
    </>
  );
}

async function SessionAndContent() {
  const session = await getSession();
  const address = session?.sub ?? "?";
  return (
    <>
      <Card>
        <div className="flex flex-col gap-2">
          <h3 className="text-h3 text-text-high m-0">Oturum</h3>
          <p className="text-caption text-text-low m-0">SEP-10 doğrulanmış</p>
          <p className="text-body text-text-medium m-0">
            Bağlı kimlik:{" "}
            <code className="text-aurora-amber font-mono tabular" data-num>
              {address.slice(0, 6)}…{address.slice(-6)}
            </code>
          </p>
        </div>
      </Card>
      <DashboardClient address={address} />
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
