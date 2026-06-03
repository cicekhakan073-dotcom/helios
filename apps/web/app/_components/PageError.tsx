"use client";

/**
 * PageError — route segment error.tsx için ortak fallback.
 * Reset prop'u Next'in `error.tsx`'in {reset} kontratı.
 */

import { DisclaimerStrip } from "@helios/ui";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

export function PageError({ error, reset, title }: Props) {
  return (
    <>
      <DisclaimerStrip />
      <main className="mx-auto max-w-2xl px-6 py-16 flex flex-col gap-4">
        <h1 className="text-h1 text-text-high m-0">{title ?? "Bir hata oluştu"}</h1>
        <p className="text-body text-text-medium m-0">
          Bu sayfa render edilirken beklenmedik bir hata oluştu. Sayfanın geri kalanına dokunmaz;
          aşağıdan tekrar dene.
        </p>
        <div
          role="alert"
          className="rounded-md border border-danger bg-danger-soft p-4 font-mono text-caption text-danger break-all"
        >
          {error.message}
          {error.digest && (
            <div className="mt-1 text-micro text-text-low">digest: {error.digest}</div>
          )}
        </div>
        <button
          type="button"
          onClick={reset}
          className="self-start rounded-md bg-aurora-amber text-text-on-aurora h-11 px-5 font-semibold hover:bg-aurora-amber-glow"
        >
          Tekrar dene
        </button>
        <p className="text-caption text-text-low m-0">
          Eğitim amaçlıdır · testnet · unaudited · yatırım tavsiyesi değildir.
        </p>
      </main>
    </>
  );
}
