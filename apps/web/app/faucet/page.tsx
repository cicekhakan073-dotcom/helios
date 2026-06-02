import { DisclaimerStrip } from "@helios/ui";

import { FaucetClient } from "./_components/FaucetClient";

/**
 * /faucet — XLM Friendbot proxy + Upstash rate-limit.
 *
 * Cache Components: shell statik prerender; client component cüzdan adresini
 * Zustand store'dan okur (proxy.ts gate'i yok — auth gerektirmiyor).
 *
 * USDC/wBTC/wETH: SAC issuer'ı `GATALTGT…` (Blend testnet), secret bizde değil
 * → otomatik faucet yok; UI manuel yönlendirme.
 */
export default function FaucetPage() {
  return (
    <>
      <DisclaimerStrip />
      <main className="mx-auto max-w-3xl px-6 py-12 flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-h1 text-text-high m-0">Faucet</h1>
          <p className="text-body text-text-medium m-0 max-w-xl">
            Bağlı cüzdanına testnet XLM gönder. Friendbot proxy&apos;si; Upstash Redis ile hız
            sınırlı. Sadece testnet.
          </p>
        </header>
        <FaucetClient />
      </main>
    </>
  );
}
