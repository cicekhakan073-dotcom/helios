# ROADMAP-CHANGELOG.md

Denetim tarihi: **2026-05-31**. ROADMAP.md, canlı doğrulanmış [STELLAR_STACK.md](./STELLAR_STACK.md) ile karşılaştırıldı. Aşağıda "ne yanlıştı → ne yapıldı → neden (kaynak)" listesi.

---

## Düzeltmeler

### 1. Next.js Cache Components config anahtarı YANLIŞTI
- **Neredeydi:** Üst başlık tech-stack özeti; PROMPT 20 (Landing) BAĞLAM + YAPILACAKLAR.
- **Yanlış:** `experimental.cacheComponents` (ve meta-promptta "experimental.cacheComponents" geçiyordu).
- **Düzeltme:** Next.js 16 **stable** sürümde anahtar **top-level `cacheComponents: true`** (`next.config.ts`). `experimental.dynamicIO` → `cacheComponents` olarak rename edildi; `experimental.cacheComponents` diye bir flag stable'da yok.
- **Neden / kaynak:** nextjs.org/blog/next-16 — "Enable Cache Components in your `next.config.ts`: `cacheComponents: true`". Ayrıca Removals tablosu: `experimental.dynamicIO` → `cacheComponents`.

### 2. `experimental.ppr` referansı netleştirildi (kaldırılmış flag)
- **Neredeydi:** PROMPT 20 BAĞLAM/doğrulama; üst özet.
- **Sorun:** PPR'nin tamamen kaldırıldığı yeterince vurgulanmamıştı; model `experimental.ppr` yazma riskindeydi.
- **Düzeltme:** "`experimental.ppr` Next.js 16'da KALDIRILDI; route-level `export const experimental_ppr` da kaldırıldı; yerine Cache Components" notu eklendi.
- **Neden / kaynak:** nextjs.org/blog/next-16 Removals tablosu — "`experimental.ppr` flag removed", "`export const experimental_ppr` removed".

### 3. `@stellar/stellar-sdk` major sürüm sıçraması işaretlendi
- **Neredeydi:** PROMPT 18 (core SDK hook'lar) YAPILACAKLAR.
- **Sorun:** Sürüm belirtilmemişti; eğitim verisi v12/13 API'sini varsayabilir, oysa güncel **major 15.x**.
- **Düzeltme:** "@stellar/stellar-sdk major 15.x (≈15.1.0); eski v12/13 API'sini varsayma" uyarısı eklendi.
- **Neden / kaynak:** registry.npmjs.org/@stellar/stellar-sdk/latest → `15.1.0`.

### 4. Üst başlık tech-stack özetine doğrulanmış kesin pin'ler eklendi
- **Yanlış/eksik:** Sürümler ya genel ("soroban-sdk 26.x") ya da yoktu; tek doğruluk kaynağına atıf yoktu.
- **Düzeltme:** Tüm paketler canlı doğrulanmış kesin pin'lerle yazıldı ve [STELLAR_STACK.md](./STELLAR_STACK.md)'ye işaret edildi; "Çelişkide STELLAR_STACK.md > ROADMAP.md > eğitim verisi" notu eklendi.
- **Doğrulanan pin'ler (kaynak: crates.io/api + registry.npmjs.org, 2026-05-31):**
  - soroban-sdk **26.0.1**, stellar-cli **26.1.0**, blend-contract-sdk **2.25.0**
  - OZ stellar-tokens/stellar-access/stellar-contract-utils/stellar-macros **0.7.1**
  - @stellar/stellar-sdk **15.1.0**, @stellar/freighter-api **6.0.1**, @creit.tech/stellar-wallets-kit **2.2.0**, @blend-capital/blend-sdk **3.2.2**
  - next **16.2.6**, ai **6.0.193**, @ai-sdk/anthropic **3.0.81**

### 5. Her implementasyon promptuna "build/test çalıştır + çıktıyı oku" disiplini eklendi
- **Eksik:** Üst başlıkta yalnız "sürümü pinle" vardı; "build/test çalıştır, çıktıyı bizzat oku" disiplini açıkça yoktu.
- **Düzeltme:** "Her implementasyon promptunun SON adımı: build + test komutunu çalıştır ve çıktıyı bizzat oku (yeşil mi/hata mı, gizleme)" eklendi.
- **Neden / kaynak:** CLAUDE.md çalışma ilkeleri (empirik doğrulama refleksi).

---

## 2026-05-31 — İkinci tur denetim ("Mod A audit", canlı kaynaklarla derin tarama)

Birinci tur (yukarıdaki 5 madde) STELLAR_STACK.md'deki açık hataları düzeltti. İkinci tur (kullanıcı isteğiyle) **mimari ve API katmanını canlı kaynaklarla** taradı; ROADMAP'in sonuna büyük bir **"AUDIT 2026-05-31"** appendix'i eklendi. Aşağıda özet; tam metin: ROADMAP.md → "AUDIT 2026-05-31".

### 6. Blend v2 zaten flash_loan + batch op sağlıyor — Helios `flash_lender` kontratı GEREKSİZ
- **Neredeydi:** PROMPT 7-12, özellikle PROMPT 8 (`flash_lender`).
- **Yanlış / belirsiz:** Roadmap, Helios'un kendi flash_lender'ını yazmasını öneriyordu (EVM-Aave pattern'i).
- **Doğrusu:** Blend v2 pool kontratı `flash_loan(from, FlashLoan, requests: Vec<Request>) -> Positions` fn'ini doğrudan sağlıyor. Tek-tx flash + Supply/Borrow/Repay/Withdraw zinciri tamamen Blend tarafında.
- **Düzeltme:** PROMPT 8 OBSOLET olarak işaretlendi; PROMPT 12 `strategy_router` çok daha ince (Request vec kurar + `pool.flash_loan` çağırır, exec_op callback yok).
- **Kaynak:** github.com/blend-capital/blend-contracts-v2/blob/main/pool/src/contract.rs (raw, 2026-05-31).
- **Etki:** Kontrat sayısı 4 → 2 (+1 opsiyonel). Çok büyük sadeleşme.

### 7. Blend `Request` / `RequestType` / `FlashLoan` struct'ları sabitlendi
- **Neredeydi:** PROMPT 11.
- **Eksik:** Type'lar # DOĞRULANMADI işaretliydi (STELLAR_STACK §9).
- **Düzeltme:** AUDIT §1.2'de exact Rust kodu pinlendi: `Request { request_type: u32, address: Address, amount: i128 }` + RequestType enum (Supply=0..DeleteLiquidationAuction=9) + `FlashLoan { contract, asset, amount }`.
- **Kaynak:** github.com/blend-capital/blend-contracts-v2/blob/main/pool/src/pool/actions.rs.

### 8. OpenZeppelin Stellar Contracts vault konumu yanlıştı
- **Neredeydi:** STELLAR_STACK.md §1, PROMPT 9.
- **Yanlış:** "OZ stellar-contract-utils — vault, pausable, upgrade utils" → vault burada YOK.
- **Doğrusu:** OZ Vault `stellar-tokens` paketinde (`packages/tokens/vault/`), trait adı `FungibleVault`, ERC-4626 muadili (deposit/mint/withdraw/redeem/preview_*/convert_*/query_asset/total_assets/max_*).
- **Düzeltme:** AUDIT §1.3, §1.4. PROMPT 9 yeniden yorumlandı: Helios kendi vault'unu KURMAZ; Blend zaten `get_positions(user)` ile collateral+debt tutar; Helios position metadata off-chain Neon'da.
- **Kaynak:** docs.openzeppelin.com/stellar-contracts/tokens/vault/vault + github.com/OpenZeppelin/stellar-contracts/tree/main/packages.

### 9. SEP-40 (Reflector) trait imzaları kesinleşti
- **Neredeydi:** PROMPT 10, 27.
- **Eksik:** Fn imzaları # DOĞRULANMADI işaretliydi.
- **Düzeltme:** AUDIT §1.5'te exact trait pinlendi:
  ```
  fn base(env) -> Asset
  fn assets(env) -> Vec<Asset>
  fn decimals(env) -> u32
  fn resolution(env) -> u32
  fn price(env, Asset, u64) -> Option<PriceData>
  fn prices(env, Asset, u32) -> Option<Vec<PriceData>>  ← geçmiş fiyat (Monte Carlo)
  fn lastprice(env, Asset) -> Option<PriceData>
  ```
  + `Asset::Stellar(Address) | Other(Symbol)`, `PriceData { price: i128, timestamp: u64 }`, client adı `PriceFeedClient`.
- **Kaynak:** github.com/script3/sep-40-oracle/blob/main/sep-40/src/lib.rs.

### 10. "Vercel KV" Vercel'de native ürün olarak kaldırıldı
- **Neredeydi:** PROMPT 24 (faucet), PROMPT 29 (keeper cron), PROMPT 25 (AI rate-limit referans).
- **Yanlış:** "Vercel KV" yazılı, sanki hâlâ native ürünmüş gibi.
- **Doğrusu:** Vercel Storage bugün → Blob (file) + Edge Config (config) + Marketplace (Postgres/Redis/NoSQL). KV/Redis için `vercel install upstash` (Upstash Redis). DB için `vercel install neon` (Neon Postgres). Env değişkenleri otomatik inject.
- **Düzeltme:** PROMPT 24 başlığı güncellendi, AUDIT §3.4'te tam tablo + komutlar. PROMPT 30 DB seçimi netleşti: **Neon + Drizzle**.
- **Kaynak:** vercel.com/docs/storage (last updated 2026-05-06).

### 11. `middleware.ts` → `proxy.ts` (Next.js 16) ROADMAP'e yansımamıştı
- **Neredeydi:** PROMPT 17 (auth).
- **Yanlış:** Auth gate yapısı için middleware.ts varsayılıyordu (artık deprecated).
- **Doğrusu:** Next.js 16'da yeni dosya adı `proxy.ts` (Node.js runtime), export fn `proxy(request)`.
- **Düzeltme:** AUDIT §3.1 + PROMPT 17 başlığında uyarı.
- **Kaynak:** nextjs.org/blog/next-16 § "proxy.ts (formerly middleware.ts)".

### 12. Cache Components — `revalidateTag` yeni signature + `updateTag`/`refresh`
- **Neredeydi:** PROMPT 20 (landing cache), PROMPT 22 (tx invalidation).
- **Eksik:** `revalidateTag(tag)` deprecated single-arg form; yeni `updateTag()` (Server Actions read-your-writes) ve `refresh()` API'leri yoktu.
- **Düzeltme:** AUDIT §3.2 (cache stratejisi tablosu) + §3.3 (updateTag/refresh kullanım örnekleri).
- **Kaynak:** nextjs.org/blog/next-16 § "Improved Caching APIs".

### 13. AI SDK v6 Anthropic prompt caching atlanmıştı
- **Neredeydi:** PROMPT 25 (AI Copilot).
- **Eksik:** Prompt caching yoktu — uzun system prompt + tool tanımları her turun maliyetini şişirir.
- **Düzeltme:** AUDIT §3.5'te `providerOptions.anthropic.cacheControl = { type: 'ephemeral', ttl: '1h' }` system message ve tool tanımlarına; tam kod örneği.
- **Kaynak:** ai-sdk.dev/providers/ai-sdk-providers/anthropic.

### 14. `next lint` Next.js 16'da kaldırıldı
- **Neredeydi:** PROMPT 5.
- **Yanlış:** Roadmap'in örtük varsayımı `next build` lint çalıştırıyor / `next lint` var.
- **Doğrusu:** Komut kaldırıldı, `next build` lint çalıştırmaz, ESLint doğrudan kullan.
- **Düzeltme:** AUDIT §3.6.
- **Kaynak:** nextjs.org/blog/next-16 § "Removals".

### 15. ⚠️ Blend oracle manipulation exploit ($10.8M, 2025) — tasarım yansıması
- **Neredeydi:** Risk dili genelinde, oracle entegrasyonunda (PROMPT 10, 13, 22, 25).
- **Eksik:** Roadmap'te bu olay hiç anılmıyor. Helios testnet olsa da tasarım disiplinine yansımalı.
- **Düzeltme:** AUDIT §1.6'da güvenlik gereksinimleri: (a) staleness check her HF okumasında, `timestamp > 600s` revert; (b) sanity bounds (TWAP ile sapma > %30 revert); (c) UI'da "Oracle risk" ayrı başlık; (d) AI Copilot system prompt'ta oracle riski açıkça belirt.
- **Kaynak:** medium.com/@cryip/10-8m-oracle-manipulation-exploit-on-stellars-blend-protocol-6bdcbb1568c0.

### 16. B grubu tasarım kararları — daha önce belirsizdi, sabitlendi
AUDIT §2 içinde 6 karar gerekçeli yazıldı:
- **§2.1** Mock SEP-41 token deploy stratejisi (USDC/wBTC/wETH; XLM native).
- **§2.2** Reflector Pulse feed mapping (XLM/USDC → Stellar DEX feed; wBTC/wETH → External CEX&DEX feed).
- **§2.3** Keeper opt-in: on-chain source + Neon mirror + cron read-Neon/verify-on-chain.
- **§2.4** Storage TTL sabitleri: persistent low=30d/high=60d; instance low=7d/high=30d; her write fn'de auto-bump.
- **§2.5** Monte Carlo vol: `prices(asset, 288)` log-return → annualize; veri yetersizse defensive fallback `vol=0.60` + UI etiketi.
- **§2.6** Helios kendi flash fee'si YOK; Blend pool flash fee'si tek maliyet.

---

## Açık kalan / sonraki tur (helios-known-unknowns güncel)
AUDIT §5'te kapsam dışı bırakılanlar:
- `stellar contract bindings typescript` çıktı shape'i — PROMPT 18'de live görülecek.
- Blend `Positions` struct alanları — PROMPT 11'de `pool/src/storage.rs` okunmalı.
- Reflector `resolution()` testnet feed'lerinde gerçek değer — PROMPT 10'da `oracle.resolution()` ile teyit.
- Bad debt / liquidation auction — Helios MVP kapsam dışı, sadece risk dilinde belirt.
- Blend `max_positions` testnet pool değeri — deploy anında oku.

---

## Doğru olduğu TEYİT EDİLEN (değişmedi)
Bu maddeler zaten doğruydu, canlı kaynakla onaylandı — değiştirilmedi:
- `stellar contract build` + target **`wasm32v1-none`** (developers.stellar.org setup docs; Rust ≥1.84.0). ROADMAP zaten doğruydu (eski `soroban contract build` / `wasm32-unknown-unknown` KULLANILMAMIŞTI).
- soroban-sdk **26.x** ailesi (26.0.1 ile uyumlu).
- OZ Stellar Contracts crate adları (`stellar-tokens` vb.) ve "vault'u sıfırdan yazma" yaklaşımı.
- Blend v2: kendin deploy etme, testnet adreslerini env'den al; HF/LTV Blend'den oku.
- Reflector V3 SEP-40; decimals'ı kontrattan oku; testnet ≠ mainnet adres.
- Wallets Kit v2.x Freighter explicit-connect.
- AI SDK v6, `anthropic('claude-sonnet-4-6')` geçerli, tool streaming default açık (ai-sdk.dev/providers/.../anthropic ile teyit).
- Soroban: tek tx = tek InvokeHostFunctionOp, MEMO_NONE, muxed account yok, storage TTL.
- Toplam **34 atomik prompt** (28–36 aralığında) — granülerlik bozulmadı, bölme/birleştirme gerekmedi.

---

## Açık bırakılan # DOĞRULANMADI (impl anında teyit)
Bunlar uydurulmadı; STELLAR_STACK.md §9'da listeli:
- `blend-contract-sdk` (Rust) ve `@blend-capital/blend-sdk` (TS) exact fn imzaları (PoolContract, RequestType, default_reserve_config) — paket+sürüm doğrulandı, imzalar koddan OKUNMADI.
- Reflector SEP-40 exact fn imzaları — standart + adresler doğrulandı, imzalar değil.
- OZ stellar-contract-utils vault util public API'si — crate doğrulandı, imzalar değil.
- Testnet contract adresleri — 2026-05-31'de doğru; testnet reset'te rotasyon olabilir, deploy anında yeniden çek.
