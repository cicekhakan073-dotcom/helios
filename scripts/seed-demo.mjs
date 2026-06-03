#!/usr/bin/env node
/**
 * Helios demo seed — DATABASE_URL varsa örnek strateji + leaderboard girdisi
 * ekler; yoksa zarif çıkar (route'lar zaten boş döner).
 *
 * Kullanım:
 *   DATABASE_URL="postgres://..." node scripts/seed-demo.mjs
 *
 * Pozisyon snapshot'ı on-chain açıldıktan SONRA Confirm akışı yazar; bu script
 * yalnız sosyal yüzeyi (anonim handle + paylaşılmış strateji) seed'ler. Gerçek
 * demo: /faucet → /open XLM 2× → /dashboard → /leaderboard.
 */

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.warn("[seed-demo] DATABASE_URL yok — sessizce çıkıyorum (graceful).");
  process.exit(0);
}

const sql = neon(url);

const DEMO_ACCOUNTS = [
  // testnet G… placeholder'ları; gerçek demo cüzdanlarıyla değiştirilebilir.
  "GAQUEFDOXDAFEE7R3LKDA3BUGDTNJBFQZP7MPHEGZIJVWBWCABV7APYM",
  "GBKEEPER0000000000000000000000000000000000000000000000",
];

function anonHandleFor(account) {
  let h = 0;
  for (let i = 0; i < account.length; i++) h = (h * 31 + account.charCodeAt(i)) >>> 0;
  return `helios_${h.toString(36).padStart(8, "0").slice(0, 8)}`;
}

async function ensureUser(account) {
  await sql`
    insert into users (account, anon_handle, show_address)
    values (${account}, ${anonHandleFor(account)}, false)
    on conflict (account) do nothing
  `;
}

async function insertStrategy(account, asset, leverageBps, horizonDays, volBps, note) {
  await sql`
    insert into strategies (account, asset, leverage_bps, horizon_days, vol_assumption_bps, note)
    values (${account}, ${asset}, ${leverageBps}, ${horizonDays}, ${volBps}, ${note})
  `;
}

async function main() {
  console.log("[seed-demo] users…");
  for (const acc of DEMO_ACCOUNTS) await ensureUser(acc);

  console.log("[seed-demo] strategies…");
  await insertStrategy(
    DEMO_ACCOUNTS[0],
    "XLM",
    200,
    30,
    8000,
    "2× XLM, %80 vol varsayım, 30 gün — Risk Radar baseline.",
  );
  await insertStrategy(
    DEMO_ACCOUNTS[0],
    "XLM",
    150,
    60,
    6000,
    "1.5× XLM, daha temkinli (vol %60 varsayım); açılış HF ≈ 2.4×.",
  );
  await insertStrategy(
    DEMO_ACCOUNTS[1],
    "XLM",
    175,
    14,
    10000,
    "1.75× XLM kısa horizon; yüksek vol stres testi.",
  );

  console.log("[seed-demo] tamam.");
}

main().catch((err) => {
  console.error("[seed-demo] hata:", err);
  process.exit(1);
});
