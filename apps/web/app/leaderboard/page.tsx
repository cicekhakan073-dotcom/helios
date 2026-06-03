import { DisclaimerStrip } from "@helios/ui";

import { LeaderboardClient } from "./_components/LeaderboardClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Helios anonim PnL sıralaması ve paylaşılan stratejiler. Testnet — yatırım tavsiyesi değildir.",
};

/**
 * /leaderboard — public anonim PnL sıralaması + strateji paylaşımı.
 *
 * DB yoksa boş durum; route 500 değil. PROMPT 30 §6 mahremiyet: varsayılan
 * anonim; show_address açan kullanıcılar adresini gösterir.
 */
export default function LeaderboardPage() {
  return (
    <>
      <DisclaimerStrip />
      <main className="mx-auto max-w-5xl px-6 py-12 flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1 text-text-high m-0">Leaderboard</h1>
          <p className="text-body text-text-medium m-0 max-w-2xl">
            Anonim PnL sıralaması + paylaşılan stratejiler. Veriler yalnız on-chain doğrulanabilir
            kaynaklardan türetilir; testnet; tahmini · yatırım tavsiyesi DEĞİLDİR.
          </p>
        </header>
        <LeaderboardClient />
      </main>
    </>
  );
}
