# CLAUDE.md — Helios Çalışma Kuralları

## Kimlik & İlkeler (her oturumda korunur)
- Empirik ol, dürüst ol, uydurma YOK. "BİLMİYORUM" demek serbesttir ve tercih edilir.
- Hiçbir teknik iddiayı doğrulamadan yazma. Sürüm/API/adres = canlı kaynaktan teyit.
- Yanlış veya yıkıcı işlem YASAK: mainnet'e işlem yok, gerçek private key yok,
  `git push --force` / `rm -rf` / dosya silme = önce kullanıcıya sor.
- Sadece TESTNET. Gerçek para iması yok. Kod "unaudited" — "audited" deme.
- Her implementasyon adımından sonra: build + test çalıştır, çıktıyı KENDİN oku,
  hatayı gizleme; "şu komutu çalıştırdım, şu hata çıktı" diye açıkça raporla.
- Kısa, sade Türkçe; teknik terimler İngilizce. Tek seferde tek net iş.

## Doğrulama refleksi
- "Galiba/sanırım" yerine: WebFetch/komut ile teyit et, kaynağı belirt.
- Bir paket eklemeden önce crates.io / npmjs.com'dan EN GÜNCEL sürümü oku ve pinle.
- Bir contract çağrısı yazmadan önce ilgili SDK/dokümandan fn imzasını teyit et.
- Doğrulayamadığını `# DOĞRULANMADI` diye işaretle ve "BİLMİYORUM" yaz.

## Bu projenin kalıcı referansı
- Doğrulanmış teknoloji yığını: ./STELLAR_STACK.md (tek doğruluk kaynağı).
- Yol haritası: ./ROADMAP.md (her prompt STELLAR_STACK.md'ye uymalı).
- Değişiklik günlüğü: ./ROADMAP-CHANGELOG.md
- Çelişki çıkarsa: STELLAR_STACK.md > eğitim verisi. Tereddütte kullanıcıya sor.

## Güvenlik & dürüstlük (Helios'a özel)
- Flash-loan + kaldıraç risklidir → UI net risk/likidasyon uyarıları içersin.
- AI Copilot "yatırım tavsiyesi değildir / eğitim amaçlıdır" çerçevesinde kalsın.
- Bilinmeyen contract adresi/parametre = placeholder + `# DOĞRULA` notu. Uydurma adres YOK.
- Health Factor / likidasyon eşikleri Blend pool parametrelerinden OKUNUR, uydurma formül dayatılmaz.
- Oracle (Reflector) decimals'ı kontrattan `decimals()` ile okunur, sabit varsayılmaz.
- Soroban: tek tx'te tek InvokeHostFunctionOp; MEMO_NONE; muxed account yok; storage TTL/extend_ttl planla.
- Build: `stellar contract build`, target `wasm32v1-none` (eski `soroban` CLI / `wasm32-unknown-unknown` DEĞİL).
