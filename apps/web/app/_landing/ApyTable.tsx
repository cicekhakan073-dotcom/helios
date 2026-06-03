import { cacheLife, cacheTag } from "next/cache";

/**
 * APY table — function-level cache via the `"use cache"` directive.
 *
 * - `cacheLife({ revalidate: 300 })` → 5 min cache
 * - `cacheTag('apy')` → can be invalidated after a tx success
 *
 * Data source: can be read from Blend pool reserves on testnet
 * (`@helios/sdk` `loadPoolReserves`); for now we show **static estimated APY**
 * (label: "estimated · testnet"). The cache is invalidated via `cacheTag('apy')`.
 */
async function loadApyRows(): Promise<ApyRow[]> {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("apy");

  // ⚠️ Estimated values (testnet). Real numbers would be derived from
  // Blend reserve.data.b_rate / d_rate. `await Promise.resolve(...)` satisfies
  // the lint async requirement — becomes a real await when an RPC fetch is wired.
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

/** RSC — rendered on the server, 5 min cache via the `"use cache"` directive. */
export async function ApyTable() {
  const rows = await loadApyRows();
  return (
    <section className="py-20 px-6">
      <div className="mx-auto max-w-4xl flex flex-col gap-6">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-h1 text-text-high m-0">Vaults</h2>
            <p className="text-body text-text-medium mt-1 max-w-2xl">
              Single-asset leveraged strategies in the Helios MVP.
            </p>
          </div>
          <span className="text-micro uppercase tracking-wider rounded-sm bg-warn-soft text-warn px-2 py-1">
            Estimated · Testnet
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
                <th className="text-right p-3 text-text-high">Est. Leveraged APY</th>
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
          ⚠️ Estimated APY = supply &times; leverage − borrow &times; (leverage − 1). Not financial
          advice; actual return depends on price movement and liquidation risk.
        </p>
      </div>
    </section>
  );
}
