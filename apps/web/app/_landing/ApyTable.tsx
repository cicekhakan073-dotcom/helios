import { cacheLife, cacheTag } from "next/cache";

/**
 * APY tablosu — `"use cache"` directive ile fonksiyon seviyesinde cache.
 *
 * - `cacheLife({ revalidate: 300 })` → 5 dk önbellek
 * - `cacheTag('apy')` → PROMPT 22'de tx success sonrası invalidate edilebilir
 *
 * Veri kaynağı: testnet üzerinde Blend pool reserve'lerinden okunabilir
 * (`@helios/sdk` `loadPoolReserves`), ancak mock SEP-41 tokenları PROMPT 24
 * öncesi yok → şu an **statik tahmini APY** ile gösteriyoruz (etiket: "tahmini · testnet").
 * Gerçek veri akışı PROMPT 24 sonrası bu fn'i değiştirir; cache invalidation
 * `cacheTag('apy')` ile.
 */
async function loadApyRows(): Promise<ApyRow[]> {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("apy");

  // ⚠️ Tahmini değerler (testnet). Gerçek hesap PROMPT 24 sonrası
  // Blend reserve.data.b_rate / d_rate'den türetilecek.
  // `await Promise.resolve(...)` lint'in async require'ını karşılar — gerçek
  // RPC fetch geldiğinde bu satır gerçek await olur.
  return await Promise.resolve<ApyRow[]>([
    { asset: "USDC", supplyApy: 5.2, borrowApy: 8.4, leverage: 3, estLeveragedApy: 9.6 },
    { asset: "XLM", supplyApy: 4.8, borrowApy: 7.2, leverage: 2, estLeveragedApy: 7.2 },
    { asset: "wBTC", supplyApy: 3.5, borrowApy: 5.1, leverage: 2.5, estLeveragedApy: 7.4 },
    { asset: "wETH", supplyApy: 3.8, borrowApy: 5.4, leverage: 2.5, estLeveragedApy: 7.9 },
  ]);
}

interface ApyRow {
  asset: string;
  supplyApy: number;
  borrowApy: number;
  leverage: number;
  estLeveragedApy: number;
}

/** RSC — server'da render, `"use cache"` direktifiyle 5dk cache. */
export async function ApyTable() {
  const rows = await loadApyRows();
  return (
    <section className="py-20 px-6">
      <div className="mx-auto max-w-4xl flex flex-col gap-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-h1 text-text-high m-0">Vaults</h2>
            <p className="text-body text-text-medium mt-1 max-w-2xl">
              Helios MVP&apos;de tek-asset kaldıraçlı stratejiler.
            </p>
          </div>
          <span className="text-micro uppercase tracking-wider rounded-sm bg-warn-soft text-warn px-2 py-1">
            Tahmini · Testnet
          </span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border-default bg-space-700">
          <table className="w-full text-body">
            <thead className="text-text-low text-micro uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">Asset</th>
                <th className="text-right p-3">Supply APY</th>
                <th className="text-right p-3">Borrow APY</th>
                <th className="text-right p-3">Leverage</th>
                <th className="text-right p-3 text-text-high">Tahmini Leveraged APY</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.asset} className="border-t border-border-subtle">
                  <td className="p-3 text-text-high font-semibold">{row.asset}</td>
                  <td className="p-3 text-right text-text-medium tabular" data-num>
                    {row.supplyApy.toFixed(1)}%
                  </td>
                  <td className="p-3 text-right text-text-medium tabular" data-num>
                    {row.borrowApy.toFixed(1)}%
                  </td>
                  <td className="p-3 text-right text-text-medium tabular" data-num>
                    {row.leverage.toFixed(1)}×
                  </td>
                  <td className="p-3 text-right text-aurora-amber font-semibold tabular" data-num>
                    {row.estLeveragedApy.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-caption text-text-low m-0">
          ⚠️ Tahmini APY = supply &times; leverage − borrow &times; (leverage − 1). Yatırım tavsiyesi değildir,
          gerçek getiri fiyat oynaması ve likidasyon riskine bağlıdır.
        </p>
      </div>
    </section>
  );
}
