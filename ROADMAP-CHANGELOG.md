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

---

## DOĞRULAMA 2026-06-02 — Pool oracle (CAZOKR2Y) SEP-40 API canlı kontrol
**Bağlam:** PROMPT 22 DEVAM, AUDIT 2026-06-02 §6.1 Path B — Blend pool'un kendi oracle'ı `CAZOKR2Y5E2OSWSIBRVZMJ47RUTQPIGVWSAQ2UISGAVC46XKPGDG5PKI`. Helios HF tutarlılığı için fiyatlar BU oracle'dan okunmalı; ASSET_META wBTC/wETH için `Other("BTC"/"ETH")` varsayıyordu — canlı doğrulama gerekti.

**Yöntem:** `stellar contract invoke ... -- lastprice --asset "{\"Stellar\":\"…\"}"` (testnet, 2026-06-02).

**Bulgular:**
- `decimals() = 7`, `base() = {"Other":"USD"}` → 7 ondalıklı USD.
- `assets()` = pool'da kayıtlı 4 reserve SAC adresi tümü **`{"Stellar":"C…"}`** variantı (USDC, XLM, wETH, wBTC).
- `lastprice(Stellar(XLM_SAC))` = `{"price":"4200000","timestamp":1780414895}` → $0.42.
- `lastprice(Stellar(USDC_SAC))` = `{"price":"10000000","timestamp":1780414895}` → $1.00.
- `lastprice(Stellar(wBTC_SAC))` = `null` — fiyat akmıyor.
- `lastprice(Stellar(wETH_SAC))` = `null` — fiyat akmıyor.

**Sonuç:**
1. Pool oracle SEP-40 Asset enum'unun **Stellar(Address)** variantını bekler; 4 reserve için doğru sorgu = SAC adresi (Other(Symbol) DEĞİL).
2. wBTC/wETH oracle'da publish edilmiyor — UI bunu graceful "fiyat akışı yok" göstermek zorunda; HF/live preview hesaplanamaz.
3. MVP demo akışı için **USDC/XLM** desteklenir; wBTC/wETH UI'da disabled + "no price feed (testnet)" rozeti ile gösterilecek.

**Etki:**
- `ASSET_META.{wBTC,wETH}.reflector.kind` referans olarak `Other` kalır (Reflector V3 external_cex_dex feed'inde fiyat var), AMA HF/Helios oracle path'i için tüm asset'ler SAC adresi ile pool_oracle'a gider.
- AssetPicker (PROMPT 21) wBTC/wETH için "fiyat akışı yok" rozetiyle disable edilecek (PROMPT 22 DEVAM içinde).

---

## TEŞHİS 2026-06-03 — #1205 kök sebep (Helios open_position çift-borç bug'ı)

**Bağlam:** PROMPT 12-FIX-V'de #1205 = `InvalidHf` doğrulandı ve eşik
`L·c·l/(L-1)` formülü ile XLM 2x → 1.62 → "1.30 üstü" denilerek SDK cap 200
bps'ye çekildi. AMA empirik test: 2x (principal 10 XLM) HALA #1205 atıyor.
12-FIX-V'nin teorik HF hesabı doğru AMA Helios'un on-chain çağrı şekli formüldeki
varsayımı kırıyor.

**Yöntem:** SALT inceleme — kod değişikliği YOK, deploy YOK. Üç hipotezi
canlı testnet event'leri + blend-contracts-v2/main kaynağı + Reflector
get_reserve rate'leri ile ayırt ettim. Bu turdaki canlı XLM rate'leri:
b_rate = 1_329_181_748_588, d_rate = 1_511_791_270_251 (≈1.329 / 1.512, 12-dec
scalar). Kontrat: router CAY2KRMOOOIYRHKHY5QJJF6L35PXZTRO3U6OZ54NJPMCWS7ZEVSB2CUX,
pool CCEBVDYM…44HGF.

### #1205 kesin variant adı (KAYNAK DOĞRULAMA)
`blend-contracts-v2/main/pool/src/errors.rs`:
```
InvalidHf = 1205,
```
Yorum: "Error codes for the pool contract. … Pool specific errors start at
1200." Doc-comment yok; variant adı bu satırda. 12-FIX-V'nin "InvalidHf"
çağrısı **doğru**. Sorun adda değil, ne zaman atıldığında.

### #1205'in atıldığı tek nokta — `validate_submit`
`blend-contracts-v2/main/pool/src/pool/submit.rs` `validate_submit` fn
(satır 189–221) içinde:
```rust
if check_health && from_state.has_liabilities() {
    let position_data = PositionData::calculate_from_positions(
        e, pool, &from_state.positions);
    if position_data.is_hf_under(e, 1_0000100) {
        panic_with_error!(e, PoolError::InvalidHf);
    } ...
}
```
Yani Blend'in tek `InvalidHf` eşiği **`1_0000100` (SCALAR_7)** = HF < 1.00001.
"1.30" Blend'in eşiği DEĞİL — Helios'un kendi `min_open_hf_bps`. Blend'i
geçmek için **gerçek HF < 1.00001 olmamalı**.

### H1 — Same-reserve hem collateral hem liability yasak mı? ❌ ÇÜRÜTÜLDÜ
Kaynak: `pool/src/pool/actions.rs build_actions_from_request` (satır 79–181) ve
`pool/src/pool/health_factor.rs PositionData::calculate_from_positions`. İki
kanıt:
1. actions.rs request'leri **birbirinden bağımsız** uygular: `apply_supply_collateral`
   user.add_collateral, `apply_borrow` user.add_liabilities — aralarında
   cross-check yok, "same reserve" guard'ı yok (lines 91–92 yalnız
   `require_nonnegative`).
2. health_factor.rs reserve loop'u `if b_token == 0 && d_token == 0 { continue; }`
   ile filtreliyor — tek reserve aynı anda hem collateral hem liability
   tutabilir (her iki Map'te de pozitif değer olabilir).

**Sonuç:** Same-asset MVP mimari olarak yasak DEĞİL. §6.3 cross-asset
zorunluluğu YOK. Hatanın kaynağı same-asset semantiği değil.

### H2 — Helios open_position çift-borç (FLASH liability + Borrow request) ✅ KÖK SEBEP
`pool/src/pool/submit.rs execute_submit_with_flash_loan` akışı (kaynak full):
```rust
// ADIM 1 — flash liability'yi user'a yaz (request'lerden ÖNCE!)
let d_tokens_minted = reserve.to_d_token_up(e, flash_loan.amount);
from_state.add_liabilities(e, &mut reserve, d_tokens_minted);
// ADIM 2 — diğer request'leri uygula
let mut actions = build_actions_from_request(e, &mut pool, &mut from_state, requests);
// ADIM 3 — HF kontrol (her zaman true)
validate_submit(e, &mut pool, &from_state, prev_positions_count, true, …);
// ADIM 4 — flash transfer + exec_op + handle_transfer_with_allowance
```

Helios `strategy_router::open_position` requests'i:
```rust
requests.push_back(supply_collateral_req(asset, total_collateral));  // OK
requests.push_back(borrow_req(asset, borrow_amount));                // ❌ FAZLALIK
```
ve `flash_loan(user, FlashLoan{contract: router, asset, amount: flash_amount}, requests)`.

Blend semantiğinde **`flash_loan.amount` zaten user'ın borcu olarak yazılıyor**
(ADIM 1). Helios'un ek `Borrow(flash_amount)` request'i ADIM 2'de aynı miktarı
**ikinci kez** liability'ye ekliyor.

**Net pozisyon (ADIM 3 öncesi):**
- collateral underlying = `total_collateral` = `principal + flash_amount`
- liability underlying  = `flash_amount` (ADIM 1) + `flash_amount` (ADIM 2 Borrow) = `2 × flash_amount`

**2x örneği (principal = P, flash = P, total = 2P):**
- collateral = 2P, liability = 2P
- Effective: `2P × c_factor` vs `2P / l_factor` → c·l = 0.81
- HF = (2P × 0.9) / (2P / 0.9) = 1.62P × 0.9 / 2P = **0.81 < 1.0000100 → #1205 ✓**

Empirik kanıtla aynen tutuyor: events `supply_collateral(200_000_000)`,
`borrow(100_000_000)`, sonra #1205. b/d-rate mint cancel olur (mint sırasında
÷rate, HF sırasında ×rate); o yüzden b_rate=1.329, d_rate=1.512 ŞART değil —
ama H3 numerik doğrulaması için aşağıda yine de hesapladım.

### H3 — Gerçek HF (b_rate/d_rate uygulanmış) ✅ NUMERİK DOĞRULAMA
b/d-rate mint+HF aşamasında matematik olarak cancel ettiği için H3 ile H2
sayısı aynı çıkar; yine de empirik tutarlılık için:

**Mevcut (yanlış) akış, 2x:**
- b_tokens minted = `200_000_000 / 1.329 ≈ 150_517_818` (event'le birebir)
- d_tokens (flash) = `100M / 1.512 ≈ 66_140_000`; d_tokens (Borrow) = aynı
- Toplam d_tokens ≈ 132_280_000
- col_underlying = `150_517_818 × 1.329 ≈ 200M`
- liab_underlying = `132_280_000 × 1.512 ≈ 200M`
- Eff col = 200M × 0.9 = 180M; Eff liab = 200M / 0.9 ≈ 222.2M
- **HF = 180/222.2 ≈ 0.81** → 1.0000100 altında → #1205 ✓

**DOĞRU akış (Borrow request'siz), 2x:**
- d_tokens yalnız flash'tan = ≈66_140_000
- liab_underlying = 100M; eff_liab = 100M/0.9 = 111.1M
- col_underlying = 200M; eff_col = 180M
- **HF = 180/111.1 ≈ 1.62** → 1.0000100'ün çok üstünde ✓

**3x test (DOĞRU akış):** col_underlying=300M, liab=200M; eff: 270M / 222.2M
→ HF = **1.215**. Blend'in 1.0000100 eşiğini geçer (kabul!), AMA Helios kendi
`min_open_hf_bps = 130 = 1.30` post-check'i reddeder (`UnsafeHealthFactor`).

### Sonuç

| Hipotez | Verdict | Kanıt |
|---|---|---|
| H1 Same-reserve yasağı | **ÇÜRÜK** | actions.rs / health_factor.rs guard yok |
| H2 Çift-borç (FLASH + Borrow) | **DOĞRU — kök sebep** | submit.rs ADIM 1+2 + empirik HF 0.81 |
| H3 b/d-rate kaynaklı HF düşüşü | **NUMERİK OLARAK H2 ile aynı** | b/d-rate mint+HF'de cancel; H2 yeterli |

**Same-asset MVP viability: KOŞULLU ÇALIŞIR.**
- Mimari olarak yasak yok (H1). 
- Helios'un `Vec<Request>`'inden Borrow request'i ÇIKARMAK gerekiyor (H2 fix).
- Fix sonrası 2x (XLM/USDC) Blend ve Helios guard'larının ikisini de geçer.
- 2x ile 2.65x arasında Blend kabul eder ama Helios 1.30 floor'u reddeder.
  → Wizard cap **200 bps doğru** kalır.
- Cross-asset (§6.3) GEREKLİ DEĞİL — same-asset düzgün çalışıyor.

### Önerilen fix yönü (UYGULAMA AYRI PROMPT)
`strategy_router::open_position` requests vec'inden `borrow_req(asset, borrow_amount)`
satırını **kaldır**; yalnız `supply_collateral_req(asset, total_collateral)` kalsın.
flash_loan'un `amount` parametresi Blend tarafında zaten d-token mint'i yapıyor
(submit.rs ADIM 1). Aynı şeyi requests vec'inde tekrarlamak çift sayıma yol
açıyor ve InvalidHf üretiyor. `flash_fee` hesabı da bu noktada gözden geçirilmeli
— Blend'in `to_d_token_up()` zaten "up"-rounding ile fee'yi içeride taşıyor;
Helios'un `borrow_amount = flash_amount + flash_fee` kullanması ek sapma
yaratıyor. close_position symmetric akışı (Repay + WithdrawCollateral) tasarımdan
ETKİLENMEZ çünkü Repay zaten "var olan d-tokens'ları sil" semantiği taşıyor; ama
PROMPT 12-FIX-VI'da onun da yeniden doğrulanması önerilir.

---

## TEŞHİS 2026-06-03 — Faucet kısıtı (USDC/wBTC/wETH otomatik mint imkansız)

**Bağlam:** PROMPT 24 faucet kapsamı — Helios'un kendi admin keypair'iyle resmî
TestnetV2 pool'unun USDC/wBTC/wETH SAC'larına `mint` denendi → `Error(Contract, #13)`
"trustline entry missing" + issuer auth. Yani Helios admin **issuer DEĞİL**.

**Canlı kanıt (2026-06-03):**
```
$ stellar contract invoke --id CAQCFVLO… -- name  → "USDC:GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56"
$ stellar contract invoke --id CAP5AMC2… -- name  → "wBTC:GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56"
$ stellar contract invoke --id CAZAQB3D… -- name  → "wETH:GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56"
$ curl horizon-testnet.stellar.org/accounts/GATALTGT…  → balances: [(XLM, 19931.42)], auth_required: false
```

Üç asset'in issuer'ı tek hesap (`GATALTGT…`). Issuer flag `auth_required=false` —
trustline serbest, AMA mint için issuer secret gerekir, biz issuer değiliz.
`blend-utils/testnet.contracts.json` (Blend resmî repo) faucet/distributor
açıklamıyor; Blend docs `tech-docs/testnet` 404; `llms-full.txt`'de "no faucet
mentioned".

**Sonuç:**
- XLM Friendbot ile fonlanır (PROMPT 24 `/api/faucet` çalışıyor).
- USDC/wBTC/wETH **otomatik faucet'i Helios'tan veremez**. UI dürüst manuel
  yönlendirme: Soroswap testnet (XLM→USDC swap), StellarTerm Testnet manuel
  transfer veya Blend Discord faucet kanalı. Çalışmayan mint butonu YAZILMADI
  (CLAUDE.md "uydurma YOK" disiplini).
- Demo akışı tek-asset (XLM) üzerinden uçtan uca canlı; AUDIT 2026-06-02 §6.1
  Path B + cap 2× ile tutarlı.

**Etki / takip:**
- Diğer asset'lerin uçtan uca demo'su (open + close + dashboard) yalnız XLM ile
  geçer. PROMPT 28+'da gerçek USDC akışını isteyenler için: (a) Helios'a özel
  mock SEP-41 contract deploy (yeni Path A — vakit/maliyet) veya (b) Soroswap
  entegrasyonu (PROMPT 27 marketplace fizibilitesiyle birlikte). Karar PROMPT
  audit kapsamında.
