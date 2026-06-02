# HELIOS — Prompt Yol Haritası

> **Helios**, Stellar/Soroban üzerinde çalışan, AI destekli, çoklu varlık, kaldıraçlı verim (leveraged yield) platformudur. Çekirdeği tek işlemde (atomik tek-tx) gerçekleşen **flash loan + Blend lending döngüsüdür**: `flash borrow → collateral yatır → borç al → flash geri öde`. Bu çekirdeğin üzerine 7 katman bindirilir: AI Strategy Copilot, Risk Radar, Auto-Rebalancer (Keeper), Multi-Asset Vaults, Monte Carlo Simulator, Social Leaderboard ve PWA + Web Push. Bu doküman, projeyi sıfırdan Vercel production deploy'a kadar götüren **kronolojik, bağımlılık-sıralı 34 atomik prompttan** oluşur. Her prompt, sonraki bir oturumda Claude Code'a tek başına yapıştırılabilecek şekilde bağlam-dolu yazılmıştır.

> ⚠️ **Tüm proje sadece TESTNET içindir. Kod denetlenmemiştir (unaudited). Mainnet/gerçek para iması yoktur.** Tüm UI ve dokümanlarda "unaudited, testnet demo" ibaresi açıkça yer alır. AI Copilot "yatırım tavsiyesi değildir" çerçevesinde kalır.

> 🛡️ **AUDIT 2026-05-31 — ZORUNLU OKU.** Her PROMPT'u uygulamadan önce dosyanın sonundaki **"AUDIT 2026-05-31 — Canlı Doğrulama, Mimari Sadeleştirme & Çözülmüş Kararlar"** bölümünü oku. Aşağıdaki PROMPT metinleri orijinal hâliyle korundu ama **AUDIT bağlayıcıdır** (özellikle: Blend'in flash_loan'ını kullanırız, **kendi `flash_lender` kontratımız YOK** — PROMPT 8 yeniden yorumlandı; "Vercel KV" → Upstash Marketplace; `middleware.ts` → `proxy.ts`; OZ vault `stellar-tokens/vault` altında; SEP-40 imzaları net). Çelişkide: **AUDIT > orijinal PROMPT > STELLAR_STACK.md > eğitim verisi**.

---

## ORTAK ÖN-KOŞUL (tüm promptlar için geçerli)

Bu yol haritasındaki HER promptu çalıştırmadan önce şu 2 dosyayı OKU:
1. ./CLAUDE.md         → çalışma ilkeleri (empirik, uydurma yok, testnet-only, yıkıcı işlem yok)
2. ./STELLAR_STACK.md  → doğrulanmış teknoloji yığını = TEK DOĞRULUK KAYNAĞI

Çelişki çıkarsa: STELLAR_STACK.md > eğitim verin/hafızan. Her sürüm/API/contract
adresini kullanmadan ÖNCE canlı doğrula + pinle. İş bitince build/test çalıştır,
çıktıyı KENDİN oku, hatayı gizleme.

---

## Faz Haritası

| Faz | Başlık | Prompt Aralığı | Çıktı |
|-----|--------|----------------|-------|
| **0** | Vizyon & Tasarım Sistemi | PROMPT 1–3 | `VISION.md`, `design-system.md`, `globals.css` token bloğu |
| **1** | Repo & Tooling | PROMPT 4–6 | Turborepo monorepo, TS strict + lint + test, `packages/ui` primitifleri |
| **2** | Soroban Kontratları | PROMPT 7–15 | `flash_lender`, `vault`, `strategy_router`, `keeper` + Reflector & Blend entegrasyonu + testnet deploy |
| **3** | Wallet & Auth & Core SDK | PROMPT 16–19 | Wallets Kit connect, SEP-10 auth, `packages/sdk` hook'lar, typed error yönetimi |
| **4** | Ana Akışlar | PROMPT 20–24 | Landing, Open Position wizard, Dashboard, Faucet |
| **5** | Hackathon Silahları | PROMPT 25–30 | AI Copilot, Risk Radar, Simulator, Keeper cron, Leaderboard |
| **6** | Cila & Deploy | PROMPT 31–34 | PWA + Web Push, microinteractions, a11y/Lighthouse, Vercel deploy |

**Doğrulanmış teknoloji yığını (2026-05-31'de canlı teyit — tek doğruluk kaynağı: [STELLAR_STACK.md](./STELLAR_STACK.md)):** Stellar CLI `stellar contract build` (**stellar-cli 26.1.0**), build target `wasm32v1-none` (Rust ≥1.84.0), **soroban-sdk 26.0.1**, OpenZeppelin Stellar Contracts `stellar-tokens`/`stellar-access`/`stellar-contract-utils`/`stellar-macros` (hepsi **0.7.1**), **blend-contract-sdk 2.25.0** + **@blend-capital/blend-sdk 3.2.2**, Reflector V3 (SEP-40, testnet adresleri STELLAR_STACK.md §5'te), **@creit.tech/stellar-wallets-kit 2.2.0** (Freighter explicit-connect), **@stellar/stellar-sdk 15.1.0** (major 15.x), SEP-10 auth, **Next.js 16.2.6** (App Router, Turbopack default, **Cache Components — top-level `cacheComponents: true`, `experimental.ppr` KALDIRILDI**, params/searchParams = Promise), React 19.2, Vercel AI SDK **ai 6.0.193** + **@ai-sdk/anthropic 3.0.81** (`anthropic('claude-sonnet-4-6')`, tool streaming default), shadcn/ui + Tailwind v4 + Framer Motion, Zustand + TanStack Query, Recharts + visx, Vercel deploy.

**Her implementasyon promptunun ilk adımı:** kuruluma başlamadan önce ilgili paketin sürümünü **[STELLAR_STACK.md](./STELLAR_STACK.md) ile karşılaştır + crates.io / npm'den teyit edip pinle** (sürümler kayar). Her implementasyon promptunun SON adımı: ilgili **build + test komutunu çalıştır ve çıktıyı bizzat oku** (yeşil mi, hata var mı — gizleme). Bilinmeyen contract adresi/parametre için `# DOĞRULA` notlu placeholder bırak; uydurma yok. Çelişkide `STELLAR_STACK.md > ROADMAP.md > eğitim verisi`.

---

## FAZ 0 — Vizyon & Tasarım Sistemi

```text
### PROMPT 1 — Ürün vizyonu, jüri kriterleri ve 90 saniyelik demo senaryosu
Faz: 0   |   Bağımlılık: yok

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Helios'un ne olduğunu, neyi kanıtlayacağını ve jüriye nasıl gösterileceğini netleştiren tek bir VISION.md üret.

BAĞLAM: Repo henüz boş (yalnızca bu ROADMAP.md var). Helios; Stellar/Soroban üzerinde AI destekli, çoklu varlık, kaldıraçlı verim platformu. Çekirdek değer önerisi: tek atomik işlemde flash loan + Blend lending döngüsü (flash borrow → collateral → borrow → flash repay) ile kaldıraçlı pozisyon. Bu bir hackathon/demo projesidir; SADECE testnet, kod denetlenmemiş. Henüz hiçbir teknik karar koda dökülmedi; bu prompt sadece dokümandır, kod yazma.

YAPILACAKLAR:
- Repo kökünde VISION.md oluştur.
- 1 paragraf "elevator pitch" yaz: Helios kimin hangi problemini çözüyor (Stellar DeFi'de kaldıraçlı verim erişimini tek tıkla, AI rehberliğiyle ve risk şeffaflığıyla sunmak).
- "Çekirdek mekanik" bölümü: atomik tek-tx flash-loan döngüsünü 4 adımda anlat; neden tek tx (Soroban'da tx başına tek InvokeHostFunctionOp; tüm cross-contract çağrıları tek router kontratında zincirlenir) notunu ekle.
- "7 Katman" bölümü: AI Strategy Copilot, Risk Radar, Auto-Rebalancer (Keeper), Multi-Asset Vaults (USDC, XLM, wBTC, wETH), Monte Carlo Simulator, Social Leaderboard, PWA + Web Push — her biri için 1-2 cümle değer açıklaması.
- "Jüri kriterleri haritası" tablosu: tipik hackathon kriterleri (Teknik derinlik, İnovasyon, UX/Tasarım, Tamamlanmışlık, Sunum) → her kriter için Helios'un hangi özelliğinin onu karşıladığı.
- "90 saniyelik demo senaryosu": saniye-saniye akış (0-10s landing & hook, 10-30s wallet connect + faucet, 30-55s Open Position wizard ile leverage slider + canlı HF, 55-75s tek tx imzala → Dashboard'da pozisyon + Risk Radar, 75-90s AI Copilot + Leaderboard kapanış).
- "Dürüstlük ve güvenlik ilkeleri" bölümü: testnet-only, unaudited, flash-loan/kaldıraç risk uyarısı, AI "yatırım tavsiyesi değildir".

KABUL KRİTERLERİ (Done-when):
- VISION.md kökte mevcut ve yukarıdaki tüm bölümleri içeriyor.
- 90sn demo senaryosu zaman damgalı ve her sahnede hangi ekranın/özelliğin gösterileceği açık.
- Jüri kriterleri tablosu en az 5 kriter × Helios eşleşmesi içeriyor.
- "testnet-only / unaudited" ibaresi belgede açıkça geçiyor.

DOĞRULAMA:
- `cat VISION.md` ile tüm bölümlerin var olduğunu göster; demo senaryosunun 90 saniyeye sığdığını (sahne süreleri toplamı) doğrula.
```

```text
### PROMPT 2 — "Stellar Cosmic" tasarım sistemi spesifikasyonu
Faz: 0   |   Bağımlılık: Prompt 1'in çıktısı (VISION.md vizyonu)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Helios'un görsel dilini tanımlayan design-system.md'yi üret (renk, tipografi, spacing, elevation, motion, bileşen anatomisi) — henüz CSS yazmadan, kaynak gerçeği olarak.

BAĞLAM: VISION.md var. Helios "cosmic / aurora" estetiğinde, koyu uzay temalı, premium DeFi dashboard hissi verecek. Bu prompt sadece tasarım dokümanıdır; globals.css'i bir sonraki prompt üretecek. Tema isimleri ve token adları burada kesinleşmeli ki kod onları referans alsın.

YAPILACAKLAR:
- Repo kökünde design-system.md oluştur.
- Renk paleti: koyu uzay arka planları (örn. --space-900..--space-700), aurora aksan renkleri (mor/teal/amber gradyan), semantik renkler (success/warn/danger — özellikle Health Factor durumları için: healthy/caution/danger eşik renkleri), metin renkleri (yüksek/orta/düşük kontrast). Her token için isim + HSL/HEX değeri + kullanım amacı.
- Tipografi: başlık ve gövde için font ailesi önerisi (örn. Geist / Inter benzeri sistem fontları, monospace sayı/finansal değerler için), tip ölçeği (display, h1-h4, body, caption), tabular-nums kuralı (finansal rakamlarda).
- Spacing & radius ölçeği (4px tabanlı), elevation/shadow seviyeleri, glassmorphism (GlassPanel) tanımı (blur + border + bg alpha).
- Motion dili: Framer Motion için süre/eğri token'ları (giriş, hover, sayfa geçişi), "aurora background" animasyon konsepti.
- Bileşen anatomisi (sözel): Button (varyantlar: primary/ghost/danger), Card, GlassPanel, AuroraBackground, StatTile, HealthFactorBadge, RiskGauge — her biri için hangi token'ları kullandığı.
- Erişilebilirlik notu: kontrast oranı hedefleri (WCAG AA), HF renklerinin renk-körü güvenliği (sadece renge bağlı kalmama, ikon/etiket ekleme).

KABUL KRİTERLERİ (Done-when):
- design-system.md tüm token kategorilerini isimlendirilmiş değerlerle içeriyor.
- HF durum renkleri (healthy/caution/danger) ve eşik mantığı tanımlı.
- En az 7 UI primitifinin token bağımlılığı listelenmiş.

DOĞRULAMA:
- `cat design-system.md` ile token tablolarının dolu olduğunu göster; renk değerlerinin geçerli HEX/HSL formatında olduğunu doğrula.
```

```text
### PROMPT 3 — globals.css CSS değişken bloğu + token export
Faz: 0   |   Bağımlılık: Prompt 2'nin çıktısı (design-system.md token isimleri)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: design-system.md'deki tüm token'ları makinece kullanılabilir tek bir kaynağa dök: Tailwind v4 uyumlu globals.css @theme bloğu + (gerekiyorsa) JSON/TS token export taslağı.

BAĞLAM: design-system.md kesin token isimleri ve değerleri içeriyor. Henüz monorepo kurulmadı (Prompt 4 kuracak), bu yüzden dosyaları repo kökünde tasarim/ klasöründe stage et; Prompt 6'da apps/web içine taşınacak. Tailwind v4 @theme / CSS-first yapılandırma kullan (tailwind.config.js zorunlu değil). Bu prompt asıl CSS değişkenlerini yazar.

YAPILACAKLAR:
- crates/npm doğrulaması GEREKMEZ (saf CSS), ancak Tailwind v4'ün CSS-first @theme sözdizimini kullandığını teyit et.
- tasarim/globals.css oluştur: :root içinde tüm renk/spacing/radius/shadow/typography/motion token'larını CSS custom property olarak yaz (design-system.md ile birebir aynı isimler).
- Tailwind v4 @theme inline bloğu ekle: CSS değişkenlerini Tailwind utility'lerine bağla (örn. --color-space-900, --color-aurora-mauve, --font-mono).
- Dark-first yaklaşımı: tema varsayılan koyu; ileride açık tema için yapı bırak (ama uygulama).
- @keyframes aurora ve temel motion keyframe'lerini ekle.
- tasarim/tokens.ts oluştur (opsiyonel ama önerilir): TS tarafından erişim için token sabitlerini export et (özellikle HF eşik renkleri ve grafik renkleri için — Recharts/visx CSS değişkeni okuyamadığında JS değeri gerekir).
- tasarim/README.md: bu dosyaların Prompt 6'da apps/web/app/globals.css ve packages/ui'ye nasıl taşınacağına dair not.

KABUL KRİTERLERİ (Done-when):
- globals.css tüm design-system.md token'larını custom property olarak içeriyor (eksik token yok).
- @theme bloğu Tailwind v4 sözdizimine uygun.
- tokens.ts en az HF eşik renklerini ve grafik renk paletini export ediyor.

DOĞRULAMA:
- design-system.md'deki token listesi ile globals.css'teki :root değişkenlerini karşılaştır; birebir eşleştiğini göster (eksik/fazla token raporla).
```

---

## FAZ 1 — Repo & Tooling

```text
### PROMPT 4 — pnpm + Turborepo monorepo iskeleti
Faz: 1   |   Bağımlılık: Prompt 1-3 (dokümanlar ve token dosyaları kökte/tasarim/ içinde)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Helios'un tüm kodunu barındıracak pnpm + Turborepo monorepo iskeletini kur: apps/web, packages/contracts, packages/sdk, packages/ui workspace'leri ayağa kalksın.

BAĞLAM: Repo kökünde VISION.md, design-system.md, tasarim/ var. Henüz package.json yok. pnpm workspace + Turborepo kullan. apps/web Next.js 16 App Router olacak (bu promptta sadece iskelet + boş sayfa; tam kurulum Prompt 6 ve 20'de). packages/contracts Rust/Soroban için (Cargo workspace ileride Prompt 7'de). Node ve pnpm sürümlerini pinle.

YAPILACAKLAR:
- Başlamadan: pnpm, turbo ve Next.js'in güncel major'larını npm'den doğrula ve pinle (Next.js 16.2.x hedefi). Node sürümünü .nvmrc / package.json engines ile sabitle.
- Kök package.json: "private": true, packageManager alanıyla pnpm pinli, workspaces script'leri (turbo ile dev/build/lint/test).
- pnpm-workspace.yaml: apps/*, packages/* tanımı.
- turbo.json: build/dev/lint/test/typecheck pipeline'ları, cache çıktı tanımları.
- apps/web: Next.js 16 App Router minimal iskelet (app/layout.tsx, app/page.tsx — "Helios" placeholder), Turbopack default, TS.
- packages/ui: boş paket (package.json + src/index.ts), apps/web tarafından tüketilebilir export yapısı.
- packages/sdk: boş paket (package.json + src/index.ts).
- packages/contracts: README + dizin (Rust workspace Prompt 7'de gelecek), şimdilik placeholder.
- .gitignore: node_modules, .next, target/, .env*, .turbo, dist.
- Kök README.md: monorepo yapısı + "testnet-only, unaudited demo" ibaresi.

KABUL KRİTERLERİ (Done-when):
- pnpm install temiz çalışıyor, tüm workspace'ler tanınıyor.
- pnpm turbo build apps/web'i hatasız derliyor (placeholder sayfa).
- packages/ui ve packages/sdk apps/web'den import edilebiliyor (örnek bir export test edilebilir).

DOĞRULAMA:
- `pnpm install` ve `pnpm turbo run build --filter=web` temiz çıktı; `pnpm -r list` ile 4 workspace'in listelendiğini göster.
```

```text
### PROMPT 5 — TS strict + ESLint + Prettier + Vitest yapılandırması
Faz: 1   |   Bağımlılık: Prompt 4 (monorepo iskeleti)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Tüm workspace'lerde paylaşılan, sıkı (strict) TypeScript + ESLint + Prettier + Vitest yapılandırmasını kur; lint/typecheck/test komutları turbo üzerinden çalışsın.

BAĞLAM: Prompt 4'ten monorepo (apps/web, packages/ui, packages/sdk, packages/contracts) hazır. Henüz lint/test altyapısı yok. Paylaşılan config'ler packages/ içinde (örn. packages/config-ts, packages/config-eslint) ya da kökte base config olarak yaşamalı, workspace'ler extend etmeli. Vitest frontend/SDK testleri için (Rust testleri ayrı, Cargo ile).

YAPILACAKLAR:
- Güncel sürüm doğrulaması: typescript, eslint (flat config), prettier, vitest, @vitejs/plugin-react güncel majorlarını npm'den doğrula ve pinle.
- Paylaşılan tsconfig.base.json: strict: true, noUncheckedIndexedAccess, exactOptionalPropertyTypes, moduleResolution "bundler", target/lib modern. Her workspace bunu extend etsin.
- ESLint flat config (eslint.config.js): TS + React + import sıralama + unused kuralları; Next.js için apps/web'e uygun override.
- Prettier config + .prettierignore; tutarlı format.
- Vitest base config (packages/ui ve packages/sdk için): jsdom/happy-dom ortamı, coverage opsiyonu, örnek bir smoke test (1+1) ekle.
- Kök package.json script'leri: lint, format, typecheck, test → turbo pipeline'a bağla; turbo.json'a typecheck task'ı ekle.
- Husky + lint-staged (opsiyonel ama önerilir): commit öncesi format+lint.

KABUL KRİTERLERİ (Done-when):
- pnpm turbo run lint, typecheck, test üçü de temiz geçiyor.
- tsconfig strict ayarları aktif ve en az bir workspace'te tip hatası yakalandığını gösteren örnek mevcut (sonra düzeltilir).
- Örnek Vitest smoke test yeşil.

DOĞRULAMA:
- `pnpm turbo run lint typecheck test` çıktısı tümü PASS; `npx tsc --noEmit` temiz; bir kasıtlı tip hatası ekleyip typecheck'in kırmızı olduğunu, sonra geri alıp yeşil olduğunu göster.
```

```text
### PROMPT 6 — Tasarım token'larını koda bağlama + packages/ui primitifleri
Faz: 1   |   Bağımlılık: Prompt 3 (token dosyaları), Prompt 4-5 (monorepo + lint/test)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: tasarim/ altındaki token'ları apps/web ve packages/ui içine kalıcı olarak entegre et; shadcn/ui + Tailwind v4 ile temel UI primitiflerini (Button, Card, GlassPanel, AuroraBackground, StatTile, HealthFactorBadge) üret ve Storybook-vari bir demo sayfada göster.

BAĞLAM: tasarim/globals.css ve tokens.ts hazır. apps/web Next.js 16 iskeleti var. packages/ui boş. shadcn/ui'yi Tailwind v4 ile kuracağız (CSS-first @theme). Framer Motion AuroraBackground ve microinteraction'lar için. Bu prompt görsel temeli atar; gerçek sayfalar Faz 4'te gelir.

YAPILACAKLAR:
- Güncel sürüm doğrulaması: tailwindcss v4, @tailwindcss/postcss, shadcn/ui CLI, framer-motion, class-variance-authority, tailwind-merge, lucide-react güncel sürümlerini npm'den doğrula ve pinle.
- tasarim/globals.css → apps/web/app/globals.css'e taşı; @theme bloğunu Tailwind v4 ile bağla; tasarim/tokens.ts → packages/ui/src/tokens.ts.
- shadcn/ui'yi apps/web'e başlat (components.json), ama paylaşılan primitifleri packages/ui altında topla.
- packages/ui primitifleri (cva + tokens kullanarak): Button (primary/ghost/danger), Card, GlassPanel (glassmorphism), AuroraBackground (Framer Motion animasyonlu), StatTile (tabular-nums sayı), HealthFactorBadge (healthy/caution/danger renk + ikon + etiket, renk-körü güvenli), RiskGauge iskeleti.
- packages/ui/src/index.ts'ten hepsini export et.
- apps/web/app/_kitchen-sink/page.tsx (sadece dev): tüm primitifleri varyantlarıyla render eden bir demo sayfa (görsel doğrulama için).
- Erişilebilirlik: focus-visible ring, aria etiketleri, kontrast.

KABUL KRİTERLERİ (Done-when):
- apps/web koyu "cosmic" temayla render oluyor; token'lar uygulanıyor.
- En az 6 UI primitifi packages/ui'den export edilip _kitchen-sink sayfasında görünüyor.
- HealthFactorBadge üç durumu da (renk + ikon + metin) doğru gösteriyor.
- Lint/typecheck temiz.

DOĞRULAMA:
- `pnpm --filter web dev` ile /_kitchen-sink açılıp tüm primitiflerin render olduğunu göster (ekran görüntüsü/dom çıktısı); `pnpm turbo run lint typecheck` temiz.
```

---

## FAZ 2 — Soroban Kontratları

```text
### PROMPT 7 — Rust/Soroban workspace + ortak tipler, hatalar ve OZ kurulumu
Faz: 2   |   Bağımlılık: Prompt 4 (packages/contracts dizini)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: packages/contracts altında Soroban Cargo workspace'ini kur; soroban-sdk 26.x + OpenZeppelin Stellar Contracts bağımlılıklarını pinle; tüm kontratların paylaşacağı ortak tipler, typed error'lar ve event şemalarını içeren bir shared crate üret.

BAĞLAM: packages/contracts şu an placeholder. Build CLI: stellar CLI (stellar contract build, soroban DEĞİL). Build target wasm32v1-none. #![no_std] zorunlu. OZ primitifleri: stellar-tokens (SEP-41), stellar-access (access control), stellar-contract-utils (vault/pausable/upgrade), stellar-macros. Tekerleği yeniden icat etme. Bu prompt henüz iş mantığı yazmaz; iskelet + paylaşılan tipleri kurar.

YAPILACAKLAR:
- Güncel sürüm doğrulaması: crates.io'dan soroban-sdk tam minor'ını (26.x), stellar-tokens / stellar-access / stellar-contract-utils / stellar-macros tam sürümlerini doğrula ve Cargo.toml'a pinle. Stellar CLI sürümünü (stellar --version) ve wasm32v1-none target'ının kurulu olduğunu doğrula (rustup target add wasm32v1-none).
- packages/contracts/Cargo.toml: workspace tanımı (members: shared, flash_lender, vault, strategy_router, keeper), [profile.release] wasm optimizasyonları (opt-level z, lto, panic abort, overflow-checks on).
- packages/contracts/crates/shared: no_std crate. İçinde: ortak Address/asset tipleri, AssetId enum (USDC/XLM/wBTC/wETH), pozisyon/strateji veri yapıları (storage'a uygun), tüm kontratlar için ortak HeliosError #[contracterror] enum (typed, numaralı), event isim sabitleri.
- Storage TTL stratejisi notu: persistent vs instance veri, extend_ttl yardımcıları için bir modül iskeleti (gerçek extend mantığı ilgili kontratlarda).
- rust-toolchain.toml ile toolchain pinle.
- packages/contracts/README.md: build/test komutları (stellar contract build, cargo test), target açıklaması.

KABUL KRİTERLERİ (Done-when):
- cargo build --workspace ve stellar contract build (her member için) hatasız.
- shared crate no_std derleniyor; HeliosError ve AssetId tipleri diğer crate'lerden import edilebiliyor.
- Sürümler Cargo.toml'da pinli (caret değil, kesin) ve crates.io ile doğrulanmış.

DOĞRULAMA:
- `cargo build --workspace` temiz; `stellar contract build` çıktısının target/wasm32v1-none/release/ altında .wasm ürettiğini göster; `cargo tree` ile OZ ve soroban-sdk pinli sürümlerini listele.
```

```text
### PROMPT 8 — flash_lender kontratı + unit testler
Faz: 2   |   Bağımlılık: Prompt 7 (workspace + shared crate)

> 🛡️ **AUDIT 2026-05-31 OVERRIDE — bu PROMPT OBSOLETE.**
> Blend v2 pool kontratı **kendi `flash_loan(from, FlashLoan, requests)` fn'ini** sağlıyor (verified: github.com/blend-capital/blend-contracts-v2/pool/src/contract.rs). Helios **ayrı flash_lender YAZMAZ.** Bunun yerine:
> - PROMPT 8'i ATLAYABİLİRSİN, ya da
> - PROMPT 8'i "Blend `flash_loan` mimarisi anlama + integration test iskelet" olarak yeniden yorumla (BlendFixture ile mock fixture + flash_loan akışı testi).
> Tek-tx flash + Supply/Borrow zinciri tamamen Blend pool tarafında. strategy_router (PROMPT 12) sadece Request vec'i kurar. Detay: AUDIT §1.1, §1.2.

> ✅ **STATUS 2026-06-01 — SKIPPED.** Kullanıcı kararı: atla, doğal yerinde yakala. Tip aynası (`shared::blend`) PROMPT 11 başında üretilecek; integration test scaffold PROMPT 12'de strategy_router happy-path testi yazılırken doğacak. Detay: memory `helios-resolved-decisions` → "PROMPT 8 & 9 atlandı".

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Tek-tx içinde çağrılıp aynı tx'te geri ödenmesi gereken bir flash loan sağlayan flash_lender kontratını yaz, storage layout + public fn'ler + events + typed error + testleriyle.

BAĞLAM: shared crate (HeliosError, AssetId) hazır. Soroban'da flash loan, atomik tek tx içinde "borç ver → callback → geri ödendiğini doğrula" şeklinde modellenir; strategy_router (Prompt 12) bu kontratı çağırıp callback'te collateral/borrow yapacak. Bu kontrat bağımsız test edilebilir olmalı (router olmadan, mock borrower ile). SEP-41 token transferleri için OZ stellar-tokens client'ı kullan.

YAPILACAKLAR:
- Güncel sürüm doğrulaması: soroban-sdk ve OZ crate sürümlerinin Prompt 7 ile aynı pinde olduğunu teyit et.
- flash_lender kontratı: havuz başlatma (admin, desteklenen asset listesi, flash fee bps), likidite yatır/çek (testnet için basit), flash_loan(asset, amount, receiver, payload) fn'i: tokeni receiver'a gönder → receiver'ın exec_op callback'ini çağır → tx sonunda principal + fee geri gelmiş mi doğrula, gelmediyse panic/error ile tx'i geri al.
- Storage layout: instance (admin, fee bps, asset config), persistent (havuz bakiyeleri); TTL extend yardımcıları.
- Events: flash_loan_initiated, flash_loan_repaid.
- Typed errors: InsufficientLiquidity, RepaymentShortfall, UnsupportedAsset, Unauthorized.
- Reentrancy/atomiklik koruması: callback sırasında durum tutarlılığı.
- Testler (soroban-sdk testutils): Env::default(), mock_all_auths(), register_stellar_asset_contract_v2 ile sahte token; mutlu yol (geri ödeme başarılı), eksik geri ödeme (revert), yetersiz likidite, desteklenmeyen asset; fee hesabının doğruluğu.

KABUL KRİTERLERİ (Done-when):
- cargo test flash_lender tümü yeşil; en az 5 test senaryosu.
- Geri ödenmeyen flash loan tx'i revert ediyor (test ile kanıtlı).
- stellar contract build .wasm üretiyor.

DOĞRULAMA:
- `cargo test -p flash_lender` yeşil çıktısı; revert testinin gerçekten panic/error ürettiğini göster; `stellar contract build` ile wasm çıktısı.
```

```text
### PROMPT 9 — vault kontratı (OZ utils üstüne) + unit testler
Faz: 2   |   Bağımlılık: Prompt 7 (shared), opsiyonel Prompt 8 paterni

> 🛡️ **AUDIT 2026-05-31 OVERRIDE — bu PROMPT OBSOLETE.**
> Blend v2 pool `get_positions(user) → Positions` ile collateral + debt'i **zaten tutuyor** (verified: AUDIT §1.1). Helios ayrı `vault` kontratı **YAZMAZ.** Helios'a özel pozisyon meta'sı (entry_price, leverage, opt-in işareti) **off-chain Neon DB**'de tutulur (PROMPT 30). Detay: AUDIT §1.1, §1.3, §1.4.

> ✅ **STATUS 2026-06-01 — SKIPPED.** Kullanıcı kararı: atla, doğal akışta yakala. Dağılım:
> - **Position tip aynası** (TS) → PROMPT 18 (`packages/sdk/src/types/position.ts`)
> - **Neon schema** (`helios_positions` tablosu) → PROMPT 30 (Drizzle)
> - **`record_position` / `close_position`** akışı → PROMPT 22 (tx success Server Action → Neon insert)
> - **`get_position` read** → PROMPT 23 (Dashboard sorgu)
> - **Pausable + access control** (OZ stellar-access) → PROMPT 12 (strategy_router) + PROMPT 14 (keeper)
> - **TTL extend** → PROMPT 14 (keeper opt-in defteri için)
> - **Deposit/withdraw collateral** → YOK (Blend Supply/WithdrawCollateral Request'leri PROMPT 12'de)
> Memory: `helios-resolved-decisions` → "PROMPT 8 & 9 atlandı".

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Kullanıcıların kaldıraçlı pozisyon teminatını/paylarını tuttuğu multi-asset vault kontratını OZ vault/utils primitifleri üzerine kur; defteri sıfırdan yazma.

BAĞLAM: Multi-Asset Vaults katmanı için USDC, XLM, wBTC, wETH ayrı havuzlar (ya da asset-parametrik tek kontrat + havuz başına state). OZ stellar-contract-utils vault primitifi ve stellar-tokens (SEP-41) kullan. stellar-access ile admin/pausable. Pozisyon defteri burada tutulur; strategy_router (Prompt 12) pozisyon açılış/kapanışta bu kontratı günceller. Vault, Blend'e yatırılan collateral ve alınan debt'in kullanıcı-bazlı muhasebesini tutar.

YAPILACAKLAR:
- Güncel sürüm doğrulaması: OZ stellar-contract-utils ve stellar-tokens vault/SEP-41 API'lerinin bu sürümdeki imzalarını teyit et (API kaymış olabilir — DOĞRULA).
- vault kontratı: asset-parametrik (AssetId ile), share/accounting OZ vault util üstüne; deposit_collateral, withdraw_collateral, record_position (kullanıcı, collateral_asset, collateral_amount, debt_asset, debt_amount, leverage, entry_price), close_position, get_position(user).
- Access control: admin (OZ stellar-access), pausable (acil durdurma), upgrade hook (OZ upgrade util) — testnet demo için.
- Storage: persistent pozisyon defteri (user → Position), TTL extend (pozisyonlar uzun ömürlü olmalı — extend_ttl mantığı kritik).
- Events: collateral_deposited, position_opened, position_closed, collateral_withdrawn.
- Typed errors: PositionNotFound, PositionAlreadyOpen, Paused, Unauthorized, InsufficientCollateral.
- Testler: deposit/withdraw, position kayıt/kapanış, pausable davranışı, yetki kontrolleri, TTL extend çağrısının state'i koruduğu.

KABUL KRİTERLERİ (Done-when):
- cargo test -p vault yeşil; en az 6 senaryo.
- Defter OZ vault primitifi üzerine kurulu (sıfırdan accounting YOK), kod yorumlarında hangi OZ util'in kullanıldığı belli.
- Pausable ve access control çalışıyor (test ile).

DOĞRULAMA:
- `cargo test -p vault` yeşil; get_position'ın açılıştan sonra doğru veri döndürdüğünü ve close sonrası temizlendiğini test çıktısıyla göster.
```

```text
### PROMPT 10 — Reflector V3 (SEP-40) oracle entegrasyon modülü
Faz: 2   |   Bağımlılık: Prompt 7 (shared)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Reflector V3 oracle'ından (SEP-40) asset fiyatı ve decimals okuyan, yeniden kullanılabilir bir oracle istemci modülü yaz; strategy_router ve HF mantığı bunu kullanacak.

BAĞLAM: Reflector V3, SEP-40 standart arayüzünü uygular. ReflectorPulse (ücretsiz, 5 dk güncelleme) demo için yeterli. Oracle contract ID'leri testnet ≠ mainnet — hardcode ETME, env/config'den al; kontratta placeholder + # DOĞRULA bırak. Fiyat decimals'ı sabit varsayma; decimals() çağrısıyla oku. Bu modül shared crate'in bir parçası ya da ayrı bir oracle crate olabilir.

YAPILACAKLAR:
- Güncel sürüm/arayüz doğrulaması: SEP-40 arayüz fonksiyon imzalarını (lastprice, decimals, assets, vb.) Reflector V3 dökümanından doğrula; testnet ReflectorPulse oracle contract ID'sini resmi kaynaktan al ve config'e # DOĞRULA notuyla koy.
- packages/contracts içinde oracle istemci modülü: SEP-40 client wrapper — get_price(asset) -> (price, timestamp), get_decimals(asset), price'ı normalize eden yardımcı (decimals'a göre ölçekleme).
- Bayatlık (staleness) kontrolü: timestamp çok eskiyse OracleStale error (5 dk Pulse güncellemesini hesaba kat).
- AssetId ↔ Reflector asset eşlemesi (USDC/XLM/wBTC/wETH).
- Typed errors: OracleStale, PriceUnavailable, OracleNotConfigured.
- Testler: soroban-sdk testutils ile mock oracle kontratı kaydet; fiyat okuma, decimals ölçekleme, staleness revert, eksik fiyat senaryoları.

KABUL KRİTERLERİ (Done-when):
- Oracle modülü SEP-40 üzerinden fiyat + decimals okuyor; decimals sabit DEĞİL, çağrıyla geliyor.
- Oracle contract ID config/env'den, hardcode değil; placeholder'da # DOĞRULA notu var.
- cargo test ile mock oracle senaryoları yeşil (staleness revert dahil).

DOĞRULAMA:
- `cargo test` oracle modül testleri yeşil; decimals ölçeklemesinin (örn. 14 decimals) doğru fiyat verdiğini test çıktısıyla göster; config'de hardcoded mainnet ID OLMADIĞINI doğrula.
```

```text
### PROMPT 11 — Blend v2 entegrasyonu (blend-contract-sdk ile cross-contract)
Faz: 2   |   Bağımlılık: Prompt 9 (vault), Prompt 10 (oracle modülü)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Helios kontratlarının Blend v2 lending pool'una collateral yatırıp borç alabilmesi için blend-contract-sdk üzerinden cross-contract entegrasyon katmanını yaz ve BlendFixture ile test et.

BAĞLAM: Blend v2 projenin kalbi. On-chain kontratlar blend-contracts-v2 (blend-capital) — KENDİN DEPLOY ETME; testnet'te zaten deploy edilmiş pool_factory, backstop, pool adreslerini env'den al. Rust cross-contract + test için blend-contract-sdk (pool::Client, RequestType, testutils::BlendFixture, default_reserve_config). Blend zaten Reflector oracle ve kendi LTV/likidasyon parametrelerini kullanır — kendi formülünü dayatma; parametreleri Blend'den oku. supply/borrow/repay/withdraw işlemleri Blend'in submit/request modeliyle yapılır.

YAPILACAKLAR:
- Güncel sürüm doğrulaması: crates.io'dan blend-contract-sdk tam sürümünü doğrula ve pinle; pool::Client ve RequestType API imzalarını teyit et (kaymış olabilir — DOĞRULA). Testnet pool/backstop/factory adreslerini resmi Blend kaynağından al, config'e # DOĞRULA notuyla yaz.
- Blend entegrasyon modülü/crate: blend_adapter — pool::Client wrapper: supply_collateral(pool, user, asset, amount), borrow(pool, user, asset, amount), repay(...), withdraw(...) RequestType kullanarak; tek submit içinde birden çok request birleştirebilme (router için kritik).
- Blend pool parametrelerini okuma: reserve config, LTV, likidasyon eşiği, kullanıcı pozisyonu (collateral/debt değerleri) — HF hesabı için.
- Health Factor okuma: Blend pool'un sağladığı kullanıcı pozisyon verilerinden HF türet; formül kullanılacaksa (collateral_value * ltv) / debt_value ama GERÇEK değerleri Blend'den çek.
- Typed errors: BlendCallFailed, PoolNotConfigured, InsufficientCollateral (Blend kaynaklı).
- Testler: blend-contract-sdk testutils::BlendFixture + default_reserve_config ile tam bir testnet-benzeri ortam kur; supply→borrow akışı, HF okuma, repay/withdraw, parametre okuma testleri.

KABUL KRİTERLERİ (Done-when):
- blend_adapter, BlendFixture testlerinde supply/borrow/repay/withdraw'ı başarıyla yürütüyor.
- HF ve LTV Blend'den OKUNUYOR (uydurma formül dayatılmıyor); kod yorumu bunu açıkça belirtiyor.
- Pool adresleri config/env'den, hardcode değil.

DOĞRULAMA:
- `cargo test` BlendFixture entegrasyon testleri yeşil; supply sonrası borrow ile HF'nin beklenen aralıkta düştüğünü test çıktısıyla göster.
```

```text
### PROMPT 12 — strategy_router: atomik tek-tx kaldıraç akışı
Faz: 2   |   Bağımlılık: Prompt 8 (flash_lender), Prompt 9 (vault), Prompt 11 (blend_adapter)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Tek tx içinde flash borrow → collateral yatır → Blend'den borç al → flash geri öde zincirini yürüten strategy_router kontratını yaz; tüm cross-contract çağrıları tek InvokeHostFunctionOp altında zincirlensin.

BAĞLAM: Helios'un çekirdeği bu. Soroban'da tx başına tek InvokeHostFunctionOp var; atomik kaldıraç için TÜM çağrılar tek router fn'inde zincirlenmeli. router, flash_lender'ın callback'i (exec_op) olarak davranır: flash parayı alır, vault'a/Blend'e collateral yatırır, Blend'den borç alır, flash'ı geri öder, vault'ta pozisyonu kaydeder. open_position ve close_position (deleverage: borç kapat → collateral çek → flash geri öde) akışları. Tx'te MEMO_NONE zorunlu, muxed account olamaz.

YAPILACAKLAR:
- Güncel sürüm doğrulaması: bağımlı kontrat client'larının (flash_lender, vault, blend_adapter) imzalarının güncel olduğunu teyit et.
- strategy_router kontratı: open_position(user, collateral_asset, principal, leverage, debt_asset) — leverage'a göre flash miktarını hesapla → flash_lender.flash_loan(...) çağır → callback exec_op içinde: toplam collateral'ı Blend'e supply → Blend'den debt_asset borç al → flash principal+fee geri öde → vault.record_position(...). Tümü tek tx, ara revert tüm akışı geri alır.
- close_position(user): vault'tan pozisyonu oku → gereken flash ile Blend borcunu kapat → collateral çek → flash geri öde → kullanıcıya net collateral iade → vault.close_position.
- Slippage/min-out ve maksimum leverage guard'ları; HF açılışta minimum güvenli eşiğin üstünde mi kontrolü (Blend'den oku).
- Auth zinciri: require_auth(user); cross-contract auth'ların tek tx'te doğru propagate olması.
- Typed errors: LeverageTooHigh, UnsafeHealthFactor, FlashRepayFailed, RouterStepFailed.
- Events: position_opened (leverage, hf, collateral, debt), position_closed.
- Testler: tüm bağımlı kontratları (flash_lender, vault, Blend BlendFixture, oracle mock) tek Env'de kaydet; uçtan uca open_position mutlu yol; herhangi bir adımın revert'i tüm tx'i geri alıyor (atomiklik kanıtı); LeverageTooHigh/UnsafeHF guard testleri; close_position akışı.

KABUL KRİTERLERİ (Done-when):
- open_position uçtan uca testte tek tx içinde pozisyon açıyor; final state (vault + Blend) tutarlı.
- Atomiklik: kasıtlı başarısız adımda TÜM değişiklikler geri alınıyor (test ile kanıt).
- Guard'lar (max leverage, unsafe HF) revert ile çalışıyor.
- MEMO_NONE / muxed yasağı koşulları kod yorumu + deploy script notlarında belirtilmiş.

DOĞRULAMA:
- `cargo test -p strategy_router` yeşil; atomiklik testinin başarısız adımda state'i geri aldığını çıktıyla göster; open_position sonrası HF'nin Blend'den okunan güvenli aralıkta olduğunu doğrula.
```

```text
### PROMPT 13 — Health Factor & likidasyon mantığı (kontrat + paylaşılan hesap)
Faz: 2   |   Bağımlılık: Prompt 11 (Blend HF okuma), Prompt 12 (router)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Blend parametrelerinden Health Factor ve likidasyon yakınlığını hesaplayan, projeksiyon (fiyat senaryosuna göre HF) yapabilen paylaşılan bir mantık modülü üret; hem on-chain (keeper) hem off-chain (SDK/Risk Radar) tarafından tüketilebilsin.

BAĞLAM: HF'yi Blend pool parametrelerinden OKU, kendi formülünü dayatma. (collateral_value * liq_threshold) / debt_value gibi bir oran KULLANILABİLİR ama girdiler Blend + Reflector'dan gelir. Bu modül Keeper (Prompt 14) ve Risk Radar (Prompt 27) için temel. Saf hesap fonksiyonları no_std/portable olmalı ki hem Rust kontratı hem (yeniden yazılmış/paylaşılmış mantıkla) TS SDK aynı eşikleri kullansın.

YAPILACAKLAR:
- Güncel doğrulama: Blend'in hangi parametreyi likidasyon eşiği olarak verdiğini (collateral factor vs liability factor) teyit et — DOĞRULA.
- shared crate'te hf modülü: health_factor(collateral_value, debt_value, liq_params) -> hf; project_hf(position, price_delta_pct) -> hf (fiyat şoku altında projeksiyon); liquidation_price(position) -> price (HF=1 olan fiyat); risk_band(hf) -> Healthy/Caution/Danger (design-system eşikleriyle aynı sayısal eşikler).
- Eşikler tek kaynak: risk band eşik sabitleri shared'da; TS SDK aynı sayıları kullanacak (Prompt 18'de mirror + doğrulama testi).
- Typed errors: ZeroDebt (HF sonsuz), InvalidParams.
- Testler: bilinen girdilerle HF hesabı, projeksiyon (örn. -20% fiyatta HF düşüşü), liquidation_price doğruluğu, band sınır değerleri.

KABUL KRİTERLERİ (Done-when):
- HF/projeksiyon/likidasyon fiyatı fonksiyonları test edilmiş ve Blend'den okunan gerçek parametrelerle besleniyor.
- Risk band eşikleri tek bir sabit kaynağında; design-system HF renkleriyle hizalı.
- cargo test yeşil.

DOĞRULAMA:
- `cargo test` hf modül testleri yeşil; -20%/-40% fiyat şoku projeksiyonunun ve liquidation_price'ın elle hesapla uyuştuğunu göster.
```

```text
### PROMPT 14 — keeper (Auto-Rebalancer) kontratı + testler
Faz: 2   |   Bağımlılık: Prompt 12 (router close/deleverage), Prompt 13 (HF mantığı)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Bir pozisyonun HF'si eşik altına yaklaşınca opt-in ile otomatik kısmi deleverage tetikleyen keeper kontratını yaz; gerçek tetik off-chain cron (Prompt 29) tarafından çağrılacak ama yetki/limit mantığı on-chain olmalı.

BAĞLAM: Auto-Rebalancer katmanı: HF eşik altına yaklaşınca otomatik kısmi deleverage. Kullanıcı opt-in vermeli (yetki). On-chain keeper: kimin keeper olduğunu, hangi HF eşiğinde ne kadar deleverage yapılacağını ve kötüye kullanımı (sadece HF gerçekten düşükken, kullanıcı lehine) engelleyen guard'ları içerir. Asıl deleverage işini strategy_router'ın kısmi close mantığı yapar.

YAPILACAKLAR:
- Güncel doğrulama: router'ın kısmi deleverage fn imzasını teyit et.
- keeper kontratı: register_opt_in(user, trigger_hf, target_hf, max_deleverage_pct) — kullanıcı korumayı açar; rebalance(user) — çağrıldığında Blend'den güncel HF'yi oku, trigger_hf altındaysa target_hf'ye ulaşacak kadar router üzerinden kısmi deleverage yap, değilse NoActionNeeded.
- Guard'lar: yalnızca HF < trigger iken çalışır; max_deleverage_pct'i aşamaz; sadece kullanıcı pozisyonunu küçültür (collateral çıkışı kullanıcıya/borca gider, keeper'a değil); pausable.
- Yetki: keeper rolü (stellar-access); opt-in olmayan kullanıcıya dokunamaz.
- Events: opt_in_registered, rebalanced (eski_hf, yeni_hf, deleverage_amount), rebalance_skipped.
- Typed errors: NotOptedIn, NoActionNeeded, DeleverageCapExceeded, Unauthorized.
- Testler: opt-in akışı; HF düşükken rebalance HF'yi target'a çekiyor; HF güvenliyken NoActionNeeded; cap aşımı reddi; opt-in olmayanda revert; keeper olmayan çağrıda revert.

KABUL KRİTERLERİ (Done-when):
- rebalance yalnızca opt-in + HF<trigger durumunda ve cap dahilinde deleverage yapıyor (test ile).
- Kullanıcı fonları keeper'a akmıyor (güvenlik testi).
- cargo test yeşil; en az 6 senaryo.

DOĞRULAMA:
- `cargo test -p keeper` yeşil; rebalance sonrası HF'nin target civarına çıktığını ve cap'in aşılamadığını çıktıyla göster.
```

```text
### PROMPT 15 — Kontrat build + testnet deploy script + contract ID'leri .env'e
Faz: 2   |   Bağımlılık: Prompt 8-14 (tüm kontratlar yeşil)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Tüm Soroban kontratlarını wasm32v1-none için derleyip Stellar testnet'e deploy eden, çıkan contract ID'lerini ve harici (Blend/Reflector) adresleri tek bir .env / config'e yazan, tekrar çalıştırılabilir bir deploy script'i üret.

BAĞLAM: Tüm kontratlar (flash_lender, vault, strategy_router, keeper) test edilmiş. Build CLI stellar contract build, target wasm32v1-none, çıktı target/wasm32v1-none/release/*.wasm. Deploy ve init için stellar CLI (stellar contract deploy / invoke). Testnet hesabı Friendbot ile fonlanır. Harici Blend pool/backstop/factory ve Reflector oracle ID'leri env'den gelir (deploy edilmez, # DOĞRULA ile resmi kaynaktan). Frontend bu ID'leri okuyacak (Faz 3-4).

YAPILACAKLAR:
- Güncel doğrulama: stellar CLI sürümü, testnet RPC/passphrase, wasm32v1-none target kurulu mu; Blend testnet ve Reflector Pulse testnet adreslerini resmi kaynaktan teyit et (# DOĞRULA).
- packages/contracts/scripts/deploy-testnet.sh (veya .ps1 — Windows kullanıcı): tüm kontratları stellar contract build ile derle; testnet deployer hesabını oluştur/Friendbot ile fonla; her kontratı deploy et; init/setup invoke'larını sırayla çalıştır (flash_lender havuz init, vault asset config, router bağımlılık adresleri, keeper rol ataması, Blend pool + Reflector oracle adres bağlama).
- Çıkan contract ID'lerini ve harici adresleri packages/contracts/.env.testnet ve apps/web tarafından okunacak bir .env.local / config dosyasına yaz (deterministik, yeniden çalıştırılabilir; idempotent değilse en azından temiz yeniden deploy).
- Doğrulama invoke'ları: deploy sonrası read-only bir çağrı ile (örn. router/vault config oku) deploy'un sağlığını kanıtla.
- contracts/addresses.json: tüm adresleri yapılandırılmış JSON olarak (SDK Prompt 18 bunu tüketecek).
- README: deploy adımları, gereken env değişkenleri, # DOĞRULA notları.

KABUL KRİTERLERİ (Done-when):
- Script tek komutla tüm kontratları testnet'e deploy edip ID'leri .env/addresses.json'a yazıyor.
- En az bir read-only invoke ile her kontratın canlı olduğu kanıtlanıyor (başarılı çıktı/tx).
- Blend/Reflector adresleri env'den, hardcode değil; # DOĞRULA notları yerinde.

DOĞRULAMA:
- Script çıktısı: her deploy için contract ID + başarılı init tx hash; örnek `stellar contract invoke ... -- get_config` çağrısı beklenen veriyi döndürüyor; addresses.json dolu.
```

---

## FAZ 3 — Wallet & Auth & Core SDK

```text
### PROMPT 16 — Stellar Wallets Kit connect akışı
Faz: 3   |   Bağımlılık: Prompt 6 (UI primitifleri), Prompt 15 (contract adresleri)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: @creit.tech/stellar-wallets-kit v2.x ile çoklu cüzdan (Freighter, xBull, Albedo, Lobstr, Rabet, Hana, WalletConnect) bağlantı akışını apps/web'e entegre et; Freighter'ın yeni explicit "connect" davranışına uygun.

BAĞLAM: packages/ui primitifleri ve cosmic tema hazır. Freighter artık imzadan ÖNCE explicit connect ister (yeni güvenlik davranışı) — connect akışını buna göre kur, doğrudan imzaya gitme. Cüzdan durumu global state'te (Zustand) tutulmalı. Bu prompt sadece bağlantı + adres + ağ; SEP-10 auth (Prompt 17) ve tx imzalama (Prompt 22) ayrı.

YAPILACAKLAR:
- Güncel sürüm doğrulaması: npm'den @creit.tech/stellar-wallets-kit v2.x tam sürümü, @stellar/stellar-sdk, zustand güncel sürümlerini doğrula ve pinle.
- packages/sdk veya apps/web içinde wallet modülü: StellarWalletsKit kurulumu (testnet, desteklenen modüller), connect() (modal ile cüzdan seçimi → Freighter explicit connect akışı → public key), disconnect(), getNetwork() (testnet doğrulaması), onaccountchange/onnetworkchange dinleyicileri.
- Zustand store: walletStore (address, network, isConnected, selectedWalletId, status).
- packages/ui: WalletButton (bağlan/bağlı durumları, kısaltılmış adres, ağ rozeti, disconnect menüsü), WalletModal entegrasyonu.
- Yanlış ağ uyarısı: testnet değilse uyarı + değiştir CTA.
- Hata yönetimi: kullanıcı reddi, cüzdan kurulu değil, ağ uyumsuz — net mesajlar (typed; Prompt 19 ile entegre).
- Persisted connection: sayfa yenilemede son cüzdanı hatırla (kit'in desteklediği ölçüde).

KABUL KRİTERLERİ (Done-when):
- En az Freighter ile bağlanma çalışıyor; explicit connect akışı doğru (imza istemeden adres alınıyor).
- walletStore adres/ağ/durumu doğru yansıtıyor; ağ değişimi UI'da görünüyor.
- WalletButton tüm durumları (disconnected/connecting/connected/wrong-network) gösteriyor.

DOĞRULAMA:
- `pnpm --filter web dev` ile Freighter testnet bağlantısını canlı göster (adres + ağ rozeti); yanlış ağda uyarı çıkması; disconnect sonrası state temizlenmesi.
```

```text
### PROMPT 17 — SEP-10 auth (challenge → imza → httpOnly JWT) — proxy.ts gate
Faz: 3   |   Bağımlılık: Prompt 16 (wallet connect)

> 🛡️ **AUDIT 2026-05-31 OVERRIDE.**
> Next.js 16'da `middleware.ts` → **`proxy.ts`** olarak rename edildi (Node.js runtime, kaynak: nextjs.org/blog/next-16). Helios'ta korumalı route prefix kontrolü (`/dashboard`, `/api/copilot`, `/api/keeper/cron`) `proxy.ts` üzerinden yapılır. `middleware.ts` deprecated. Detay: AUDIT §3.1.

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: SEP-10 standart akışıyla cüzdan-tabanlı kimlik doğrulama kur: backend challenge transaction üretir, cüzdan imzalar, backend doğrulayıp httpOnly JWT cookie verir; korumalı API rotaları bu oturumu okur.

BAĞLAM: Wallet connect (Prompt 16) hazır. Auth standardı SEP-10: challenge transaction → cüzdan imzası → backend doğrular → httpOnly JWT cookie. Next.js 16 App Router Route Handlers kullanılacak. AI Copilot, Leaderboard, Keeper opt-in gibi özellikler kimlik gerektirir. Server signing key güvenli env'de; testnet.

YAPILACAKLAR:
- Güncel sürüm doğrulaması: @stellar/stellar-sdk'nın SEP-10 yardımcılarını (Utils.buildChallengeTx / readChallengeTx veya güncel eşdeğeri) ve bir JWT kütüphanesini (jose önerilir) npm'den doğrula ve pinle.
- apps/web Route Handlers: GET /api/auth/challenge?account=... → SEP-10 challenge transaction (XDR) döner (server SIGNING_KEY ile imzalı, home domain, web auth domain, testnet passphrase). POST /api/auth/verify → imzalı XDR'ı al, SEP-10 kurallarıyla doğrula (imza, sequence, timebounds, domain), geçerliyse httpOnly+secure+sameSite JWT cookie set et. POST /api/auth/logout → cookie temizle. GET /api/auth/me → oturum bilgisi.
- packages/sdk: useAuth hook'u (challenge al → wallet ile imzala → verify → oturum durumu), TanStack Query ile.
- Korumalı rota yardımcısı: server tarafında JWT doğrulayan getSession() / requireSession() util.
- Güvenlik: SIGNING_KEY ve JWT_SECRET env'den (asla client'a sızmaz); cookie httpOnly; CSRF için sameSite; replay önleme (challenge nonce/timebound).
- UI: WalletButton'a "Sign in" durumu; oturum açık/kapalı gösterimi.

KABUL KRİTERLERİ (Done-when):
- Uçtan uca: connect → challenge → cüzdan imzası → httpOnly JWT cookie set → /api/auth/me oturumu döndürüyor.
- Geçersiz/replay/expired imza reddediliyor.
- Korumalı bir örnek rota oturumsuz 401 veriyor.

DOĞRULAMA:
- DevTools/curl ile: challenge XDR alınıyor, imzalı verify httpOnly cookie set ediyor, /api/auth/me 200; oturumsuz korumalı rota 401; bozuk imza 401.
```

```text
### PROMPT 18 — packages/sdk core hook'lar (positions, vaults, oracle, strategies)
Faz: 3   |   Bağımlılık: Prompt 15 (addresses.json), Prompt 16-17 (wallet+auth)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Frontend'in tüm zincir okuma/yazma ihtiyaçlarını karşılayan tek tip-güvenli packages/sdk katmanını kur: contract client'ları + TanStack Query hook'ları (positions, vaults, oracle, strategies) + RPC simülasyonu ile read.

BAĞLAM: addresses.json, wallet ve auth hazır. TS frontend için @blend-capital/blend-sdk (PoolContract, RequestType) + @stellar/stellar-sdk ile RPC simülasyonu (read için tx yayınlamadan) kullanılacak. Kendi kontratlarımız (router/vault/keeper/flash_lender) için stellar CLI ile TS binding üretilebilir (stellar contract bindings typescript) ya da elle client. HF eşik mantığı Prompt 13 ile birebir aynı sayıları kullanmalı.

YAPILACAKLAR:
- Güncel sürüm doğrulaması: npm'den @blend-capital/blend-sdk (≈3.2.2), @stellar/stellar-sdk (**major 15.x — ≈15.1.0; eski v12/13 API'sini varsayma, rpc/Soroban API'leri kaymış olabilir**), @tanstack/react-query güncel sürümlerini doğrula ve pinle. @blend-capital/blend-sdk'nın PoolContract/RequestType imzalarını koda yazmadan önce repo/docs'tan teyit et (STELLAR_STACK.md §9'da # DOĞRULANMADI).
- TS contract binding'leri: stellar contract bindings typescript ile router/vault/keeper/flash_lender için tip-güvenli client'lar üret (ya da ince elle wrapper); addresses.json'dan adresleri oku.
- RPC simülasyon okuma katmanı: read-only çağrılar (get_position, vault config, vb.) tx yayınlamadan simulateTransaction ile; yazma çağrıları için XDR hazırlama (imza Prompt 22'de).
- Oracle hook: useOraclePrice(asset) — Reflector'dan fiyat+decimals (gerekirse server route üzerinden), staleness gösterimi.
- Blend hook'lar: usePoolReserves, useUserBlendPosition (HF/LTV Blend'den) @blend-capital/blend-sdk ile.
- Helios hook'lar (TanStack Query): usePosition(user), useVaults, useStrategies, useKeeperOptIn(user); query key standardı, refetch/stale ayarları.
- HF mantığı TS aynası: Prompt 13'teki eşik sabitlerini ve risk_band'i TS'e birebir taşı; bir unit test ile Rust ile aynı sınır değerleri verdiğini doğrula (sabitlerin senkron olduğunu belgele).
- packages/sdk/src/index.ts barrel export; tüm tipler türetilmiş (any yok).

KABUL KRİTERLERİ (Done-when):
- usePosition canlı testnet'ten (Prompt 15 deploy'undan) gerçek pozisyon/boş durumu okuyabiliyor (RPC simülasyon).
- Oracle ve Blend hook'ları gerçek fiyat ve HF/LTV döndürüyor.
- TS risk_band eşikleri Rust ile aynı (test ile kanıtlı).
- Lint/typecheck temiz, any yok.

DOĞRULAMA:
- Bir test/dev sayfasında hook'ları çağırıp gerçek testnet verisini (fiyat, vault config, boş pozisyon) render et; `pnpm test` ile HF eşik paritesi testi yeşil.
```

```text
### PROMPT 19 — Typed error yönetimi + kullanıcı-dostu eşleme
Faz: 3   |   Bağımlılık: Prompt 7/12 (kontrat HeliosError), Prompt 16-18 (wallet/auth/sdk)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Kontrat HeliosError'ları, RPC/simülasyon hataları, cüzdan hataları ve auth hatalarını tek bir tip-güvenli hata modeline normalize edip kullanıcıya anlaşılır mesaj + aksiyon olarak gösteren bir katman kur.

BAĞLAM: Kontratlar typed #[contracterror] döndürüyor (numaralı). Frontend'de bu numaralar simülasyon/tx sonuçlarında çıplak gelir. Wallet (reddetme, yanlış ağ), auth (401/replay), Blend (likidite/parametre) ve oracle (staleness) hatalarının hepsi tutarlı UX'le sunulmalı. Risk uyarıları (flash-loan/kaldıraç) bu katmanla ilişkili.

YAPILACAKLAR:
- packages/sdk içinde HeliosError enum kod ↔ kullanıcı mesajı eşleme tablosu (Rust HeliosError ile senkron; tek kaynak, drift'e karşı test).
- normalizeError(unknown) -> AppError: kategoriler (Contract, Rpc, Wallet, Auth, Oracle, Network, Unknown), her biri için kullanıcı mesajı (TR), teknik detay (geliştirici), önerilen aksiyon (örn. "ağı testnet'e geçir", "tekrar dene", "daha düşük leverage").
- Risk uyarısı içerikleri: UnsafeHealthFactor/LeverageTooHigh için net likidasyon/risk dili (testnet, unaudited hatırlatması).
- UI: ErrorToast/ErrorBanner (packages/ui), TanStack Query global onError ile bağla; inline form hataları için yardımcı.
- Sentry-vari log noktası (opsiyonel): teknik detayı konsola/loglara, kullanıcıya sade mesaj.
- i18n-ready yapı (en azından TR sabitleri tek dosyada).

KABUL KRİTERLERİ (Done-when):
- Bilinen her HeliosError kodu için kullanıcı mesajı var; bilinmeyen kod güvenli fallback'e düşüyor.
- Wallet reddi, yanlış ağ, 401 auth, oracle staleness farklı ve doğru mesajlar üretiyor.
- HeliosError kod↔mesaj senkronluğu testle korunuyor.

DOĞRULAMA:
- Birim test: çeşitli ham hatalar (kontrat kodu, wallet red, 401) normalizeError'dan beklenen kategori+mesajı veriyor; UI'da kasıtlı bir hata (örn. yanlış ağ) doğru toast/banner üretiyor.
```

---

## FAZ 4 — Ana Akışlar

```text
### PROMPT 20 — Landing sayfası (hero + APY tablosu + how-it-works)
Faz: 4   |   Bağımlılık: Prompt 6 (UI), Prompt 18 (vault/oracle hook'lar)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Helios'un değer önerisini 5 saniyede anlatan, canlı APY tablosu ve "nasıl çalışır" görsel akışı içeren Landing sayfasını üret (demo'nun 0-10s hook'u).

BAĞLAM: Cosmic tema, UI primitifleri, SDK hook'ları hazır. Next.js 16 App Router, Cache Components ("use cache" direktifi + next.config.ts'te TOP-LEVEL `cacheComponents: true` — DİKKAT: `experimental.cacheComponents` veya `experimental.ppr` DEĞİL; PPR flag'i Next.js 16'da kaldırıldı) ile statik+dinamik karışımı. params/searchParams Promise — await et. APY/vault verisi SDK'dan (gerçek testnet veya makul fallback). Demo senaryosunda landing ilk izlenim; "testnet/unaudited" ibaresi görünür olmalı.

YAPILACAKLAR:
- Güncel doğrulama: Next.js 16 Cache Components yapılandırmasını teyit et — `next.config.ts` içinde TOP-LEVEL `cacheComponents: true` (eski `experimental.cacheComponents` / `experimental.dynamicIO` DEĞİL) + `"use cache"` direktifi. `experimental.ppr` kullanma (kaldırıldı). Kaynak: STELLAR_STACK.md §6.
- apps/web/app/page.tsx: AuroraBackground hero (başlık, alt başlık, 2 CTA: "Launch App" → /open, "How it works"), demo-hook değer cümlesi.
- Canlı APY/Vault tablosu: USDC/XLM/wBTC/wETH için APY + leverage'lı tahmini getiri (SDK hook; gerçek yoksa "use cache" ile önbellekli + net "tahmini/testnet" etiketi).
- "How it works" bölümü: 4 adımlı atomik flash-loan döngüsü görseli (flash → collateral → borrow → repay), tek-tx vurgusu, Framer Motion ile adım adım animasyon.
- 7 katman özeti (kartlar): AI Copilot, Risk Radar, Keeper, Vaults, Simulator, Leaderboard, PWA.
- Güven/dürüstlük şeridi: "Unaudited · Testnet only · Not financial advice".
- Responsive + a11y; Cache Components ile statik kabuk + dinamik APY.

KABUL KRİTERLERİ (Done-when):
- Landing cosmic temayla render; hero, canlı APY tablosu, how-it-works animasyonu, 7 katman kartları mevcut.
- APY verisi SDK'dan geliyor (veya açıkça etiketli fallback).
- "testnet/unaudited/not financial advice" ibaresi görünür.
- npm run build temiz, Cache Components hatası yok.

DOĞRULAMA:
- `pnpm --filter web build && pnpm --filter web start` ile landing'i göster; APY tablosunun veri çektiğini, how-it-works animasyonunun çalıştığını doğrula; Lighthouse hızlı bakış.
```

```text
### PROMPT 21 — Open Position wizard: asset seçimi + canlı leverage slider
Faz: 4   |   Bağımlılık: Prompt 13/18 (HF mantığı + hook'lar), Prompt 20 (CTA)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Kullanıcının asset seçip leverage slider'ını oynattıkça HF / APY / likidasyon fiyatını CANLI gösteren Open Position wizard'ının (tx hariç) adımlarını kur.

BAĞLAM: HF mantığı (Prompt 13 Rust + Prompt 18 TS aynası), oracle/Blend hook'ları hazır. Bu prompt UI + canlı hesaplama; gerçek tx imzalama/gönderme Prompt 22'de. Demo'nun 30-55s'i bu ekran. Risk şeffaflığı kritik: slider arttıkça likidasyon yakınlığı görsel olarak hissedilmeli.

YAPILACAKLAR:
- apps/web/app/open/page.tsx + wizard adımları (Zustand wizard store): 1) asset seç (USDC/XLM/wBTC/wETH), 2) principal gir, 3) leverage slider (1x–Nx, Blend max'a göre sınırlı).
- Canlı hesaplama: slider/principal değiştikçe oracle fiyatı + Blend parametreleriyle projeksiyon → tahmini collateral, debt, HF, net APY, likidasyon fiyatı; TS HF mantığı (Prompt 18) ile, debounce'lı.
- Görsel risk: HealthFactorBadge + RiskGauge canlı; likidasyon fiyatı mevcut fiyata göre "% uzaklık"; danger bölgesinde uyarı + slider'ı kısıtla/uyar.
- Maks güvenli leverage guard (kontrat guard'ıyla aynı eşik): aşımda "Open" disabled + açıklama.
- Özet paneli: kullanıcı ne alıyor/ne riske giriyor — net, dürüst dil; "not financial advice / testnet".
- Erişilebilirlik: slider klavye ile, değerler ekran okuyucu dostu, tabular-nums.
- "Continue to confirm" → Prompt 22'nin confirm adımına state taşır.

KABUL KRİTERLERİ (Done-when):
- Slider/principal değiştikçe HF, APY, likidasyon fiyatı gerçek zamanlı ve doğru (kontrat mantığıyla tutarlı) güncelleniyor.
- Danger bölgesinde görsel uyarı + guard çalışıyor.
- Hesaplanan değerler Prompt 13/18 mantığıyla birebir (manuel kontrol).

DOĞRULAMA:
- Dev'de slider'ı oynatıp HF/likidasyon fiyatının canlı değiştiğini göster; bir senaryoyu elle hesaplayıp UI ile eşleştir; max leverage guard'ının Open'ı kilitlediğini doğrula.
```

```text
### PROMPT 22 — Open Position confirm + atomik tx imzalama & gönderme
Faz: 4   |   Bağımlılık: Prompt 12 (strategy_router), Prompt 16/18 (wallet/sdk), Prompt 21 (wizard)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Wizard özetinden gelen parametrelerle strategy_router.open_position çağrısını tek atomik tx olarak hazırla, cüzdanla imzalat, testnet'e gönder ve sonucu (tx hash, açılan pozisyon) kullanıcıya göster.

BAĞLAM: strategy_router atomik open_position deploy edilmiş (Prompt 15). SDK XDR hazırlama + RPC (Prompt 18), wallet imzalama (Prompt 16) hazır. Tx'te MEMO_NONE zorunlu, muxed account olamaz. İmza öncesi simülasyon ile beklenen sonucu (HF, debt) gösterip kullanıcıyı onaylat; sonra gönder ve sonucu izle.

YAPILACAKLAR:
- Güncel doğrulama: @stellar/stellar-sdk ile tx assemble/simulate/send (sorobanRpc) güncel API'lerini teyit et.
- Confirm ekranı: wizard parametreleriyle open_position XDR'ı hazırla; ÖNCE simulateTransaction ile beklenen HF/debt/maliyeti göster; MEMO_NONE ayarla, muxed account engelle.
- İmzalama: StellarWalletsKit ile imzalat (Freighter explicit connect/sign akışı); restore/footer ve resource fee'leri simülasyondan al.
- Gönderme: sendTransaction → getTransaction ile durumu poll et; başarı/başarısızlık.
- Sonuç UI: başarı → tx hash (testnet explorer linki) + "pozisyon açıldı" + Dashboard'a yönlendir CTA; başarısızlık → Prompt 19 normalize edilmiş hata + tekrar dene.
- TanStack Query invalidation: usePosition/useVaults yenile.
- Edge: kullanıcı imza reddi, yetersiz fee, simülasyon revert (örn. unsafe HF) — net mesaj.

KABUL KRİTERLERİ (Done-when):
- Gerçek testnet'te uçtan uca pozisyon açılıyor: imzala → gönder → tx hash → Dashboard'da pozisyon görünüyor.
- Tx tek InvokeHostFunctionOp, MEMO_NONE; muxed account reddediliyor.
- Simülasyon önizlemesi gönderim öncesi doğru HF/debt gösteriyor.
- Hata yolları (red/revert) düzgün ele alınıyor.

DOĞRULAMA:
- Canlı demo: Freighter ile open_position imzala, testnet tx hash'i explorer'da doğrula, usePosition'ın yeni pozisyonu döndürdüğünü göster.
```

```text
### PROMPT 23 — Dashboard: KPI + pozisyon listesi + HF grafiği drawer
Faz: 4   |   Bağımlılık: Prompt 18 (hook'lar), Prompt 22 (açılmış pozisyon), Prompt 13 (projeksiyon)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Kullanıcının kaldıraçlı pozisyonlarını, portföy KPI'larını ve her pozisyon için HF zaman/fiyat projeksiyon grafiğini gösteren Dashboard'u üret; pozisyon kapatma (deleverage) buradan tetiklenebilsin.

BAĞLAM: Pozisyonlar açılabiliyor (Prompt 22). HF projeksiyon mantığı (Prompt 13/18) ve Recharts (Prompt 6 token renkleri) hazır. Demo'nun 55-75s'i. Risk Radar'ın derinlemesi Prompt 27'de; burada temel HF grafiği + drawer.

YAPILACAKLAR:
- apps/web/app/dashboard/page.tsx: üstte KPI tile'ları (toplam collateral, toplam debt, net equity, ortalama HF, toplam tahmini APY) — StatTile, tabular-nums.
- Pozisyon listesi: her satır asset, leverage, collateral/debt, canlı HF (HealthFactorBadge), likidasyon fiyatı, PnL (tahmini). Boş durum → "Open your first position" CTA.
- Pozisyon drawer/detay: seçilen pozisyon için HF projeksiyon grafiği (Recharts) — fiyat senaryosuna/zamana göre HF eğrisi (Prompt 13 project_hf), likidasyon eşiği çizgisi, mevcut nokta.
- Aksiyonlar: "Close position" → Prompt 22 paterniyle close_position tx; "Deleverage" kısayolu (kısmi); "Enable Auto-Rebalance" → Prompt 14 keeper opt-in (Prompt 29 cron ile çalışacak).
- Canlı güncelleme: oracle fiyatı değiştikçe HF/grafik yenilensin (TanStack Query refetch).
- Risk dili + testnet/unaudited şeridi.

KABUL KRİTERLERİ (Done-when):
- Dashboard gerçek testnet pozisyonunu, doğru KPI'ları ve canlı HF'yi gösteriyor.
- HF projeksiyon grafiği likidasyon eşiğiyle birlikte render oluyor.
- Close position tx'i çalışıyor (pozisyon kapanıp listeden düşüyor).

DOĞRULAMA:
- Canlı: açık pozisyonla Dashboard'u göster, drawer'da HF eğrisini ve likidasyon çizgisini doğrula; close_position sonrası KPI ve listenin güncellendiğini göster.
```

```text
### PROMPT 24 — Faucet: Upstash Redis rate-limit + Friendbot + test token mint
Faz: 4   |   Bağımlılık: Prompt 16 (wallet), Prompt 17 (auth opsiyonel), Prompt 15 (asset adresleri)

> 🛡️ **AUDIT 2026-05-31 OVERRIDE.**
> "Vercel KV" Vercel'de native ürün olarak **kaldırıldı**. Bugünkü çözüm: **Upstash Redis via Vercel Marketplace** — `vercel install upstash`. Env değişkenleri otomatik inject: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. SDK: `@upstash/redis` + `@upstash/ratelimit`. Test asset'leri: USDC/wBTC/wETH için mock SEP-41 token (PROMPT 15 deploy script'inde üretilir), faucet admin keypair ile `mint` çağırır. Detay: AUDIT §2.1, §3.4.

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Kullanıcının demo için XLM (Friendbot) ve test asset'lerini (USDC/wBTC/wETH testnet SAC) güvenli, rate-limit'li şekilde alabileceği bir Faucet sayfası + API'si kur.

BAĞLAM: Demo'da kullanıcı (10-30s) wallet bağlayıp fon alır. Testnet XLM Friendbot ile; diğer asset'ler için ya bir test-token mint yetkisi (deploy'da admin'e verilmiş SAC/token) ya da önceden fonlanmış bir dağıtıcı hesap. Kötüye kullanımı önlemek için Vercel KV ile adres/IP bazlı rate-limit. Bu altyapı, demo'nun pürüzsüz olması için kritik.

YAPILACAKLAR:
- Güncel doğrulama: Vercel KV (veya Upstash Redis) SDK güncel paketini doğrula ve pinle; Friendbot testnet endpoint'ini teyit et.
- apps/web/app/faucet/page.tsx: bağlı adrese XLM + seçili test asset'leri "Request" butonu, kalan kota / cooldown göstergesi.
- POST /api/faucet: doğrulamalar (bağlı/testnet adres, geçerli account), rate-limit (KV: adres+IP başına N istek / pencere), XLM için Friendbot çağrısı, test asset için mint/transfer (admin keypair env'den — asla client'a sızmaz); idempotent ve hata-toleranslı.
- Rate-limit aşımında 429 + kullanıcıya kalan süre (Prompt 19 hata katmanı).
- Güvenlik: admin/dağıtıcı secret yalnız server env; sadece testnet (mainnet adresini reddet); miktar sınırları.
- UI geri bildirim: işlem sonrası bakiye yenileme (SDK), tx hash linkleri.

KABUL KRİTERLERİ (Done-when):
- Bağlı testnet adres XLM + en az bir test asset alıyor; bakiye UI'da güncelleniyor.
- Rate-limit çalışıyor (kısa sürede tekrar istek 429 + cooldown mesajı).
- Admin secret sızmıyor (yalnız server route); mainnet adresi reddediliyor.

DOĞRULAMA:
- Canlı: faucet ile fon al, bakiyenin arttığını ve tx hash'i göster; hızlı ikinci istekte 429/cooldown; server log'unda secret'ın client'a gitmediğini doğrula.
```

---

## FAZ 5 — Hackathon Silahları

```text
### PROMPT 25 — AI Strategy Copilot: AI SDK v6 route + tool calling + prompt caching
Faz: 5   |   Bağımlılık: Prompt 18 (SDK hook'lar/okuma), Prompt 13 (HF/risk), Prompt 17 (auth)

> 🛡️ **AUDIT 2026-05-31 OVERRIDE.**
> System prompt + tool tanımları **Anthropic prompt caching** ile sarılır (kaynak: ai-sdk.dev/providers/ai-sdk-providers/anthropic). `providerOptions.anthropic.cacheControl = { type: 'ephemeral', ttl: '1h' }` system mesajına; tool tanımlarına da aynı. Rate-limit Upstash Redis (PROMPT 24 ile aynı). System prompt'a **oracle risk** vurgusu eklenir (AUDIT §1.6 — Blend 2025 oracle exploit). Detay: AUDIT §3.5.

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Canlı piyasa verisi + kullanıcı pozisyonunu okuyup gerekçeli kaldıraç önerisi üreten AI Copilot'un backend'ini Vercel AI SDK v6 ile kur: tool calling ile zincir/oracle/HF verisine erişen streaming bir chat route'u.

BAĞLAM: AI Strategy Copilot katmanı: canlı veri + Claude ile gerekçeli öneri (yatırım tavsiyesi DEĞİL, eğitim çerçevesi). AI SDK v6 (ai + @ai-sdk/anthropic), model anthropic('claude-sonnet-4-6'); tool calling + tool streaming default açık. Tool'lar SDK okuma katmanını (oracle fiyat, Blend HF/LTV, vault APY, project_hf/liquidation_price) sarmalar. Çıktı her zaman risk + "not financial advice" çerçevesinde. Chat UI Prompt 26'da.

YAPILACAKLAR:
- Güncel sürüm doğrulaması: npm'den ai (v6) ve @ai-sdk/anthropic güncel sürümlerini doğrula ve pinle; claude-sonnet-4-6 model ID'sini teyit et.
- apps/web/app/api/copilot/route.ts: streamText/UIMessage tabanlı route; system prompt: Helios bağlamı, kesinlikle "eğitim amaçlı, yatırım tavsiyesi değil, testnet, unaudited" sınırları, riski daima açıkla kuralı.
- Tool'lar (tip-güvenli, SDK üstüne): getOraclePrice(asset), getUserPosition(account), getPoolParams(asset), simulateLeverage({asset, principal, leverage}) → HF/APY/liquidation (Prompt 13/18 mantığı), getVaultApy(asset). Tool'lar yalnızca okuma; tx imzalamaz/göndermez.
- Auth: oturum (Prompt 17) gerekli; pozisyon tool'u yalnızca kendi hesabını okur.
- Prompt caching / effort provider option'ları (gerekirse) ile maliyet/latency optimizasyonu.
- Güvenlik: tool girdileri doğrulanır; model çıktısı tx tetikleyemez; rate-limit (KV).
- Yapılandırılmış öneri formatı: öneri + gerekçe + riskler + "bu tavsiye değildir".

KABUL KRİTERLERİ (Done-when):
- Route streaming yanıt veriyor; model gerçek oracle/HF tool çıktılarıyla gerekçeli öneri üretiyor.
- Tool'lar yalnız okuma; hiçbir tx imzalanmıyor/gönderilmiyor.
- Her yanıt risk + "not financial advice" çerçevesi içeriyor (system prompt zorunlu kılıyor).
- Auth'suz istek reddediliyor.

DOĞRULAMA:
- curl/dev ile bir soru ("3x XLM riskim ne?") gönder; tool çağrılarının gerçek fiyat/HF döndürdüğünü ve yanıtın risk çerçevesini içerdiğini göster; auth'suz 401.
```

```text
### PROMPT 26 — AI Copilot chat UI (useChat + tool streaming görselleştirme)
Faz: 5   |   Bağımlılık: Prompt 25 (copilot route), Prompt 6 (UI)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Copilot route'unu tüketen, tool çağrılarını ve gerekçeli öneriyi şeffaf gösteren bir chat arayüzü kur; Dashboard/Open Position akışlarına gömülebilsin.

BAĞLAM: Copilot backend (Prompt 25) streaming + tool calling veriyor. AI SDK v6 useChat + UIMessage tipleri. Cosmic tema. Şeffaflık önemli: model hangi veriye baktı (tool sonuçları) görünür olsun ki "kara kutu öneri" hissi olmasın ve dürüstlük korunsun.

YAPILACAKLAR:
- Güncel doğrulama: ai/react useChat (v6) API'sini teyit et.
- packages/ui/apps/web: CopilotPanel (drawer/sheet) — mesaj listesi, streaming token render, tool çağrısı kartları (hangi tool, girdi, dönen fiyat/HF), öneri kartı (öneri + gerekçe + riskler).
- Bağlam enjeksiyonu: mevcut sayfa bağlamı (seçili asset/leverage ya da açık pozisyon) ilk mesaja otomatik eklensin ("şu pozisyonum için...").
- Hızlı sorular (chips): "Bu leverage güvenli mi?", "HF'm 1.2'ye düşerse?", "Hangi asset daha az riskli?".
- Görsel risk vurgusu: öneri içindeki HF/likidasyon değerleri HealthFactorBadge ile.
- "Not financial advice / testnet" kalıcı altbilgi.
- Loading/stream/empty/error durumları (Prompt 19); auth gerekiyorsa "sign in" yönlendirmesi.
- Erişilebilirlik: canlı bölge (aria-live) streaming için.

KABUL KRİTERLERİ (Done-when):
- Chat streaming çalışıyor; tool çağrıları ve sonuçları kullanıcıya görünür.
- Sayfa bağlamı otomatik enjekte ediliyor (örn. Open Position'dan gelen leverage).
- Öneri kartı risk + tavsiye-değil çerçevesini gösteriyor.

DOĞRULAMA:
- Dev'de CopilotPanel'i aç, bir hızlı soru sor; streaming + tool kartlarının render olduğunu ve önerinin gerçek HF verisini yansıttığını göster.
```

```text
### PROMPT 27 — Risk Radar: Monte Carlo web worker + HF heatmap
Faz: 5   |   Bağımlılık: Prompt 13/18 (HF/projeksiyon), Prompt 23 (Dashboard drawer)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Pozisyon için ileriye dönük likidasyon riskini Monte Carlo simülasyonuyla (web worker'da) hesaplayıp HF projeksiyonu + likidasyon olasılığı heatmap'i olarak gösteren Risk Radar'ı üret.

BAĞLAM: Risk Radar katmanı: HF'yi öne projeksiyonlayan grafik + uyarı. Ağır hesap UI thread'i bloklamamalı → web worker. Monte Carlo: fiyat süreçleri (örn. GBM, oracle volatilitesinden kalibre) altında N senaryo → her gün/horizon için HF dağılımı ve likidasyon olasılığı. Prompt 13 HF/likidasyon mantığını kullanır. Simulator sayfası (Prompt 28) görselleştirmeyi paylaşır.

YAPILACAKLAR:
- packages/sdk veya apps/web: monteCarlo web worker — girdi (pozisyon, horizon gün, path sayısı, volatilite/drift varsayımı), çıktı her horizon adımı için HF P10/P50/P90 + kümülatif likidasyon olasılığı. project_hf/liquidation_price (Prompt 13/18) ile tutarlı.
- Volatilite kalibrasyonu: oracle/asset için makul testnet varsayımı (gerçek vol verisi yoksa parametre + "varsayım" etiketi, # DOĞRULA).
- Risk Radar bileşeni (Dashboard drawer'a entegre): HF fan grafiği (P10/P50/P90 bandı) + likidasyon eşiği çizgisi + "X gün içinde likidasyon olasılığı %Y" özeti.
- HF heatmap: leverage × fiyat-şoku ızgarasında likidasyon olasılığı renk haritası (design-system HF renkleri).
- Performans: worker, debounce, iptal edilebilir hesap; büyük path sayısında UI akıcı.
- Uyarılar: yüksek likidasyon olasılığında belirgin uyarı + "testnet/varsayımsal".

KABUL KRİTERLERİ (Done-when):
- Monte Carlo worker'da çalışıyor, UI bloklanmıyor (binlerce path akıcı).
- HF fan grafiği + likidasyon olasılığı + heatmap doğru ve Prompt 13 mantığıyla tutarlı.
- Varsayımlar (volatilite) açıkça etiketli.

DOĞRULAMA:
- Dashboard drawer'da Risk Radar'ı aç; path sayısını artırınca UI'nin donmadığını göster; bir senaryoda likidasyon olasılığının leverage arttıkça yükseldiğini doğrula.
```

```text
### PROMPT 28 — Simulator sayfası: visx ile P10/P50/P90 senaryo dağılımı
Faz: 5   |   Bağımlılık: Prompt 27 (Monte Carlo worker)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: "X varlık, Yx kaldıraç, Z gün" girdileriyle getiri/HF dağılımını visx ile zengin görselleştiren bağımsız bir Simulator sayfası üret (eğitim + demo etkisi).

BAĞLAM: Monte Carlo worker (Prompt 27) hazır ve yeniden kullanılır. Simulator, pozisyon açmadan "ya şöyle olsaydı" keşfi sunar; Copilot ve Open Position ile bağlanabilir. visx ile P10/P50/P90 dağılım, getiri histogramı, HF zaman bandı. Net "varsayımsal/testnet, tavsiye değil".

YAPILACAKLAR:
- Güncel doğrulama: npm'den visx paketlerini (@visx/*) güncel sürümleriyle doğrula ve pinle.
- apps/web/app/simulator/page.tsx: girdi paneli (asset, principal, leverage slider, horizon gün, volatilite varsayımı), "Run simulation" → Monte Carlo worker.
- visx görseller: (a) getiri/equity dağılımı (P10/P50/P90 fan + histogram), (b) HF zaman bandı + likidasyon eşiği, (c) likidasyon olasılığı özet kartı, (d) leverage duyarlılık eğrisi (leverage arttıkça beklenen getiri vs likidasyon olasılığı trade-off'u).
- Senaryo karşılaştırma: 2-3 leverage senaryosunu yan yana.
- Paylaşılabilirlik: senaryo URL state'i (searchParams — Promise, await); Leaderboard "strateji paylaşımı" ile bağ kurulabilir.
- "Open this position" CTA → Open Position wizard'a parametre taşır (Prompt 21).
- Varsayım/tavsiye-değil etiketleri belirgin.

KABUL KRİTERLERİ (Done-when):
- Simulator girdilerle Monte Carlo çalıştırıp visx P10/P50/P90 dağılımı + HF bandı + likidasyon olasılığını gösteriyor.
- Leverage trade-off görseli mantıklı (yüksek leverage → yüksek getiri + yüksek likidasyon olasılığı).
- Senaryo URL ile paylaşılabiliyor; "Open position" CTA parametreleri taşıyor.

DOĞRULAMA:
- Dev'de bir senaryo çalıştır, visx grafiklerinin render olduğunu ve leverage arttıkça likidasyon olasılığının yükseldiğini göster; URL'i kopyalayıp aynı senaryonun yüklendiğini doğrula.
```

```text
### PROMPT 29 — Auto-Rebalancer Keeper: cron/workflow + opt-in tetikleme
Faz: 5   |   Bağımlılık: Prompt 14 (keeper kontratı), Prompt 17/18 (auth/sdk), Prompt 23 (opt-in UI)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Opt-in vermiş pozisyonların HF'sini periyodik tarayıp eşik altına yaklaşanlarda keeper.rebalance'ı çağıran Vercel Cron tabanlı off-chain keeper servisini kur.

BAĞLAM: keeper kontratı (Prompt 14) opt-in + guard'lı rebalance sağlıyor; gerçek tetikleyici off-chain olmalı. Dashboard'dan opt-in (Prompt 23) veriliyor. Vercel Cron bir route'u periyodik çağırır; route opt-in listesini gezip HF<trigger olanlar için keeper hesabıyla tx gönderir. Güvenlik: keeper sadece kontrat guard'larının izin verdiğini yapabilir; off-chain servis yalnız tetikler.

YAPILACAKLAR:
- Güncel doğrulama: Vercel Cron yapılandırmasını (vercel.json crons / route) ve sunucu tarafı tx gönderim (keeper keypair env) yaklaşımını teyit et.
- apps/web/app/api/keeper/cron/route.ts: opt-in kayıtlarını oku (kontrat/keeper'dan ya da DB index), her biri için Blend'den güncel HF oku, trigger altındaysa keeper.rebalance(user) tx'i gönder (keeper keypair env), sonucu logla.
- vercel.json cron tanımı (örn. her 5-10 dk; Reflector Pulse 5 dk güncellemesiyle uyumlu).
- Eşzamanlılık/idempotency: aynı pozisyona çakışan rebalance'ı engelle (KV kilidi); başarısız tx retry/backoff.
- Gözlemlenebilirlik: rebalance log'u (eski/yeni HF), Dashboard'da "son otomatik rebalance" göstergesi.
- Güvenlik: cron route secret (CRON_SECRET) ile korunur; keeper keypair yalnız server; kontrat guard'ları nihai koruma.
- Opt-out: kullanıcı korumayı kapatabilir (kontrat + UI).

KABUL KRİTERLERİ (Done-when):
- Cron route opt-in pozisyonları tarayıp HF<trigger olanda gerçek rebalance tx'i gönderiyor (testnet).
- HF güvenliyken hiçbir işlem yapılmıyor (NoActionNeeded); cap aşılmıyor.
- Cron secret koruması ve keeper keypair gizliliği sağlanıyor; opt-out çalışıyor.

DOĞRULAMA:
- HF'si düşük bir test pozisyonu kurup cron route'u manuel tetikle; rebalance tx hash'i ve HF'nin target'a çıktığını göster; güvenli pozisyonda NoActionNeeded log'u; secret'sız çağrının reddedildiğini doğrula.
```

```text
### PROMPT 30 — Social Leaderboard: DB + anonim PnL sıralaması + strateji paylaşımı/follow
Faz: 5   |   Bağımlılık: Prompt 17 (auth), Prompt 18 (pozisyon/PnL), Prompt 28 (paylaşılır senaryo)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Anonim PnL sıralaması, strateji paylaşımı ve takip (follow) ile gamification sağlayan Social Leaderboard'u (DB + API + UI) kur.

BAĞLAM: Social Leaderboard katmanı: anonim PnL sıralaması + strateji paylaşımı. Auth (SEP-10) ile kimlik; mahremiyet için adresler anonim handle ile gösterilir (opt-in açık adres). PnL on-chain pozisyon + giriş fiyatından türetilir (testnet, tahmini). Simulator senaryoları "strateji" olarak paylaşılabilir. Bir veritabanı gerekir (Vercel Postgres/Neon veya benzeri).

YAPILACAKLAR:
- Güncel doğrulama: seçilen DB (Vercel Postgres/Neon) ve ORM (Drizzle/Prisma) güncel sürümlerini npm'den doğrula ve pinle.
- Şema: users (account, anonim handle, opt-in görünürlük), positions_snapshot (anonim PnL hesabı için), strategies (asset, leverage, horizon, paylaşan, açıklama), follows (follower→followed).
- API route'lar (auth korumalı yazma): leaderboard listesi (anonim handle + PnL% + leverage, sıralı, sayfalı), kendi profilin, strateji paylaş (Simulator/pozisyondan), follow/unfollow, takip akışı.
- PnL hesabı: pozisyon + entry fiyat + güncel oracle fiyatı → tahmini PnL%; "testnet/tahmini" etiketi; manipülasyona karşı sadece on-chain doğrulanabilir veriden türet.
- Mahremiyet: varsayılan anonim handle; kullanıcı açık adres göstermeyi opt-in seçebilir; hassas veri sızdırma yok.
- UI: Leaderboard sayfası (sıralama tablosu, kendi sıran vurgulu), strateji kartları ("copy to simulator/open position"), follow butonları, profil.
- Anti-abuse: rate-limit, kendi kendini follow engeli, paylaşılan strateji doğrulaması.

KABUL KRİTERLERİ (Done-when):
- Leaderboard anonim handle'larla PnL sıralaması gösteriyor; kullanıcı kendi sırasını görüyor.
- Strateji paylaşımı ve "copy to simulator/open" çalışıyor; follow/unfollow kalıcı.
- PnL yalnız on-chain türetilebilir veriden; mahremiyet varsayılan anonim.

DOĞRULAMA:
- İki test hesabıyla: pozisyon aç → leaderboard'da anonim PnL görün, strateji paylaş, diğer hesabı follow et; akışın ve sıralamanın DB'de kalıcı olduğunu göster.
```

---

## FAZ 6 — Cila & Deploy

```text
### PROMPT 31 — PWA + Web Push (VAPID) likidasyon uyarıları
Faz: 6   |   Bağımlılık: Prompt 13/29 (HF/keeper), Prompt 23 (pozisyonlar)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Uygulamayı yüklenebilir bir PWA'ya dönüştür ve Web Push (VAPID) ile likidasyon/HF-eşik uyarılarını kullanıcının telefonuna gönder.

BAĞLAM: PWA + Web Push katmanı: likidasyon uyarısı telefona düşer. Keeper cron (Prompt 29) zaten HF'yi tarıyor; aynı/komşu servis eşik aşımında push gönderebilir. Next.js 16 PWA (manifest + service worker), Web Push API + VAPID anahtarları. iOS Safari PWA push kısıtlarını gözet.

YAPILACAKLAR:
- Güncel doğrulama: web-push (Node) kütüphanesi ve Next.js 16 ile service worker/manifest yaklaşımını teyit et; VAPID anahtarı üret (env'e, public/private ayrımı).
- PWA: manifest.webmanifest (ikonlar, tema renkleri — cosmic, display standalone), service worker (offline shell + push handler), "Install app" promtu.
- Push abonelik akışı: kullanıcı izin ister → PushSubscription'ı /api/push/subscribe ile DB'ye kaydet (Prompt 30 DB'si); opt-out.
- Uyarı tetikleme: keeper cron / HF tarayıcı (Prompt 29) eşik aşımında ilgili kullanıcının subscription'ına web-push ile bildirim (likidasyon yakın, HF düştü, otomatik rebalance yapıldı).
- Bildirim içeriği: pozisyon, HF, aksiyon CTA (uygulamayı aç). Sıklık sınırı (spam önleme).
- Güvenlik: VAPID private yalnız server; subscription doğrulama; izin reddi zarif ele alınır.
- iOS notu: standalone PWA gereksinimi + sınırlamalar # DOĞRULA.

KABUL KRİTERLERİ (Done-when):
- Uygulama PWA olarak yüklenebiliyor (manifest + SW geçerli, Lighthouse PWA yeşil).
- Push aboneliği kaydediliyor; HF eşiği aşıldığında gerçek push bildirimi geliyor.
- VAPID private sızmıyor; opt-out çalışıyor.

DOĞRULAMA:
- Cihaz/emülatörde PWA yükle, push izni ver; HF düşük test senaryosunu tetikleyip bildirimin geldiğini göster; Lighthouse PWA denetimi.
```

```text
### PROMPT 32 — Skeleton/Suspense/Error boundary + microinteractions
Faz: 6   |   Bağımlılık: Faz 4-5 tüm sayfalar

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Tüm ana akışlara tutarlı yükleme (skeleton/Suspense), hata sınırları ve Framer Motion microinteraction'ları ekleyerek demo-kalite cila uygula.

BAĞLAM: Landing, Open Position, Dashboard, Simulator, Copilot, Leaderboard hazır ama cila eksik. Next.js 16 Cache Components + Suspense, React 19.2 (View Transitions, <Activity/>) kullanılabilir. Amaç: hiçbir ekranda boş/zıplayan/donuk an olmaması; demo akıcılığı.

YAPILACAKLAR:
- Güncel doğrulama: React 19.2 View Transitions / <Activity/> ve Next.js 16 Suspense/loading.tsx desenlerini teyit et.
- Her route segmenti için loading.tsx + Suspense sınırları; packages/ui'de Skeleton bileşenleri (tablo, kart, grafik iskeletleri) — cosmic tema.
- error.tsx ve global-error: Prompt 19 normalize edilmiş hatalarla; "tekrar dene" + güvenli fallback; grafik/worker hatalarında izole boundary.
- Microinteractions (Framer Motion): buton hover/press, kart giriş stagger, sayfa geçişi (View Transitions), HF/sayı değer geçiş animasyonu (count-up, tabular-nums), slider canlı geri bildirim, başarı/onay animasyonları (tx success).
- Boş durumlar: her liste/sayfa için anlamlı empty state + CTA.
- Performans: animasyonlar reduce-motion'a saygılı (a11y); ağır grafiklerde layout shift yok.

KABUL KRİTERLERİ (Done-when):
- Tüm ana route'larda skeleton/Suspense ve error boundary var; ağ yavaşlatıldığında zarif yükleme.
- Microinteraction'lar tutarlı; tx success/HF değişimi akıcı animasyonlu.
- prefers-reduced-motion'da animasyonlar sönümleniyor.

DOĞRULAMA:
- DevTools'ta ağı yavaşlatıp her sayfada skeleton→içerik geçişini göster; bir hata enjekte edip error boundary'nin yakaladığını; reduce-motion açıkken animasyonların kapandığını doğrula.
```

```text
### PROMPT 33 — Accessibility + Lighthouse pass (a11y, performans, SEO, best practices)
Faz: 6   |   Bağımlılık: Prompt 32 (cila)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Tüm ana sayfaları WCAG AA erişilebilirlik ve yüksek Lighthouse skorlarına (performans/a11y/best practices/SEO) ulaştır; ölçülebilir kanıtla.

BAĞLAM: UI cilalı (Prompt 32). Cosmic koyu tema kontrastı, klavye navigasyonu, ekran okuyucu, grafik/worker erişilebilirliği denetlenmeli. Next.js 16 performans (Cache Components, bundle) optimize edilmeli. Demo ve jüri için ölçülebilir kalite işareti.

YAPILACAKLAR:
- Erişilebilirlik denetimi + düzeltme: tüm interaktifler klavye-erişilebilir, focus-visible, aria etiketleri/roller, form etiketleri, canlı bölgeler (Copilot stream, tx durumu), grafiklere metin alternatifi/özet, renk kontrastı AA (özellikle HF renkleri + ikon/etiket redundansı), heading hiyerarşisi, skip-link.
- Performans: bundle analizi, ağır kütüphanelerin (visx/Recharts/AI) code-splitting/lazy, görsel optimizasyonu (next/image), Cache Components ile statik kabuk, font yükleme, LCP/CLS/INP iyileştirme.
- SEO/meta: her sayfa metadata (title/description/OG), manifest, robots; landing OG görseli.
- Best practices: konsol hatasız, güvenli başlıklar, https varsayımı, no mixed content.
- Otomatik a11y testi (örn. axe) CI'a eklenebilir; manuel klavye/SR turu.
- "Unaudited/testnet" ibarelerinin a11y'de de okunur olması.

KABUL KRİTERLERİ (Done-when):
- Landing ve Dashboard Lighthouse: Performance/Accessibility/Best Practices/SEO her biri yüksek (hedef ≥90; a11y 100'e yakın).
- Klavye-only ile tüm ana akışlar tamamlanabiliyor; SR ile anlamlı.
- axe denetimi kritik ihlal vermiyor.

DOĞRULAMA:
- `lighthouse` (CI veya CLI) çıktısı: ana sayfalar için skor tablosu ekran görüntüsü/JSON; axe raporu temiz; klavye-only akış kaydı/notu.
```

```text
### PROMPT 34 — Vercel deploy (env push, cron, preview→prod) + demo seed + jüri notu
Faz: 6   |   Bağımlılık: Tüm önceki promptlar (özellikle 15 contracts, 24 faucet, 29 cron, 30 DB, 31 push)

ÖN-KOŞUL (her seferinde): Başlamadan ./CLAUDE.md ve ./STELLAR_STACK.md OKU.
- STELLAR_STACK.md = tek doğruluk kaynağı; çelişkide eğitim verine değil ONA uy.
- CLAUDE.md ilkeleri: empirik ol, uydurma yok, sadece testnet, yıkıcı işlem yok.
- Sürüm/API/adresi kullanmadan canlı doğrula + pinle; bitince build/test → çıktıyı oku.

HEDEF: Helios'u Vercel'e production deploy et: tüm env değişkenleri push'lu, cron'lar aktif, DB/KV bağlı, preview→prod akışı çalışır; demo için seed data ve jüri notu hazır.

BAĞLAM: Tüm özellikler ve testnet kontratları (Prompt 15) hazır. Deploy Vercel. Sırlar: server-only (SIGNING_KEY, JWT_SECRET, keeper keypair, admin faucet keypair, VAPID private, AI key, DB/KV) — asla client'a. Cron (Prompt 29), KV (Prompt 24/29), DB (Prompt 30), Push (Prompt 31) prod'da bağlanmalı. Demo'nun pürüzsüz olması için seed data ve net jüri yönergesi.

YAPILACAKLAR:
- Güncel doğrulama: Vercel proje ayarları, env scope (production/preview), cron, KV/Postgres entegrasyonlarını teyit et.
- Vercel projesi: monorepo (apps/web root), build/install komutları (pnpm + turbo), Node sürümü pinli.
- Env push: tüm gerekli değişkenler (public NEXT_PUBLIC_* contract adresleri/RPC + server-only sırlar) production+preview scope'larına; addresses.json/.env.testnet ile tutarlı; client'a yalnız public değerler.
- Entegrasyonlar: Vercel KV, Postgres/Neon, Cron (vercel.json), CRON_SECRET; AI/Anthropic key; VAPID.
- Preview→prod akışı: PR preview deploy testnet ile çalışır; prod promote.
- Demo seed: birkaç örnek pozisyon/strateji/leaderboard girdisi (testnet); faucet hazır; "demo hesabı" senaryosu.
- Son güvenlik/dürüstlük geçişi: site genelinde "Unaudited · Testnet only · Not financial advice" görünür; hiçbir mainnet ipucu yok; sırların client bundle'da olmadığını doğrula.
- JÜRİ NOTU (JURY.md / landing'de): ne yaptığımız, mimari özet (atomik tek-tx flash döngüsü + 7 katman), nasıl denenir (faucet→open→dashboard→copilot), bilinen sınırlar (testnet/unaudited), Prompt 1'deki 90sn demo akışına atıf.

KABUL KRİTERLERİ (Done-when):
- Prod URL canlı; landing→faucet→open position→dashboard→copilot→leaderboard uçtan uca testnet'te çalışıyor.
- Cron prod'da çalışıyor (rebalance/push tetikleniyor); DB/KV bağlı.
- Sırlar client bundle'da YOK (doğrulanmış); tüm "testnet/unaudited/not financial advice" ibareleri görünür.
- JURY.md hazır; demo seed mevcut.

DOĞRULAMA:
- Prod URL'de tam demo akışını çalıştır (tx hash'leri testnet explorer'da); cron'un prod log'unda tetiklendiğini göster; client bundle'da hiçbir secret olmadığını (build çıktısı taraması) doğrula; Lighthouse prod skorları.
```

---

## Özet

- **Toplam prompt sayısı:** 34
- **Faz dağılımı:**
  - Faz 0 — Vizyon & Tasarım Sistemi: **3** (PROMPT 1–3)
  - Faz 1 — Repo & Tooling: **3** (PROMPT 4–6)
  - Faz 2 — Soroban Kontratları: **9** (PROMPT 7–15)
  - Faz 3 — Wallet & Auth & Core SDK: **4** (PROMPT 16–19)
  - Faz 4 — Ana Akışlar: **5** (PROMPT 20–24)
  - Faz 5 — Hackathon Silahları: **6** (PROMPT 25–30)
  - Faz 6 — Cila & Deploy: **4** (PROMPT 31–34)

Her prompt tek bir oturumda bitirilebilecek atomik bir iş tanımlar, bir öncekinin çıktısına açıkça yaslanır (Bağımlılık satırı), her implementasyon promptu "güncel sürümü crates.io/npm'den doğrula ve pinle" adımıyla başlar ve her biri storage layout / public fn / events / typed error / test (kontratlar) veya doğrulanabilir UI/komut çıktısı (frontend) gibi ölçülebilir KABUL KRİTERLERİ ve DOĞRULAMA içerir. Tüm haritada testnet-only, unaudited ve "not financial advice" ilkeleri korunur; bilinmeyen adres/parametreler için `# DOĞRULA` placeholder'ları bırakılır.

---

## AUDIT 2026-05-31 — Canlı Doğrulama, Mimari Sadeleştirme & Çözülmüş Kararlar

> **OKU: Bu bölüm yukarıdaki orijinal PROMPT metinlerini override eder.** PROMPT 1-34 orijinal hâliyle bağlam için korundu; ancak aşağıdaki düzeltmeler ve kararlar **bağlayıcıdır**. Çelişkide: `AUDIT 2026-05-31 > orijinal PROMPT metni`.
>
> Tüm bulgular **2026-05-31'de canlı kaynaktan** doğrulandı; her madde URL'li.

### 0. Etkilenen PROMPT'lar — hızlı index

| PROMPT | Değişiklik tipi | Audit § |
|---|---|---|
| 5 | `next lint` kaldırıldı — ESLint doğrudan | §3.6 |
| 7 | Workspace member'lar değişti (flash_lender düştü) | §1.1, §1.2 |
| **8** | **OBSOLET / yeniden yorumlandı** — Blend'in `flash_loan` fn'i kullanılır | **§1.2** |
| 9 | Vault iskeleti değişti — OZ vault `stellar-tokens/vault` altında; Blend zaten pozisyon tutuyor | §1.3, §1.4 |
| 10 | SEP-40 imzaları + Pulse feed mapping kesinleşti | §1.5, §2.2 |
| 11 | Blend `submit/flash_loan` + `Request`/`RequestType` enum + `FlashLoan` struct sabitlendi | §1.2 |
| 12 | `strategy_router` çok daha ince — Request vec kurar + `pool.flash_loan` çağırır | §1.2 |
| 13 | HF Blend `get_positions` + Reflector fiyatından okunur (formül değil, kaynak) | §1.5 |
| 14 | Keeper opt-in: on-chain registry + off-chain Neon mirror (cron enum) | §2.3 |
| 15 | Mock SEP-41 token deploy (USDC/wBTC/wETH) eklendi; flash_lender deploy'u düştü | §2.1 |
| 17 | `middleware.ts` → **`proxy.ts`** (Node.js runtime); auth pattern güncel | §3.1 |
| 20 | Cache Components: `cacheLife` profile + `cacheTag` — sınırlar netleşti | §3.2 |
| 22 | Tx success sonrası `updateTag('helios-position-{address}')` | §3.3 |
| 24 | "Vercel KV" → **Upstash Redis via Vercel Marketplace** (`vercel install upstash`) | §3.4 |
| 25 | Anthropic prompt caching: system + tools ephemeral cache | §3.5 |
| 27 | Reflector `prices(asset, records)` ile volatilite kalibrasyonu | §1.5, §2.5 |
| 29 | KV → Upstash Redis; opt-in DB mirror (Neon) | §3.4, §2.3 |
| 30 | DB seçimi: **Neon Postgres via Marketplace** (`vercel install neon`), ORM Drizzle | §3.4 |
| 34 | Marketplace integration komutları + env Push | §3.4 |

---

### 1. Soroban / Stellar — canlı doğrulanan API'ler

#### 1.1 Mimari sadeleşmesi (kritik) — Blend v2 zaten flash loan + batch ops sağlıyor

**Kaynak:** `github.com/blend-capital/blend-contracts-v2/blob/main/pool/src/contract.rs` (raw fetched 2026-05-31).

Pool kontratının public fonksiyonlarından kritik olanlar:

```
fn submit(e, from, spender, to, requests: Vec<Request>) -> Positions
fn flash_loan(e, from, flash_loan: FlashLoan, requests: Vec<Request>) -> Positions
fn get_positions(e, address: Address) -> Positions
fn get_reserve(e, asset: Address) -> Reserve
fn get_config(e) -> PoolConfig
```

**Sonuç:** Helios'un **kendi `flash_lender` kontratı YAZILMAZ.** Pool'un `flash_loan` fn'i tek atomik tx'te flash borç + Supply/Borrow/Repay/Withdraw zincirini halleder. Helios `strategy_router` kontratı, sadece `Vec<Request>` ve `FlashLoan` struct'ını kurar ve `pool.flash_loan(...)` çağırır — exec_op/callback chain yok.

> Kontrat sayısı: **4 → 2 (+1 opsiyonel).** `strategy_router` + `keeper` zorunlu; `helios_position_meta` (entry_price, leverage, opt-in) için ya küçük on-chain kontrat ya off-chain Neon kaydı (tercih: **off-chain**, sadeleşme için).

#### 1.2 Blend v2 Request + RequestType + FlashLoan (canlı kaynak)

**Kaynak:** `github.com/blend-capital/blend-contracts-v2/blob/main/pool/src/pool/actions.rs`.

```rust
#[contracttype]
pub struct Request {
    pub request_type: u32,
    pub address: Address,
    pub amount: i128,
}

#[derive(PartialEq)]
#[repr(u32)]
pub enum RequestType {
    Supply              = 0,
    Withdraw            = 1,
    SupplyCollateral    = 2,
    WithdrawCollateral  = 3,
    Borrow              = 4,
    Repay               = 5,
    FillUserLiquidationAuction = 6,
    FillBadDebtAuction         = 7,
    FillInterestAuction        = 8,
    DeleteLiquidationAuction   = 9,
}

#[contracttype]
pub struct FlashLoan {
    pub contract: Address,
    pub asset: Address,
    pub amount: i128,
}
```

**Helios `open_position` örnek akış (`strategy_router` içinde):**
```
let flash = FlashLoan { contract: router.address(), asset: usdc, amount: flash_amount };
let requests = vec![
    Request { request_type: 2 /* SupplyCollateral */, address: usdc, amount: user_principal + flash_amount },
    Request { request_type: 4 /* Borrow */,           address: usdc, amount: flash_amount + blend_flash_fee },
];
pool_client.flash_loan(&user, &flash, &requests);  // tek tx, atomik
```

> **`from = user`**: user'ın `require_auth` propagate edilir; Helios router sadece çağrıyı kurar. Authorization minimum sürtünmeli.

#### 1.3 OpenZeppelin Stellar Contracts — vault konumu (düzeltme)

**Kaynak:** `docs.openzeppelin.com/stellar-contracts/tokens/vault/vault` + `github.com/OpenZeppelin/stellar-contracts/tree/main/packages`.

- STELLAR_STACK.md'de "OZ stellar-contract-utils → vault" YANLIŞTI.
- Doğru konum: **`stellar-tokens`** paketi (`packages/tokens/`), `Vault` trait'i.
- `stellar-contract-utils` (= crates.io adıyla `stellar-contract-utils 0.7.1`) sadece: `crypto`, `math`, `merkle_distributor`, `pausable`, `upgradeable` içerir. **Vault yoktur.**

#### 1.4 OZ Vault API (ERC-4626 muadili) — `FungibleVault` trait

**Kaynak:** `docs.openzeppelin.com/stellar-contracts/tokens/vault/vault` (2026-05-31).

```
trait FungibleVault {
    fn deposit(assets, receiver, from, operator)   -> i128 (shares)
    fn mint(shares, receiver, from, operator)      -> i128 (assets)
    fn withdraw(assets, receiver, owner, operator) -> i128 (shares burned)
    fn redeem(shares, receiver, owner, operator)   -> i128 (assets)
    fn preview_deposit / preview_mint / preview_withdraw / preview_redeem
    fn convert_to_shares / convert_to_assets
    fn query_asset() -> Address
    fn total_assets() -> i128
    fn max_deposit / max_mint / max_withdraw / max_redeem (user_address)
}
```

> **Per-asset:** OZ vault tek asset/tek share token. Helios için **kullanılmıyor** (PROMPT 9 yeniden yorumlanıyor — bkz. §2.1): Blend zaten `get_positions(user)` ile collateral + debt tutuyor, ayrı vault gerekmiyor. Position metadata off-chain Neon'da.

#### 1.5 Reflector V3 / SEP-40 — verified trait

**Kaynak:** `github.com/script3/sep-40-oracle/blob/main/sep-40/src/lib.rs`.

```rust
#[contractclient(name = "PriceFeedClient")]
pub trait PriceFeedTrait {
    fn base(env: Env)                                       -> Asset;
    fn assets(env: Env)                                     -> Vec<Asset>;
    fn decimals(env: Env)                                   -> u32;
    fn resolution(env: Env)                                 -> u32;            // saniye
    fn price(env: Env, asset: Asset, timestamp: u64)        -> Option<PriceData>;
    fn prices(env: Env, asset: Asset, records: u32)         -> Option<Vec<PriceData>>;  // GEÇMİŞ (vol kalibrasyonu)
    fn lastprice(env: Env, asset: Asset)                    -> Option<PriceData>;
}

#[contracttype] pub struct PriceData { pub price: i128, pub timestamp: u64 }

#[contracttype]
pub enum Asset {
    Stellar(Address),     // SAC kontrat adresi (XLM, USDC SAC)
    Other(Symbol),        // sembolik (BTC, ETH, EURUSD)
}
```

**`prices(asset, records)`** Monte Carlo volatilite kalibrasyonu için kritik — eski belirsizlik §B11 **çözüldü**.

#### 1.6 ⚠️ Blend oracle manipulation exploit ($10.8M, 2025) — risk yansıması

**Kaynak:** `medium.com/@cryip/10-8m-oracle-manipulation-exploit-on-stellars-blend-protocol-6bdcbb1568c0`.

Helios testnet-only olsa da bu olay tasarımı etkiler:
- **Oracle staleness check zorunlu** her HF okumasında (PROMPT 10/13/22'de). `timestamp` > 600 sn ise revert.
- **Sanity bounds** (price deviation guard) — `prices(asset, records=N)` ile son N noktanın TWAP'ını al, `|lastprice − TWAP| / TWAP > %30` ise revert.
- **Risk Radar / Open Position UI'da "Oracle risk" başlığı** — likidasyon riskinden ayrı olarak listele.
- **AI Copilot system prompt**: oracle riskini her yanıtta açıkça belirtmeli.

---

### 2. Mimari kararlar (B grubu — daha önce belirsizdi, şimdi sabitlendi)

#### 2.1 Test asset stratejisi (PROMPT 15, 24)

**Karar:** Helios deploy script'i mock SEP-41 token'ları kendi deploy eder:
- `mock_usdc` (decimals=7), admin = deployer
- `mock_wbtc` (decimals=8), admin = deployer  
- `mock_weth` (decimals=18), admin = deployer
- XLM: native (Stellar Asset Contract, deploy YOK — testnet'te zaten var).

Faucet (PROMPT 24): admin keypair ile `mint` çağırır (rate-limit'li). UI'da `MOCK · Testnet only` rozeti her token kartında.

> Canonical wBTC/wETH SAC adresi yok; mock kabul edilebilir tek pratik yol. PROMPT 15 deploy script'i bu token'ları Blend pool'una reserve olarak da ekler (admin set_reserve).

#### 2.2 Reflector Pulse → feed eşleşmesi (PROMPT 10)

| Helios `AssetId` | Reflector feed (testnet) | `Asset` varyantı |
|---|---|---|
| `USDC` | Stellar DEX (`CAVL...HLP`) | `Asset::Stellar(usdc_sac_address)` |
| `XLM` | Stellar DEX (`CAVL...HLP`) | `Asset::Stellar(xlm_native_sac)` |
| `wBTC` | External CEX & DEX (`CCYO...N63`) | `Asset::Other(symbol!("BTC"))` |
| `wETH` | External CEX & DEX (`CCYO...N63`) | `Asset::Other(symbol!("ETH"))` |

> `shared` crate'inde `asset_registry()` fn'i `AssetId → (feed_address, Asset)` döndürür. Tek yer, drift yok.

#### 2.3 Keeper opt-in enumeration (PROMPT 14, 29)

**Karar:** Hybrid model.

- **On-chain `keeper` kontratı = source of truth.** Opt-in `register_opt_in(user, trigger_hf, target_hf, max_deleverage_pct)` ile yazılır; her opt-in `opt_in_registered` event'ı yayar.
- **Off-chain Neon table `keeper_opt_ins`** mirror'lar. Bir indexer (cron veya webhook) `opt_in_registered` event'larını dinler ve tabloyu günceller.
- **Vercel Cron route** (PROMPT 29) Neon'dan `WHERE active = true` opt-in'leri çeker; her biri için on-chain Blend.`get_positions(user)` + HF hesaplar; trigger ise `keeper.rebalance(user)` çağırır.
- **Verification:** cron her rebalance'tan önce on-chain `keeper.is_opted_in(user)` ile teyit eder (Neon stale olabilir).

#### 2.4 Storage TTL stratejisi (PROMPT 7, 9, 14)

**Karar:** `shared::ttl` modülü, üç sabit:
- `PERSISTENT_TTL_BUMP_LOW = 30 days` (≈ 518400 ledgers @ 5s avg)
- `PERSISTENT_TTL_BUMP_HIGH = 60 days`
- `INSTANCE_TTL_BUMP_LOW = 7 days`
- `INSTANCE_TTL_BUMP_HIGH = 30 days`

Her write fn (open_position, close_position, register_opt_in, vb.) ilgili key için `env.storage().persistent().extend_ttl(key, LOW, HIGH)` çağırır. Instance data'yı admin manuel `bump_instance_ttl()` ile uzatır.

#### 2.5 Monte Carlo volatilite kalibrasyonu (PROMPT 27)

**Karar:** Reflector `prices(asset, records=288)` çağrısı → son 288 örnek (resolution=5dk varsayımıyla ≈24 saat) → log return → standart sapma → `sqrt(365*24*12) ile annualize`.

Veri yetersiz (Option::None veya len < 30) ise: sabit fallback `vol = 0.60` (yüksek, defensive) + UI'da "kalibrasyon başarısız, defensive fallback" etiketi. Her zaman "**varsayım · testnet veri**" disclaimer.

#### 2.6 Flash fee — Helios kendi fee'si YOK

**Karar:** Blend pool'unun kendi flash fee'si (PoolConfig'den okunur) tek maliyet. PROMPT 8'de geçen "Helios flash fee bps" konsepti **kaldırıldı**. Maliyet hesapları Blend pool fee'sini içerir.

---

### 3. Frontend / Vercel — güncel API'ler

#### 3.1 `middleware.ts` → `proxy.ts` (Next.js 16)

**Kaynak:** `nextjs.org/blog/next-16` (§ "`proxy.ts` (formerly `middleware.ts`)").

- Yeni dosya adı: **`proxy.ts`**, export fn `proxy(request: NextRequest)`.
- Çalışma zamanı: **Node.js runtime** (eski middleware.ts Edge'de kalır ama deprecated).
- Helios'ta `proxy.ts` kullanım alanları:
  - Auth gate'i: SEP-10 JWT cookie kontrolü, korumalı route prefix'leri (`/dashboard`, `/api/copilot`).
  - Network rozet eki (response header `x-stellar-network: testnet`).
- PROMPT 17 yeni dosya adıyla yazılır.

#### 3.2 Cache Components disiplini (PROMPT 20)

`next.config.ts` → `cacheComponents: true` (top-level, **`experimental.cacheComponents` DEĞİL**).

| Sayfa / komponent | Cache stratejisi | cacheLife | cacheTag |
|---|---|---|---|
| Landing hero, "How it works" | `"use cache"` | `'max'` | `'landing-static'` |
| Vault APY tablosu | `"use cache"` | `{ expire: 300 }` (5dk) | `'apy'` |
| Dashboard pozisyon listesi | **NO CACHE** (per-user dynamic) | — | — |
| Oracle fiyat (TanStack Query) | client-side, `staleTime: 30s` | — | — |
| AI Copilot stream | NO CACHE | — | — |
| Open Position canlı HF | NO CACHE (client compute) | — | — |
| Leaderboard sayfası | `"use cache"` | `{ expire: 60 }` | `'leaderboard'` |

#### 3.3 `updateTag()` / `refresh()` — yeni Server Actions API'leri

**Kaynak:** `nextjs.org/blog/next-16` § "Improved Caching APIs".

- Tx success sonrası (PROMPT 22, 23, 29):
  ```ts
  'use server';
  await sendTransaction(...);
  updateTag(`helios-position-${address}`);   // read-your-writes
  updateTag('apy');                          // kullanıcı pozisyon açtığında apy ekran yenilensin
  ```
- `refresh()` — pure uncached data refresh (Notification count vs).
- `revalidateTag(tag)` artık **deprecated single-arg**; `revalidateTag(tag, 'max')` veya `revalidateTag(tag, { expire: N })` formu kullanılır.

#### 3.4 Vercel Marketplace (eski Vercel KV / Postgres yok)

**Kaynak:** `vercel.com/docs/storage` (2026-05-06).

Vercel KV native ürün olarak **kaldırıldı**. Bugünkü yapı:
- **Blob** — file storage (Helios kullanmıyor).
- **Edge Config** — feature flags, çok az değişen runtime config (Helios opsiyonel).
- **Marketplace** — Postgres (Neon, Supabase), Redis (Upstash), NoSQL.

Helios kararları:
| İhtiyaç | Çözüm | CLI |
|---|---|---|
| Rate limit (faucet, AI, keeper lock) | **Upstash Redis** | `vercel install upstash` |
| DB (leaderboard, keeper opt-in mirror, push subscription) | **Neon Postgres** | `vercel install neon` |
| ORM | **Drizzle** | `npm i drizzle-orm drizzle-kit @neondatabase/serverless` |
| Cron tetikleyici (keeper, push) | **Vercel Cron** | `vercel.json` |

Env değişkenleri Marketplace tarafından **otomatik** inject edilir (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DATABASE_URL`).

#### 3.5 Anthropic prompt caching (PROMPT 25 — AI Copilot)

**Kaynak:** `ai-sdk.dev/providers/ai-sdk-providers/anthropic` (2026-05-31).

System prompt + tool tanımları kalıcı — her sohbet turunda yeniden gönderilmesi maliyetli. Cache breakpoint'leri:

```ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool } from 'ai';

const result = streamText({
  model: anthropic('claude-sonnet-4-6'),
  messages: [
    {
      role: 'system',
      content: HELIOS_SYSTEM_PROMPT,                    // uzun, sabit
      providerOptions: {
        anthropic: { cacheControl: { type: 'ephemeral', ttl: '1h' } },
      },
    },
    ...userMessages,
  ],
  tools: {
    getOraclePrice: tool({
      inputSchema: z.object({ asset: z.enum(['USDC','XLM','wBTC','wETH']) }),
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
      execute: async ({ asset }) => sdk.getOraclePrice(asset),
    }),
    // ... diğer read-only tool'lar
  },
});
```

**Beklenen maliyet etkisi:** uzun system prompt + tool tanımları cache'lendiği için her turun maliyeti büyük ölçüde sadece yeni user message + assistant output token'larına iner.

#### 3.6 `next lint` kaldırıldı (PROMPT 5)

**Kaynak:** `nextjs.org/blog/next-16` § "Removals".

- `next lint` komutu Next.js 16'da **kaldırıldı**.
- `next build` artık lint çalıştırmaz.
- PROMPT 5: ESLint'i doğrudan kullan (`eslint .` veya `eslint --fix .`), `@next/eslint-plugin-next` Flat Config formatında.
- Turbo pipeline: `"lint": { "command": "eslint ." }` workspace-bazlı.

---

### 4. Pin doğrulamaları (2026-05-31 — değişmedi, doğrulandı)

STELLAR_STACK.md'de pinlenmiş sürümler bu denetimde tekrar canlı kaynakla teyit edildi; düzeltme yok:
- `soroban-sdk 26.0.1`, `stellar-cli 26.1.0` (crates.io)
- `blend-contract-sdk 2.25.0`, `@blend-capital/blend-sdk 3.2.2` (canlı kullanım §1.2'de doğrulandı)
- `@stellar/stellar-sdk 15.1.0`, `@stellar/freighter-api 6.0.1`, `@creit.tech/stellar-wallets-kit 2.2.0`
- `next 16.2.6`, `ai 6.0.193`, `@ai-sdk/anthropic 3.0.81`
- OZ Stellar Contracts 0.7.1 (path düzeltildi: vault → `stellar-tokens/vault`)

---

### 5. Kapsam dışı bırakılan / sonraki tur

Aşağıdaki maddeler bu denetimde çözümlenmedi, **PROMPT 7+ implementasyonu sırasında okumadan başlama**:
- `stellar contract bindings typescript` çıktısının exact shape'i (PROMPT 18'de live görülecek).
- Blend pool'unun max position sayısı (`max_positions: u32` `update_pool` parametresi) — testnet pool'unun değeri deploy anında okunmalı.
- Blend `Positions` struct'ının exact alanları (collateral_amount, debt_amount per asset) — `pool/src/storage.rs` PROMPT 11'de okunmalı.
- Bad debt / Liquidation auction akışları (Blend'de auction kontratı var) — Helios MVP kapsam dışı, sadece risk dilinde belirt.
- Reflector `resolution()` testnet feed'lerinde gerçek değer (5dk varsayımı — kontrattan oku) — PROMPT 10'da `oracle.resolution()` çağrısıyla teyit.

> Bu maddeler `MEMORY/helios-known-unknowns.md`'de güncel kalır; PROMPT 7+ başlarken kontrol et.

---

## AUDIT 2026-06-02 — Açık Kararların Çözümü (Faz 4 öncesi denetim)

> **OKU: Bu bölüm AUDIT 2026-05-31 ve orijinal PROMPT'ları override eder.** Çelişkide öncelik: `AUDIT 2026-06-02 > AUDIT 2026-05-31 > orijinal PROMPT > STELLAR_STACK.md`.
>
> İkinci denetimde (PROMPT 1-22 implementasyonu canlı incelendi) 6 yapısal açık tespit edildi; aşağıda **bağlayıcı kararlarla** kapatıldı. Çözülmemiş tek ürün kararı **§6.3 (single vs cross-asset)** — kullanıcı onayı bekler ama varsayılan bağlandı.

### 6.0 Etkilenen PROMPT index

| PROMPT | Değişiklik | §  |
|---|---|---|
| 11 | Helios **kendi Blend pool'unu factory ile deploy eder** (resmî pool admin yetkimiz yok) | §6.1 |
| 15 | `deploy_pool` + `set_reserve` (XLM + mock USDC/wBTC/wETH) + backstop seed + oracle bind + **keeper Friendbot fonlama** | §6.1, §6.5 |
| 18 | `usePosition` **hydration sözleşmesi**: on-chain Blend (otoriter) + Neon meta (best-effort) + leverage fallback | §6.2, §6.4 |
| 19.5 (YENİ) | **Neon + Drizzle kurulumu Faz 4'e çekildi** (PROMPT 30 değil) | §6.2 |
| 22 | Pozisyon DB yazımı **frontend Server Action DEĞİL** → optimistic UI + indexer otoriter; oracle guard notu | §6.2, §6.6 |
| 23 | Dashboard birleştirilmiş (Blend + Neon) pozisyon okur, indexer-lag fallback gösterir | §6.2, §6.4 |
| 24 | Mock token'lar **bizim pool'umuza** reserve eklenir (artık yetki sorunu yok) | §6.1 |
| 29 | Keeper cron + **pozisyon event indexer aynı route** (`getEvents` cursor → Neon upsert) + keeper bakiye guard | §6.2, §6.5 |
| 30 | Neon şeması §6.2'de erken kuruldu; burada yalnız leaderboard tabloları kalır | §6.2 |

---

### 6.1 Blend pool yetki paradoksu — KARAR: resmî pool (Path B)

> **GÜNCELLEME 2026-06-02 (canlı testnet doğrulaması) — PATH B SEÇİLDİ.** Resmî `TestnetV2` pool (`CCEBVDYM…`) read-only sorgulandı:
> - `get_admin` = `GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56` → **biz değiliz** (paradoks gerçek, reserve ekleyemeyiz).
> - **AMA** `get_reserve_list` = pool zaten **4 asset destekliyor** ve `get_config.status = 0` (**aktif**, borrow açık), `oracle = CAZOKR2Y5E2OSWSIBRVZMJ47RUTQPIGVWSAQ2UISGAVC46XKPGDG5PKI`, `max_positions = 8`.
>
> | Reserve adresi | symbol |
> |---|---|
> | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | native (XLM) |
> | `CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU` | USDC |
> | `CAP5AMC2OHNVREO66DFIN6DHJMPOBAJ2KCDDIMFBR7WWJH5RZBFM3UEI` | wBTC |
> | `CAZAQB3D7KSLSNOSQKYD2V4JP5V2Y3B4RDJZRLBFCCIXDCTE3WHSY3UE` | wETH |
>
> **KARAR (override eder, aşağıdaki "kendi pool" planı artık FALLBACK):** Demo **resmî pool + bu 4 asset + pool'un oracle'ı (`CAZOKR2Y…`)** ile yapılır.
> - Kendi pool / mock token / backstop seed **GEREKMEZ** → backstop aktivasyonu # DOĞRULA'sı **moot**.
> - `addresses.json.tokens`: yukarıdaki 4 adres yazılır (artık null değil).
> - `addresses.json.reflector` yerine HF tutarlılığı için Helios oracle okumaları **pool'un oracle'ı `CAZOKR2Y…`** üzerinden yapılır (Blend'in iç HF'siyle aynı kaynak → wizard/dashboard HF'si Blend ile tutarlı).
> - **Faucet (PROMPT 24):** XLM → Friendbot. USDC/wBTC/wETH → bu resmî test token'larının `mint` fn'i public mi # DOĞRULA; değilse alternatif fonlama (örn. başka bir testnet faucet ya da pre-funded dağıtıcı) PROMPT 24'te netleşir. Bu, demo akışının TEK kalan açığı — ama PROMPT 22'nin kod/build/imza akışını bloklamaz.
> - **mock↔Reflector çelişkisi (eski belirsizlik) çözüldü:** resmî asset'ler zaten pool oracle'ında fiyatlı.
>
> Aşağıdaki "factory ile kendi pool" planı yalnız resmî pool reset olursa / asset değişirse devreye girecek **yedek**tir.

**Sorun (doğrulandı):** AUDIT §2.1 "mock token'ları Blend pool'una reserve ekle (admin `set_reserve`)" diyor; ama `addresses.json` resmî `TestnetV2` pool'unu (`CCEBVDYM…`) kullanıyor — o pool'un **admin'i biz değiliz**, reserve ekleyemeyiz. PROMPT 24 faucet + tüm vault akışı bu yüzden çıkmazda.

**Karar:** Helios, Blend `pool_factory` üzerinden **kendi pool instance'ını deploy eder**. Factory ile pool oluşturmak Blend'in **izinsiz (permissionless) tasarım deseni**dir → deploy eden admin olur. Bu **§1.1 ile çelişmez**: `blend-contracts-v2` kodunu YENİDEN deploy etmiyoruz; mevcut factory'den bir pool **örnekliyoruz**.

**PROMPT 15 deploy script'i şunu yapar (sıra önemli):**
1. `pool_factory.deploy(admin, name, oracle=REFLECTOR, backstop_take_rate, max_positions)` → yeni `POOL_ID`
2. Mock SEP-41 token deploy: `mock_usdc`(7), `mock_wbtc`(8), `mock_weth`(18) + XLM native SAC id
3. Her asset için `pool.queue_set_reserve(asset, ReserveConfig{c_factor, l_factor, ...})` → `pool.set_reserve(asset)`
4. Backstop seed (aşağıdaki # DOĞRULA)
5. `addresses.json.blend.pool` = yeni `POOL_ID` (resmî `CCEBVDYM…` artık **referans değil**; sadece backstop/factory/emitter resmî kalır)

> **# DOĞRULA — backstop aktivasyonu (KRİTİK YOL):** Blend v2 pool'unda **borrow** (dolayısıyla `flash_loan` içindeki Borrow request) etkinleşmesi için backstop'un minimum threshold'a (BLND:USDC LP) ulaşması gerekebilir. Testnet adımları (`backstop.deposit` → threshold → `pool.set_status(active)`) **blend-utils deploy script'lerinden / Blend docs'tan teyit edilmeli**. Backstop aktif değilse PROMPT 22 testnet'te borrow'da revert eder. Bu, Faz 4'ün gerçek "yeşil mi" eşiğidir — PROMPT 15'te `pool.get_status()` ile teyit zorunlu.

> Mevcut `addresses.json` (resmî pool) **PROMPT 15 yeniden çalıştırılana kadar geçici geçersizdir**; SDK okuma hook'ları kendi pool'umuz deploy edilince doğru veri döndürür.

---

### 6.2 Pozisyon kalıcılığı + indexer — KARAR: event-driven, frontend değil

**Sorun (doğrulandı):** Roadmap "tx success → Neon insert (Server Action)" diyor. Kırılgan: tx onaylanıp kullanıcı sekmesi kapanırsa → Blend'de borç var ama Neon'da `entry_price/leverage` yok = **hayalet pozisyon**. Ayrıca Neon kurulumu PROMPT 30'da (Faz 5), ama yazım PROMPT 22'de (Faz 4) gerekiyor = **sıra çatışması**.

**Karar (3 parça):**

**a) Neon + Drizzle kurulumu Faz 4'e çekildi → PROMPT 19.5.** PROMPT 22'den ÖNCE çalışır. Şema (Drizzle):
```
helios_positions(
  id, account TEXT, asset TEXT,
  entry_price_i128 TEXT, leverage_bps INT,
  collateral_at_open TEXT, debt_at_open TEXT,
  opened_tx_hash TEXT, closed_tx_hash TEXT,
  status TEXT CHECK(status IN ('open','closed')),
  opened_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  UNIQUE(account, asset, opened_tx_hash)
)
keeper_opt_ins(...)  -- AUDIT §2.3 mirror (zaten planlı)
```

**b) Otoriter yazım = event indexer (frontend DEĞİL).** `strategy_router` zaten `posopen`/`posclose` event'ı yayıyor (PROMPT 12 ✓). PROMPT 29 cron route'u **hem keeper hem pozisyon** için tek indexer çalıştırır:
- Soroban RPC `getEvents(startLedger=cursor, filters=[router, keeper contractIds])` ile son event'leri çek
- `posopen` → `helios_positions` upsert (status=open); `posclose` → status=closed
- `opt_in_registered` → `keeper_opt_ins` upsert
- Cursor'u (son ledger) Neon/Upstash'te tut → idempotent

**c) PROMPT 22 davranışı:** tx success sonrası **optimistic UI** (TanStack Query setQueryData) + opsiyonel "hint" insert; ama **DB gerçeği indexer'dan gelir**. `updateTag('helios-position-{address}')` (AUDIT §3.3) yine çağrılır. Frontend insert başarısız olsa bile indexer reconcile eder → hayalet pozisyon olmaz.

---

### 6.3 Single-asset vs cross-asset — KARAR (varsayılan): single-asset MVP

**Sorun:** Kod sessizce `collateral_asset == debt_asset` seçti (PROMPT 12 ✓). Ama "leveraged yield" değer önerisi aslında cross-asset (USDC collateral → farklı asset borrow). Single-asset = aynı asset üzerinde recursive supply/borrow; getiri faydası sınırlı.

**Karar (varsayılan, kullanıcı override edebilir):** Demo kapsamı **single-asset MVP**. Cross-asset (DEX swap entegrasyonu) **demo sonrası**, kapsam dışı.

**Bağlayıcı dürüstlük kuralı:** Landing / wizard / jüri dilinde "**tek-asset leveraged loop (recursive supply/borrow)**" denir; "**leveraged yield across assets**" iddia EDİLMEZ. VISION.md elevator pitch buna göre yumuşatılmalı (PROMPT 1 metni cross-asset ima ediyor — UI kopyasında düzelt).

> ⚠️ **Kullanıcı kararı bekleniyor:** Bu tek "ürün" kararı. Cross-asset demo'ya girecekse strategy_router + wizard + DEX (Soroswap/Comet) entegrasyonu gerekir → +1 büyük faz. Onaylamazsan single-asset bağlı kalır.

---

### 6.4 SDK data hydration — KARAR: Blend otoriter + Neon meta + fallback

**Sorun:** Pozisyonun yarısı Blend'de (collateral/debt), yarısı Neon'da (entry_price/leverage). `usePosition` birleştirme mantığı tanımsızdı (PROMPT 18 placeholder).

**Karar — `usePosition(account)` sözleşmesi:**
```
1. on-chain: PoolUser.load(...) → collateral, debt, computeUserHfBps  [OTORİTER]
2. off-chain: GET /api/positions/{account} → Neon meta (entry_price, leverage_bps)  [BEST-EFFORT]
3. merge:
   - collateral/debt/HF her zaman on-chain'den
   - leverage_bps: Neon varsa Neon; YOKSA fallback = round(collateral / (collateral - debt))  (indexer-lag toleransı)
   - entry_price: Neon varsa göster; yoksa "—" + "meta yükleniyor" rozeti
   - status: on-chain debt>0 ise "open" (Neon ile teyit)
```
Dashboard (PROMPT 23) bu birleşik objeyi tüketir; Neon satırı eksikse pozisyon **yine görünür** (sadece entry_price/PnL "—"). Hayalet-yokluk garantisi §6.2(b) indexer'dan gelir.

---

### 6.5 Keeper gas/fee fonlaması — KARAR: deploy fonlama + cron bakiye guard

**Sorun:** Keeper keypair cron'da sürekli XLM tx fee öder; faucet (PROMPT 24) sadece son kullanıcıyı fonlar. Bakiye biterse cron sessizce patlar.

**Karar:**
- **PROMPT 15:** keeper keypair Friendbot ile fonlanır (şu an deployer=keeper olduğu için fonlu; **ayrı keeper keypair'e geçilirse fonlama script'e eklenir**).
- **PROMPT 29 cron route:** her çalışmada başta `keeper.balance < 5 XLM` ise → testnet'te Friendbot re-fund + `console.warn` log; prod'da bu bir alert olur. Bakiye guard geçilmeden rebalance denenmez.

---

### 6.6 Oracle güvenlik testleri + on-chain guard kapsamı

**Sorun:** AUDIT §1.6 TWAP %30 sapma + staleness 600s guard'ını ekledi; ama PROMPT 10/12 **Kabul Kriterleri metni güncellenmemişti** (test atlanabilirdi).

**Durum (doğrulandı):** İş **zaten yapıldı** — PROMPT 10 `guard.rs ensure_sanity`(%50→revert) + `ensure_fresh`(stale→revert) testleriyle yeşil, PROMPT 13 genişletti. Yani risk gerçekleşmedi (AUDIT bağlayıcıydı).

**Kalan düzeltme + bilinen sınır:**
- PROMPT 10/12 Kabul Kriterleri'ne **retroaktif madde**: "Oracle staleness (600s) + TWAP sapma (%30) revert testi yeşil."
- **# DOĞRULA — on-chain guard kapsamı:** `strategy_router.open_position` şu an `simple_hf_estimate` (Positions oranı) ile ön-kontrol yapıyor; Helios'un **kendi** `oracle::guard` çağrısını open_position kritik yolunda **çağırmıyor**. Staleness/sanity koruması şu an dolaylı olarak **Blend'in kendi oracle kontrolünden** geliyor. Helios'un TWAP %30 sanity bound'u on-chain enforce EDİLMİYOR. Testnet MVP için kabul edilebilir; jüri/risk dilinde dürüstçe belirtilmeli. İstenirse PROMPT 12 refactor'unda `oracle::guard::ensure_sanity` open_position'a eklenir.

---

### 6.7 Operasyonel — git yok (en yüksek demo-günü riski)

Repo **git deposu değil**. Sonuç: geri alma yok, Husky pre-commit tetiklenmiyor, Vercel deploy (PROMPT 34) git ister. **Aksiyon kullanıcıda**: `git init && git add . && git commit`. Faz 4 ilerledikçe biriken risk; PROMPT 34'ten önce zorunlu.

> Bu bölümdeki kararlar PROMPT 22+ başlarken §6.1 ve §6.2 öncelikli okunur.

---

### 6.8 ⚠️ KRİTİK DÜZELTME — Blend flash_loan `exec_op` callback ZORUNLU (AUDIT §1.1 yanlıştı)

> **AUDIT §1.1'deki "exec_op/callback chain YOK" iddiası YANLIŞTIR.** Canlı kaynak doğrulaması (2026-06-02, `blend-contracts-v2/main`): Blend v2 `pool.flash_loan`, alıcı kontratta **`exec_op` callback'ini ZORUNLU çağırır.** Helios `strategy_router`'da `exec_op` olmadığı için `open_position`/`close_position` **gerçek pool'da revert eder.** Mock testler (MockBlendPool callback'i implemente etmedi) bunu maskeledi → 82 yeşil test yanlış güven verdi.

**Kanıt (`pool/src/pool/submit.rs::execute_submit_with_flash_loan`):**
1. `TokenClient(flash.asset).transfer(pool, flash.contract, flash.amount)` — flash fonu **router'a** gider.
2. `FlashLoanClient::new(e, flash.contract).exec_op(&from, &flash.asset, &flash.amount, &0)` — **router'ın `exec_op`'u çağrılır.**
3. `requests` (Supply/Borrow/Repay/Withdraw) `from` için işlenir.
4. Sonda HF ≥ `1_0000100` (`validate_submit` / `PositionData::is_hf_under`).

**Referans receiver (`mocks/moderc3156/src/lib.rs`):**
```rust
pub fn exec_op(env: Env, caller: Address, token: Address, amount: i128, _fee: i128) {
    caller.require_auth();
    // ... (opsiyonel re-entrant)
    TokenClient::new(&env, &token).transfer(&env.current_contract_address(), &caller, &amount);
}
```
→ `exec_op` aldığı flash fonunu **`caller`'a (user) geri transfer eder**. Böylece `requests` içindeki `SupplyCollateral(principal + flash)` user'ın bakiyesinden (principal + yeni gelen flash) fonlanır.

**Allowance gereksinimi (`test-suites/tests/test_flashloan.rs`):** flash_loan ÖNCESİ user pool'a `token.approve(user, pool, amount, ttl)` vermeli — pool teminatı allowance ile çeker. Tek-op `open_position` tx'i bunu içermez.

**PROMPT 12-FIX (router) — bağlayıcı:**
1. `strategy_router`'a `exec_op(env, caller: Address, token: Address, amount: i128, fee: i128)` ekle → `TokenClient(token).transfer(current_contract, caller, amount)` (moderc3156 deseni). `caller == open_position'daki user` invariant'ını koru.
2. `simple_hf_estimate` post-check'i Blend'in kendi HF kontrolüyle (min 1.0000100) çakışmasın — Blend zaten reddediyorsa router guard'ı gevşet/uyumla.
3. Mock'u (MockBlendPool) `exec_op`'u **gerçekten çağıracak** şekilde düzelt (yoksa test yine yalan söyler) — VEYA gerçek pool'a karşı `test_flashloan.rs` benzeri fixture.
4. **# DOĞRULA — allowance/auth:** `open_position` tx'inin user→pool token allowance'ını nasıl sağladığını belirle: ya (a) tx'e `approve` operasyonu/auth entry eklenir, ya (b) Wallets Kit imzası simulate sırasında gerekli auth entry'leri üretir. Canlı simulate ile teyit et.
5. Redeploy (PROMPT 15) → `addresses.json.helios.strategy_router` yeni ID; SDK/UI (PROMPT 22) değişmez.

**Sıralama kararı:** Bu fix gerçek pool'da **canlı simulate ile yeşil olmadan** PROMPT 23+ (Dashboard vd.) İLERLEMEZ. Çekirdek mekanik doğrulanmadan üstüne feature kurmak = birikmiş hata riski.
