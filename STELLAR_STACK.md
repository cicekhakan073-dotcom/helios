# STELLAR_STACK.md — Helios Doğrulanmış Teknoloji Yığını

> **Tek doğruluk kaynağı.** Çelişkide bu dosya kazanır: `STELLAR_STACK.md > ROADMAP.md > eğitim verisi`.
> Tüm sürümler **canlı** crates.io / registry.npmjs.org / resmi docs'tan teyit edildi.
> **Doğrulama tarihi: 2026-05-31.** Sürümler kayar — yeni oturumda kritik paketleri yeniden pinle.
> ⚠️ Sadece TESTNET. Kod unaudited. Mainnet/gerçek para yok.

---

## 1. Doğrulanmış paket sürümleri (kesin pin)

### Soroban / Rust kontratlar (crates.io)
| Paket | Pin | Kaynak | Not |
|-------|-----|--------|-----|
| `soroban-sdk` | **26.0.1** | crates.io/api/v1/crates/soroban-sdk | `#![no_std]`; testutils feature |
| `stellar-cli` (CLI) | **26.1.0** | crates.io/api/v1/crates/stellar-cli | Eski `soroban-cli` → `stellar` olarak rename. CLI komutu `stellar ...` |
| `blend-contract-sdk` | **2.25.0** | crates.io/api/v1/crates/blend-contract-sdk | Rust cross-contract + `testutils::BlendFixture` |
| OZ `stellar-tokens` | **0.7.1** | crates.io / OpenZeppelin/stellar-contracts | SEP-41 fungible/NFT |
| OZ `stellar-access` | **0.7.1** | crates.io / aynı repo | Access control, Ownable, Role |
| OZ `stellar-contract-utils` | **0.7.1** | crates.io / aynı repo | vault, pausable, upgrade utils |
| OZ `stellar-macros` | **0.7.1** | crates.io / aynı repo | Macros |

> OZ Stellar Contracts crate'leri aynı repo'dan (OpenZeppelin/stellar-contracts) ve hepsi **0.7.1** sürümünde hizalı. Vault defterini sıfırdan yazma; bunların üstüne kur.

### Frontend / TS (registry.npmjs.org)
| Paket | Pin | Kaynak | Not |
|-------|-----|--------|-----|
| `@stellar/stellar-sdk` | **15.1.0** | registry.npmjs.org/@stellar/stellar-sdk/latest | Major **15.x** (eski v12-13 değil) — RPC + tx build/sign |
| `@stellar/freighter-api` | **6.0.1** | registry.npmjs.org/@stellar/freighter-api/latest | Freighter doğrudan API (opsiyonel) |
| `@creit.tech/stellar-wallets-kit` | **2.2.0** | registry.npmjs.org/.../latest | v2.x — Freighter explicit-connect davranışı |
| `@blend-capital/blend-sdk` | **3.2.2** | registry.npmjs.org/.../latest | TS: `PoolContract`, `RequestType` |
| `next` | **16.2.6** | registry.npmjs.org/next/latest | App Router, Turbopack default |
| `ai` (Vercel AI SDK) | **6.0.193** | registry.npmjs.org/ai/latest | v6 — tool streaming default açık |
| `@ai-sdk/anthropic` | **3.0.81** | registry.npmjs.org/@ai-sdk/anthropic/latest | model `claude-sonnet-4-6` geçerli |

---

## 2. CLI komutları (birebir çalışan)

```bash
# wasm build target kurulumu (Rust >= 1.84.0 gerektirir — resmi docs)
rustup target add wasm32v1-none

# kontrat derleme (ESKİ `soroban contract build` DEĞİL)
stellar contract build
# Çıktı: target/wasm32v1-none/release/<crate>.wasm   (ESKİ wasm32-unknown-unknown DEĞİL)

# testnet kimlik + Friendbot fonlama
stellar keys generate <name> --network testnet --fund

# deploy
stellar contract deploy --wasm target/wasm32v1-none/release/<crate>.wasm --network testnet --source <name>

# invoke
stellar contract invoke --id <CONTRACT_ID> --network testnet --source <name> -- <fn> --arg value

# TS binding üretimi (frontend client'ları için)
stellar contract bindings typescript --id <CONTRACT_ID> --network testnet --output-dir ./packages/sdk/bindings/<name>
```
> Build target `wasm32v1-none` resmi Stellar docs setup sayfasından doğrulandı (2026-05-31). `stellar contract build` komut formu stellar CLI standardı; exact help çıktısı impl anında `stellar contract build --help` ile teyit edilmeli.

---

## 3. Soroban gotchas (kontrat tasarımı)
- **Tek tx = tek InvokeHostFunctionOp.** Atomik flash→deposit→borrow→repay için TÜM cross-contract çağrıları tek `strategy_router` fn'inde zincirle.
- **MEMO_NONE zorunlu**, muxed account olamaz (Soroban tx kısıtı).
- **Storage tipleri:** instance / persistent / temporary. TTL süreli → `extend_ttl` mantığını planla (özellikle pozisyon defteri persistent veride).
- **64KB kontrat boyutu limiti** → release optimizasyonu (opt-level z, lto, panic=abort).
- **Test:** `soroban-sdk` testutils → `Env::default()`, `mock_all_auths()`, `register_stellar_asset_contract_v2`.

---

## 4. Health Factor / Likidasyon (Blend'den OKU)
- Blend zaten **Reflector oracle** + kendi LTV/likidasyon parametrelerini kullanır. HF'yi uydurma; Blend pool parametrelerinden + kullanıcı pozisyonundan oku.
- Oran kullanılacaksa `(collateral_value * liq_factor) / debt_value` ama girdiler Blend + Reflector'dan gelir.
- Reflector `decimals()` kontrattan OKUNUR, sabit varsayılmaz.

---

## 5. Contract adresleri (testnet) — # DOĞRULA: testnet reset'te rotasyon olabilir

> ⚠️ Stellar testnet periyodik reset olur; bu adresler reset sonrası değişebilir. **Deploy anında yeniden doğrula.**

### Reflector V3 (SEP-40) — kaynak: developers.stellar.org/docs/data/oracles/oracle-providers (2026-05-31)
**TESTNET:**
- Stellar DEX Feed: `CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP`
- External CEX & DEX Feed: `CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63`
- Fiat Exchange Rates: `CCSSOHTBL3LEWUCBBEB5NJFC2OKFRC74OWEIJIZLRJBGAAU4VMU5NV4W`

**MAINNET (kullanma, sadece referans):**
- Stellar DEX: `CALI2BYU2JE6WVRUFYTS6MSBNEHGJ35P4AVCZYF3B6QOE3QKOB2PLE6M`
- External CEX & DEX: `CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN`
- Fiat: `CBKGPWGKSKZF52CFHMTRR23TBWTPMRDIYZ4O2P5VS65BMHYH4DXMCJZC`

### Blend v2 — kaynak: github.com/blend-capital/blend-utils/testnet.contracts.json (2026-05-31)
**TESTNET:** (kendin deploy ETME, bunları kullan)
- backstop (V2): `CBDVWXT433PRVTUNM56C3JREF3HIZHRBA64NB2C3B2UNCKIS65ZYCLZA`
- poolFactory (V2): `CDV6RX4CGPCOKGTBFS52V3LMWQGZN3LCQTXF5RVPOOCG4XVMHXQ4NTF6`
- emitter: `CC3WJVJINN4E3LPMNTWKK7LQZLYDQMZHZA7EZGXATPHHBPKNZRIO3KZ6`
- örnek V2 pool (TestnetV2): `CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF`

> Helios kendi `flash_lender`, `vault`, `strategy_router`, `keeper` kontrat ID'lerini deploy script üretir → `.env` / `addresses.json`.

---

## 6. Next.js 16 — DOĞRULANMIŞ DÜZELTMELER (kaynak: nextjs.org/blog/next-16)
- **`experimental.ppr` flag KALDIRILDI** (+ `export const experimental_ppr` route-level export kaldırıldı).
- **Cache Components** ile değiştirildi: `"use cache"` direktifi + `next.config.ts` içinde **top-level `cacheComponents: true`**.
  ⚠️ **`experimental.cacheComponents` DEĞİL** — stable sürümde top-level. (`experimental.dynamicIO` → `cacheComponents` olarak rename edildi.)
- **Turbopack default** bundler (webpack için `next dev --webpack`).
- **`params` ve `searchParams` artık Promise** → `await` et. `cookies()/headers()/draftMode()` de async.
- **React 19.2**: View Transitions, `useEffectEvent`, `<Activity/>`. React Compiler stable (opt-in `reactCompiler: true`).
- `middleware.ts` → **`proxy.ts`** olarak rename (deprecated ama Edge için durur).
- Min: Node.js **20.9+**, TypeScript **5.1+**.

## 7. Vercel AI SDK v6 (kaynak: ai-sdk.dev/providers/.../anthropic)
- `import { anthropic } from '@ai-sdk/anthropic'`; `anthropic('claude-sonnet-4-6')` **geçerli**.
- Desteklenen model ID örnekleri: `claude-opus-4-8`, `claude-sonnet-4-6`, `claude-haiku-4-5`, ... (string ID de geçer).
- **Tool call streaming default AÇIK**; kapatmak için provider option `toolStreaming: false`.
- `streamText` + `useChat` + `UIMessage` tipleri.

## 8. SEP referansları (tek satır)
- **SEP-10**: Web auth — challenge transaction → cüzdan imzası → backend doğrular → JWT.
- **SEP-40**: Price Feed Oracle arayüzü — Reflector bunu uygular (`lastprice`, `decimals`, `assets` vb.).
- **SEP-41**: Token (fungible) standart arayüzü — OZ `stellar-tokens` uygular.

---

## 9. # DOĞRULANMADI / BİLMİYORUM (canlı teyit edilemeyenler — impl anında doğrula)
- **`blend-contract-sdk` Rust API imzaları** (`pool::Client`, `RequestType`, `default_reserve_config`): paketin VARLIĞI ve sürümü (2.25.0) doğrulandı; fn imzaları kaynak koddan OKUNMADI → impl anında repo/docs'tan teyit et. # DOĞRULANMADI (imzalar)
- **`@blend-capital/blend-sdk` TS API** (`PoolContract`, `RequestType`): sürüm (3.2.2) doğrulandı; exact API imzaları OKUNMADI. # DOĞRULANMADI (imzalar)
- **Reflector SEP-40 exact fn imzaları**: SEP-40 standardı ve testnet adresleri doğrulandı; her fn'in tam imzası kontrattan OKUNMADI → `script3/sep-40-oracle` repo'sundan veya kontrat introspection ile teyit et. # DOĞRULANMADI (imzalar)
- **Testnet contract adresleri**: 2026-05-31'de doğru; testnet reset'te değişebilir → deploy anında yeniden çek. # DOĞRULA
- **`stellar contract build` exact alt-komut/flag'ları**: komut formu standart; tam help çıktısı OKUNMADI → `stellar contract build --help`. 
- **OpenZeppelin stellar-contracts vault util'inin exact public API'si**: crate (0.7.1) doğrulandı; modül API imzaları OKUNMADI → docs.openzeppelin.com/stellar-contracts. # DOĞRULANMADI (imzalar)
