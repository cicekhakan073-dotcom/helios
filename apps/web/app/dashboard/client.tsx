"use client";

import {
  hfBpsToFloat,
  normalizeError,
  pushAppError,
  useKeeperOptIn,
  useOraclePrice,
  usePoolReserves,
  useRouterInfo,
  useUserBlendPosition,
  WalletError,
} from "@helios/sdk";
import { Button, Card, CardHeader, CardMeta, CardTitle, ErrorBanner, StatTile } from "@helios/ui";

interface Props {
  address: string;
}

/** Demo trigger'ları — PROMPT 19 doğrulama. */
function triggerContractError() {
  pushAppError(new Error("contract call failed: Error(Contract, #21)"));
}

function triggerWalletReject() {
  pushAppError(new WalletError("USER_REJECTED", "user cancelled signature"));
}

function triggerOracleStale() {
  pushAppError(new Error("Error(Contract, #30)"));
}

function triggerUnknown() {
  pushAppError("beklenmedik bir şeyler oldu");
}

const INLINE_DEMO_ERROR = normalizeError(new Error("Error(Contract, #20)"));

export function DashboardClient({ address }: Props) {
  const router = useRouterInfo();
  const reserves = usePoolReserves();
  const position = useUserBlendPosition(address);
  const optIn = useKeeperOptIn(address);
  const btcPrice = useOraclePrice("wBTC");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Error UX demo (PROMPT 19)</CardTitle>
          <CardMeta>normalizeError + ToastHost + ErrorBanner</CardMeta>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={triggerContractError}>
            UnsafeHF (Contract #21)
          </Button>
          <Button variant="ghost" size="sm" onClick={triggerWalletReject}>
            Wallet reject
          </Button>
          <Button variant="ghost" size="sm" onClick={triggerOracleStale}>
            OracleStale (Contract #30)
          </Button>
          <Button variant="ghost" size="sm" onClick={triggerUnknown}>
            Bilinmeyen
          </Button>
        </div>
        <p className="text-caption text-text-low mt-3 m-0">
          Aşağıda inline ErrorBanner örneği — LeverageTooHigh (Contract #20):
        </p>
        <ErrorBanner error={INLINE_DEMO_ERROR} className="mt-2" />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Helios kontratları</CardTitle>
          <CardMeta>Testnet — canlı simulate</CardMeta>
        </CardHeader>
        {router.isLoading ? (
          <p className="text-body text-text-low m-0">Yükleniyor…</p>
        ) : router.data ? (
          <div className="flex flex-col gap-1 text-body text-text-medium">
            <span>
              Router admin:{" "}
              <code className="text-aurora-mauve font-mono" data-num>
                {router.data.admin.slice(0, 6)}…{router.data.admin.slice(-6)}
              </code>
            </span>
            <span>
              Paused:{" "}
              <code className="text-aurora-amber font-mono">{router.data.isPaused ? "true" : "false"}</code>
            </span>
          </div>
        ) : (
          <p className="text-body text-warn m-0">Router okuma başarısız (RPC erişimi?)</p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reflector — wBTC fiyatı</CardTitle>
          <CardMeta>External CEX & DEX feed</CardMeta>
        </CardHeader>
        {btcPrice.isLoading ? (
          <p className="text-body text-text-low m-0">Yükleniyor…</p>
        ) : btcPrice.data ? (
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Lastprice (i128)" value={btcPrice.data.price.toString()} />
            <StatTile label="Decimals" value={String(btcPrice.data.decimals)} />
            <StatTile label="Yaş (sn)" value={String(btcPrice.data.ageSeconds)} />
            <StatTile label="Freshness" value={btcPrice.data.freshness} />
          </div>
        ) : (
          <p className="text-body text-text-low m-0">Reflector yanıt vermedi (testnet feed boş olabilir).</p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blend pool reserves</CardTitle>
          <CardMeta>c_factor / l_factor / decimals</CardMeta>
        </CardHeader>
        {reserves.isLoading ? (
          <p className="text-body text-text-low m-0">Yükleniyor…</p>
        ) : reserves.data?.length ? (
          <ul className="flex flex-col gap-1 text-body text-text-medium">
            {reserves.data.map((r) => (
              <li key={r.asset} className="font-mono text-caption">
                idx={r.index} · {r.asset.slice(0, 6)}…{r.asset.slice(-6)} · c={r.cFactorBps} · l={r.lFactorBps} · d={r.decimals}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-text-low m-0">
            Reserve yok (testnet pool reset olmuş veya RPC erişilemedi).
          </p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pozisyonum (Blend)</CardTitle>
          <CardMeta>get_positions(user) — atomik tek-tx flash sonrası dolar</CardMeta>
        </CardHeader>
        {position.isLoading ? (
          <p className="text-body text-text-low m-0">Yükleniyor…</p>
        ) : position.data?.hasPosition ? (
          <pre className="text-caption font-mono text-text-medium overflow-x-auto">
            collateral: {JSON.stringify(serialize(position.data.collateral))}
            {"\n"}
            liabilities: {JSON.stringify(serialize(position.data.liabilities))}
          </pre>
        ) : (
          <p className="text-body text-text-low m-0">
            Pozisyon yok — &quot;Open position&quot; akışı PROMPT 21&apos;de gelir.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keeper opt-in</CardTitle>
          <CardMeta>Auto-Rebalancer ayarın</CardMeta>
        </CardHeader>
        {optIn.isLoading ? (
          <p className="text-body text-text-low m-0">Yükleniyor…</p>
        ) : optIn.data ? (
          <div className="flex flex-col gap-1 text-body text-text-medium">
            <span>
              Trigger HF: <strong>{hfBpsToFloat(BigInt(optIn.data.triggerHfBps))}</strong>
            </span>
            <span>
              Target HF: <strong>{hfBpsToFloat(BigInt(optIn.data.targetHfBps))}</strong>
            </span>
            <span>
              Max deleverage: <strong>{optIn.data.maxDeleverageBps / 100}%</strong>
            </span>
            <span>
              Active: <strong>{optIn.data.active ? "Evet" : "Hayır"}</strong>
            </span>
          </div>
        ) : (
          <p className="text-body text-text-low m-0">
            Opt-in yok — kullanıcı henüz keeper koruması açmadı (PROMPT 23 UI).
          </p>
        )}
      </Card>
    </>
  );
}

/** bigint → string (JSON için). */
function serialize(record: Record<number, bigint>): Record<number, string> {
  const out: Record<number, string> = {};
  for (const k of Object.keys(record)) {
    const value = record[Number(k)];
    if (value != null) {
      out[Number(k)] = value.toString();
    }
  }
  return out;
}
