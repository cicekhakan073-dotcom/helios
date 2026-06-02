"use client";

/**
 * ConfirmFlow — /open/confirm sayfasının ana client orkestrasyonu.
 *
 * Akış (AUDIT 2026-06-02 §6.2):
 *   1. Wizard store'dan params oku → params null ise kullanıcıyı /open'a yönlendir.
 *   2. `useSimulateOpenPosition(params)` → simulate preview canlı.
 *   3. Kullanıcı "Sign & Send" tıklar → `useOpenPositionSend` mutation.
 *   4. Mutation onSuccess:
 *        a) Optimistic UI: `queryClient.setQueryData(positionQueryKey, …)` ile patch.
 *        b) `updateTag('helios-position-${address}')` — RSC cache rebust.
 *        c) Authoritative DB write YOK (§6.2c — indexer PROMPT 29 yazar).
 *        d) Result UI'sı (hash + Stellar Expert linki + "Continue to dashboard").
 *   5. Mutation onError → normalize + toast hub (PROMPT 19).
 *
 * §6.4 — `usePosition` zaten hydration fallback yapar (sdk/helios/hooks.ts);
 *  optimistic patch bu hook'un cache'ine yazılır.
 */


import {
  ASSET_META,
  normalizeError,
  positionQueryKey,
  pushAppError,
  selectAddress,
  txExplorerLink,
  useOpenPositionSend,
  useSimulateOpenPosition,
  useWalletStore,
  type SignAndSendResult,
} from "@helios/sdk";
import { Button } from "@helios/ui";
import { useQueryClient } from "@tanstack/react-query";
import { updateTag } from "next/cache";
import Link from "next/link";
import { useMemo, useState } from "react";

import { formatLeverage, formatPrincipal, parsePrincipal, useWizard } from "../../_state/wizard-store";

export function ConfirmFlow() {
  const address = useWalletStore(selectAddress);

  const assetId = useWizard((s) => s.assetId);
  const principalRaw = useWizard((s) => s.principalRaw);
  const leverageBps = useWizard((s) => s.leverageBps);
  const resetWizard = useWizard((s) => s.reset);

  const meta = ASSET_META[assetId];
  const principal = useMemo(
    () => parsePrincipal(principalRaw, meta.decimals),
    [principalRaw, meta.decimals],
  );

  const buildParams = useMemo(() => {
    if (!address || !principal || principal <= 0n) return null;
    return { userAddress: address, assetId, principal, leverageBps };
  }, [address, principal, assetId, leverageBps]);

  const simQ = useSimulateOpenPosition(buildParams);

  const queryClient = useQueryClient();
  const [result, setResult] = useState<SignAndSendResult | null>(null);

  const sendM = useOpenPositionSend({
    onSuccess: (res) => {
      setResult(res);
      if (!address) return;
      // §6.2(c) optimistic UI — Helios meta'sı için leverageBps + openedAt patchle.
      queryClient.setQueryData(positionQueryKey(address), (prev: unknown) => {
        const now = Math.floor(Date.now() / 1000);
        const base = (prev as { meta?: object; blend?: unknown } | null) ?? null;
        return {
          ...(base ?? {}),
          meta: {
            ...(base?.meta ?? {
              user: address,
              entryPriceI128: null,
              openedAt: null,
              optInKeeper: false,
            }),
            leverageBps,
            openedAt: now,
          },
          blend: base?.blend ?? null,
          leverageSource: "meta",
          effectiveLeverageBps: leverageBps,
        };
      });
      // Blend pool snapshot'ı tx sonrası invalidate — gerçek collateral/debt yeniden çekilir.
      void queryClient.invalidateQueries({ queryKey: ["helios", "blend"] });
      // RSC cache rebust (PROMPT 23 dashboard "use cache" segmentleri için).
      try {
        updateTag(`helios-position-${address}`);
      } catch {
        // updateTag yalnızca Server Action / Route Handler içinde garantili çalışır;
        // client'tan çağrı sessiz fail edebilir — DB write authoritative indexer'a
        // bırakıldığı için bu güvenli.
      }
    },
    onError: (err) => {
      const app = normalizeError(err);
      pushAppError(app);
    },
  });

  // —— Erken state'ler ——
  if (!address) {
    return (
      <Panel>
        <p className="text-body text-text-medium m-0">
          Cüzdan bağlı değil. <Link href="/open" className="underline text-aurora-teal">Wizard&apos;a dön</Link> ve önce cüzdanı bağla.
        </p>
      </Panel>
    );
  }

  if (!buildParams) {
    return (
      <Panel>
        <p className="text-body text-text-medium m-0">
          Eksik parametre — principal girilmemiş ya da geçersiz. <Link href="/open" className="underline text-aurora-teal">Wizard</Link>&apos;a dön.
        </p>
      </Panel>
    );
  }

  // —— Sonuç ekranı ——
  if (result) {
    return (
      <Panel data-state="success">
        <header className="flex items-center gap-3">
          <span aria-hidden className="inline-block w-3 h-3 rounded-full bg-aurora-teal shadow-glow-teal" />
          <h2 className="text-h2 text-text-high m-0">Pozisyon açıldı</h2>
        </header>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-body">
          <dt className="text-text-low">Tx hash</dt>
          <dd className="text-text-high font-mono break-all m-0" data-tx-hash>{result.hash}</dd>
          {result.ledger != null && (
            <>
              <dt className="text-text-low">Ledger</dt>
              <dd className="text-text-high font-mono tabular m-0" data-num>{result.ledger}</dd>
            </>
          )}
        </dl>
        <div className="flex flex-wrap gap-3">
          <a
            href={txExplorerLink(result.hash)}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center rounded-md bg-space-600 text-text-high px-4 h-11 hover:bg-space-500 transition-colors"
          >
            Stellar Expert ↗
          </a>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-aurora-amber text-text-on-aurora px-5 h-11 font-semibold hover:bg-aurora-amber-glow shadow-glow-amber transition-[background,box-shadow] duration-[120ms]"
            onClick={() => {
              resetWizard();
            }}
          >
            Dashboard&apos;a git
          </Link>
        </div>
        <p className="text-caption text-text-low m-0">
          ⓘ Pozisyon meta&apos;sı şu an optimistic gösterimde. Authoritative kayıt indexer
          (PROMPT 29) tarafından yazılır; sayfayı yenilersen Blend pool authoritative
          state&apos;i okunur.
        </p>
      </Panel>
    );
  }

  // —— Simulate state'leri ——
  const isSimulating = simQ.isFetching && !simQ.data;
  const simError = simQ.error;
  const preview = simQ.data;

  const disabledReason: string | null = sendM.isPending
    ? "İmza bekleniyor…"
    : !preview
      ? isSimulating
        ? "Simulate çalışıyor"
        : "Simulate sonucu yok"
      : null;

  return (
    <Panel>
      <header>
        <h2 className="text-h2 text-text-high m-0">Tx önizleme</h2>
        <p className="text-caption text-text-low m-0 mt-1">
          Simulate ile footprint + resource fee yapıştırıldı. İmza sonrası tek atomik
          tx olarak gönderilir.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body">
        <dt className="text-text-low">Asset</dt>
        <dd className="text-text-high text-right m-0 font-mono">{meta.label}</dd>

        <dt className="text-text-low">Principal</dt>
        <dd className="text-text-high text-right m-0 font-mono tabular" data-num>
          {principal ? formatPrincipal(principal, meta.decimals, 4) : "—"} {assetId}
        </dd>

        <dt className="text-text-low">Leverage</dt>
        <dd className="text-text-high text-right m-0 font-mono tabular" data-num>
          {formatLeverage(leverageBps)}
        </dd>

        <dt className="text-text-low">Min resource fee</dt>
        <dd className="text-text-high text-right m-0 font-mono tabular" data-num>
          {preview?.minResourceFee != null
            ? `${preview.minResourceFee.toString()} stroops`
            : isSimulating
              ? "…"
              : "—"}
        </dd>

        <dt className="text-text-low">Latest ledger</dt>
        <dd className="text-text-high text-right m-0 font-mono tabular" data-num>
          {preview?.latestLedger ?? (isSimulating ? "…" : "—")}
        </dd>
      </dl>

      {simError && (
        <div
          role="alert"
          className="rounded-md border border-danger bg-danger-soft px-4 py-3 text-caption text-danger"
        >
          <strong className="block">Simulate başarısız</strong>
          <span className="font-mono text-micro break-all">{simError.message}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          size="lg"
          disabled={!preview || sendM.isPending}
          onClick={() => {
            if (!preview) return;
            sendM.mutate({ preparedTx: preview.preparedTx, userAddress: address });
          }}
          data-cta="sign-and-send"
        >
          {sendM.isPending ? "Cüzdan açılıyor…" : "Sign & Send"}
        </Button>
        <Link
          href="/open"
          className="inline-flex items-center justify-center rounded-md bg-space-600 text-text-medium px-4 h-12 hover:bg-space-500 transition-colors"
        >
          Düzenle
        </Link>
        {disabledReason && (
          <span className="text-caption text-text-low self-center">{disabledReason}</span>
        )}
      </div>

      <p className="text-caption text-text-low m-0">
        ⚠️ Testnet · unaudited · yatırım tavsiyesi değildir.
      </p>
    </Panel>
  );
}

function Panel({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      {...rest}
      className="rounded-lg bg-space-700 border border-border-default p-6 flex flex-col gap-5"
    >
      {children}
    </section>
  );
}
