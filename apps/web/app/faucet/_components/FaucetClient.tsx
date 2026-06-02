"use client";

/**
 * FaucetClient — XLM Friendbot çağrısı (POST /api/faucet) + cüzdan bağı.
 *
 * NOT — USDC/wBTC/wETH için issuer secret bizde yok (Blend testnet GATALTGT…).
 * Bu yüzden UI'da yalnız "manuel" yönlendirme + dış linkler. ASLA çalışmayan
 * mint butonu eklemiyoruz (PROMPT 24 kabulü).
 */

import { selectAddress, useWalletStore } from "@helios/sdk";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

interface FaucetSuccess {
  ok: true;
  funded?: boolean;
  alreadyFunded?: boolean;
  hash?: string | null;
  explorerUrl?: string | null;
  message?: string;
  backend?: "redis" | "memory";
  remaining?: number;
}
interface FaucetFailure {
  ok: false;
  code: string;
  message: string;
  retryAfterSeconds?: number;
}
type FaucetResponse = FaucetSuccess | FaucetFailure;

export function FaucetClient() {
  const address = useWalletStore(selectAddress);
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<FaucetResponse | null>(null);

  async function requestXlm() {
    if (!address || pending) return;
    setResult(null);
    setPending(true);
    try {
      const resp = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, asset: "XLM" }),
      });
      const json = (await resp.json()) as FaucetResponse;
      setResult(json);
      if (json.ok) {
        void queryClient.invalidateQueries({ queryKey: ["helios", "blend"] });
        void queryClient.invalidateQueries({
          queryKey: ["helios", "contract", "position", address],
        });
      }
    } catch (err) {
      setResult({
        ok: false,
        code: "CLIENT_ERROR",
        message: err instanceof Error ? err.message : "İstek başarısız",
      });
    } finally {
      setPending(false);
    }
  }

  if (!address) {
    return (
      <section className="rounded-lg bg-space-700 border border-border-default p-6 flex flex-col gap-3">
        <h2 className="text-h2 text-text-high m-0">Önce cüzdanı bağla</h2>
        <p className="text-body text-text-medium m-0">
          Faucet bağlı testnet adresine gönderim yapar. Cüzdanı{" "}
          <Link href="/" className="text-aurora-teal underline-offset-2 hover:underline">
            ana sayfadan
          </Link>{" "}
          bağla, sonra geri dön.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-lg bg-space-700 border border-border-default p-6 flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-h2 text-text-high m-0">XLM (Friendbot)</h2>
          <p className="text-caption text-text-low m-0">
            Testnet Friendbot her hesabı tek seferde ~10000 XLM ile fonlar; sonraki isteklerde
            &quot;zaten fonlu&quot; yanıtı döner.
          </p>
        </header>

        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-body">
          <dt className="text-text-low">Adres</dt>
          <dd className="text-text-high font-mono tabular m-0 break-all" data-num>
            {address}
          </dd>
        </dl>

        <button
          type="button"
          onClick={() => void requestXlm()}
          disabled={pending}
          data-cta="faucet-xlm"
          className="self-start rounded-md bg-aurora-amber text-text-on-aurora h-12 px-6 font-semibold hover:bg-aurora-amber-glow disabled:opacity-50"
        >
          {pending ? "Friendbot çağrılıyor…" : "XLM iste"}
        </button>

        {result && <ResultPanel result={result} />}
      </section>

      <ManualAssetSection />

      <p className="text-caption text-text-low m-0">
        ⚠️ Sadece testnet. Mainnet/muxed adres kabul edilmez. Hız sınırı saatte 5 istek/adres+IP
        (Upstash veya in-memory fallback).
      </p>
    </>
  );
}

function ResultPanel({ result }: { result: FaucetResponse }) {
  if (result.ok) {
    return (
      <div className="rounded-md bg-aurora-teal-soft border border-aurora-teal p-4 flex flex-col gap-2">
        <strong className="text-text-high">
          {result.alreadyFunded ? "Zaten fonlu ✓" : "XLM gönderildi ✓"}
        </strong>
        {result.message && <span className="text-caption text-text-medium">{result.message}</span>}
        {result.explorerUrl && result.hash && (
          <a
            href={result.explorerUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-caption font-mono text-aurora-teal underline-offset-2 hover:underline break-all"
          >
            {result.hash}
          </a>
        )}
        {result.remaining != null && (
          <span className="text-caption text-text-low">
            Saatte kalan istek: {result.remaining}
            {result.backend === "memory" && " (in-memory fallback)"}
          </span>
        )}
      </div>
    );
  }
  return (
    <div
      role="alert"
      className="rounded-md border border-danger bg-danger-soft p-4 flex flex-col gap-1"
    >
      <strong className="text-text-high">Hata: {result.code}</strong>
      <span className="text-caption text-text-medium">{result.message}</span>
      {result.retryAfterSeconds != null && (
        <span className="text-caption text-text-low">
          Tekrar denemek için ~{result.retryAfterSeconds}sn bekle.
        </span>
      )}
    </div>
  );
}

function ManualAssetSection() {
  return (
    <section className="rounded-lg bg-space-700 border border-border-default p-6 flex flex-col gap-3">
      <h2 className="text-h2 text-text-high m-0">USDC / wBTC / wETH</h2>
      <p className="text-body text-text-medium m-0">
        Bu üç asset&apos;in SAC issuer&apos;ı{" "}
        <code className="font-mono text-aurora-amber">GATALTGT…</code> (Blend testnet) ve{" "}
        <strong>Helios bu hesabın secret&apos;ına sahip değil</strong> — otomatik mint imkansız
        (canlı doğrulandı 2026-06-03, ROADMAP-CHANGELOG).
      </p>
      <ul className="text-body text-text-medium list-disc pl-5 m-0 flex flex-col gap-1">
        <li>Demo akışı XLM üzerinde uçtan uca çalışır; cap 2×, AUDIT 2026-06-02 §6.1 (Path B).</li>
        <li>
          Diğer asset&apos;leri test etmek için: Soroswap testnet swap (XLM → USDC), StellarTerm
          Testnet manuel transfer veya Blend Discord faucet kanalı.
        </li>
        <li>
          Trustline gerekli: cüzdandan{" "}
          <code className="font-mono">changeTrust(USDC:GATALTGT…)</code> opsiyonu; aksi halde
          issuer&apos;dan transfer reddedilir (error #13).
        </li>
      </ul>
      <p className="text-caption text-text-low m-0">
        Bu sayfada otomatik buton koymuyoruz çünkü çalışmayan bir CTA dürüstlük ilkesini ihlal eder
        (CLAUDE.md).
      </p>
    </section>
  );
}
