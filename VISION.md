# VISION.md — Helios

> ⚠️ **Sadece TESTNET. Kod unaudited. Mainnet/gerçek para yok.**
> Helios bir hackathon/demo projesidir. Bu belge ürün vizyonunu, çekirdek mekaniği, jüri kriterleri haritasını ve 90 saniyelik demo akışını sabitler.
> Çelişkide tek doğruluk kaynağı: `STELLAR_STACK.md`.

---

## 1. Elevator pitch

Helios, Stellar/Soroban üzerinde **kaldıraçlı verim (leveraged yield)** stratejilerini tek tıkla, **AI rehberliğiyle** ve **risk şeffaflığıyla** sunan çoklu-varlık bir DeFi platformudur. Bugün Stellar DeFi'de kaldıraçlı pozisyon açmak için kullanıcı; lending protokolüne yatırır, ödünç alır, tekrar yatırır, döngüyü manuel kurar — her adımda gas, slipaj ve likidasyon riski biriktirir. Helios bu döngüyü **tek atomik Soroban işleminde** (flash borrow → collateral → borrow → flash repay) yaparak hem operasyonel sürtünmeyi ortadan kaldırır hem de Risk Radar + AI Copilot ile kullanıcıya pozisyonun gerçek riskini eğitim amaçlı, şeffaf biçimde gösterir. Hedef kitle: Stellar ekosistemine yeni gelen ama "kaldıraçlı yield" konseptini denemek isteyen testnet kullanıcıları ve hackathon jürisi.

---

## 2. Çekirdek mekanik — Atomik tek-tx flash-loan döngüsü

Helios'un teknik kalbi, kullanıcının seçtiği kaldıraç oranını (örn. 3x) tek bir Soroban işleminde kuran `strategy_router` kontratıdır. Akış:

1. **Flash borrow** — `flash_lender` kontratından hedef varlık (örn. USDC) ödünç alınır (anlık, teminatsız, aynı tx içinde geri ödenmeli).
2. **Deposit / Collateral** — Kullanıcının başlangıç teminatı + flash-borrowlanan miktar Helios `vault`'a yatırılır ve Blend pool'a teminat olarak supply edilir.
3. **Borrow** — Aynı tx içinde Blend pool'dan flash-borrow geri ödemesini karşılayacak miktar borçlanılır.
4. **Flash repay** — Borçlanan miktar `flash_lender`'a geri ödenir; tx başarılıysa kullanıcının kaldıraçlı net pozisyonu `vault`'ta açılmış olur. Herhangi bir adım fail ederse tüm tx revert eder → atomiklik garanti.

**Neden tek tx?** Soroban'da bir Stellar transaction'ı yalnızca **tek `InvokeHostFunctionOp`** içerebilir (kaynak: `STELLAR_STACK.md §3`). Bu yüzden tüm cross-contract çağrıları (flash_lender → vault → Blend pool → flash_lender) **tek bir `strategy_router` fn'i** içinde zincirlenir; aksi halde atomiklik kaybolur, kullanıcı yarı kurulmuş pozisyonla kalır. Bu mimari kısıt, Helios'un tasarım kararlarının çıpasıdır.

---

## 3. 7 Katman

1. **AI Strategy Copilot** — Vercel AI SDK v6 + Anthropic (`claude-sonnet-4-6`) ile çalışan sohbet arayüzü; kullanıcının risk iştahına göre uygun pool/kaldıraç önerir. "Yatırım tavsiyesi değildir, eğitim amaçlıdır" çerçevesinde kalır.
2. **Risk Radar** — Pozisyonun anlık Health Factor'ünü, likidasyon fiyatını ve buffer'ını Blend pool parametreleri + Reflector oracle fiyatlarından **okuyarak** görsel olarak sunar. Eşikler uydurulmaz; kontrattan gelir.
3. **Auto-Rebalancer (Keeper)** — `keeper` kontratı / off-chain worker; HF belirli bir bandın altına düştüğünde önceden onaylanmış sınırlar içinde de-leverage / partial unwind tetikler. Kullanıcı kuralı tanımlar, keeper uygular.
4. **Multi-Asset Vaults (USDC, XLM, wBTC, wETH)** — OpenZeppelin `stellar-contracts` 0.7.1 vault util'leri üstüne kurulu, SEP-41 token uyumlu vault'lar. Her varlık için ayrı Blend pool eşlemesi.
5. **Monte Carlo Simulator** — Pozisyon açılmadan önce, geçmiş Reflector fiyat verisi üstünde N senaryo koşturarak "X gün sonra likide olma olasılığı %Y" gibi olasılıksal risk göstergesi üretir. Eğitim amaçlı.
6. **Social Leaderboard** — Testnet kullanıcılarının (sadece public key kısaltması) gerçekleşmiş APR / net PnL / max drawdown metriklerine göre sıralandığı, gamification katmanı. Gerçek para yok.
7. **PWA + Web Push** — Next.js 16 App Router üstüne PWA; HF eşikleri kırıldığında veya keeper tetiklendiğinde Web Push ile kullanıcıya bildirim. Mobil-first deneyim.

---

## 4. Jüri kriterleri haritası

| Jüri kriteri | Helios'un karşılığı |
|---|---|
| **Teknik derinlik** | Tek-tx atomik flash-loan + Blend lending döngüsü, `strategy_router` kontratı, Reflector oracle entegrasyonu, OpenZeppelin vault utils üstüne SEP-41 vault'lar. |
| **İnovasyon** | Stellar/Soroban'da "tek tıkla kaldıraçlı verim" UX'i + AI Copilot + Monte Carlo olasılıksal risk göstergesi kombinasyonu. |
| **UX / Tasarım** | Open Position wizard'da canlı kaldıraç slider'ı ve gerçek-zamanlı Health Factor; Risk Radar görseli; PWA ile mobil deneyim; tek imza ile pozisyon. |
| **Tamamlanmışlık** | Wallet connect → faucet → pozisyon aç → dashboard → keeper → leaderboard uçtan uca testnet üzerinde çalışır; deploy script ve adresler `addresses.json`'da. |
| **Sunum / Demo** | 90 saniyelik senaryoda landing → connect → leverage → imza → dashboard → AI Copilot → leaderboard zinciri net gösterilir. |
| **Güvenlik & dürüstlük** | Testnet-only ve unaudited ibaresi UI'da; AI çıktısı "yatırım tavsiyesi değildir"; kaldıraç/likidasyon riski açıkça uyarılır; oracle decimals kontrattan okunur. |
| **Ekosisteme uyum** | Blend v2 pool'larını kullanır (kendi lending'ini yeniden yazmaz), Reflector SEP-40 oracle'a bağlanır, OZ `stellar-contracts` üstüne kurar — Stellar ekosistemini güçlendirir. |

---

## 5. 90 saniyelik demo senaryosu

| Süre | Sahne | Ekran / Özellik | Anlatı |
|---|---|---|---|
| **0 – 10 s** (10 sn) | Landing & hook | Landing page hero: "Leveraged yield on Stellar, in one signature." + canlı testnet APR örnekleri | "Helios; Stellar üzerinde AI rehberli, tek-tx kaldıraçlı verim. Sadece testnet." |
| **10 – 30 s** (20 sn) | Wallet connect + faucet | Header'da Stellar Wallets Kit modali → Freighter ile connect → "Get testnet USDC" butonu → Friendbot/faucet sonucu | "Freighter ile testnet'e bağlanıyorum, faucet'ten test USDC alıyorum." |
| **30 – 55 s** (25 sn) | Open Position wizard | Vault seç (USDC) → leverage slider 1x→3x → canlı **Health Factor** ve **likidasyon fiyatı** güncellenir → Monte Carlo özet kutusu | "3x kaldıraç seçiyorum; Risk Radar HF'yi ve likidasyon fiyatını canlı gösteriyor — Reflector'dan gelen fiyatla." |
| **55 – 75 s** (20 sn) | Tek imza → Dashboard | "Open Position" → Freighter tek imza popup → tx confirmed → Dashboard'a redirect → açılan pozisyon kartı + Risk Radar grafiği | "Tek imza, tek Soroban tx — flash-loan + Blend supply + borrow + flash repay atomik olarak gerçekleşti." |
| **75 – 90 s** (15 sn) | AI Copilot + Leaderboard kapanış | AI Copilot panelini aç: "Bu pozisyonun riski nedir?" → streaming yanıt → Leaderboard sekmesine geç → kullanıcının sıralamadaki yeri | "AI Copilot pozisyonu eğitim amaçlı yorumluyor; Leaderboard'da testnet kullanıcıları karşılaştırılıyor. Helios — testnet'te, jüriye hazır." |

**Toplam: 90 saniye** (10 + 20 + 25 + 20 + 15).

---

## 6. Dürüstlük ve güvenlik ilkeleri

- **Testnet-only.** Hiçbir akışta mainnet'e işlem gönderilmez; UI'da kalıcı "TESTNET" rozeti.
- **Unaudited.** Kontratlar denetimden geçmedi; "audited" iması yok. UI'da açık uyarı.
- **Kaldıraç & flash-loan riski.** Open Position akışında likidasyon eşiği, slipaj ve oracle riski net biçimde uyarılır; kullanıcı pozisyonu açmadan önce "Riskleri anladım" onay kutusu.
- **AI Copilot çerçevesi.** Tüm AI çıktıları "Bu bir yatırım tavsiyesi değildir, eğitim amaçlıdır" disclaimer'ı ile sarılır; sistem prompt'unda bu kısıt sabitlenir.
- **Oracle dürüstlüğü.** Reflector `decimals()` ve fiyatlar kontrattan okunur, sabit varsayılmaz (`STELLAR_STACK.md §4`).
- **Health Factor dürüstlüğü.** HF/likidasyon parametreleri Blend pool'dan okunur; Helios kendi formülünü dayatmaz.
- **Soroban kısıtlarına uyum.** Tek tx = tek `InvokeHostFunctionOp`, MEMO_NONE, muxed account yok; storage TTL/`extend_ttl` planlanır.
- **Adres dürüstlüğü.** Bilinmeyen kontrat adresi/parametre placeholder + `# DOĞRULA` notuyla; uydurma adres yok.
