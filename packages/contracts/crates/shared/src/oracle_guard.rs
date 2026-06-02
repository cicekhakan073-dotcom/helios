//! Oracle güvenlik sabitleri — Blend 2025 oracle manipulation ($10.8M) exploit
//! yansıması (AUDIT 2026-05-31 §1.6).
//!
//! Her HF okuması ve fiyat tüketimi öncesi PROMPT 10/13/22'de bu eşikler
//! uygulanır:
//!   - Staleness check: `now − price.timestamp > STALENESS_HARD_SECS` → revert.
//!   - Sanity bound: `|lastprice − TWAP(N)| / TWAP > PRICE_DEVIATION_BPS/10000`
//!     → revert.

/// Yumuşak eşik: UI "stale" rozeti gösterir; on-chain kontrol değil.
pub const ORACLE_STALENESS_WARN_SECS: u64 = 300; // 5 dakika

/// Sert eşik: bu süreden eski fiyat ile işlem reddedilir.
pub const ORACLE_STALENESS_HARD_SECS: u64 = 600; // 10 dakika

/// TWAP'tan max sapma — basis points. 3000 = %30.
/// Aşılırsa fiyat "manipüle edilmiş olabilir" diye reddedilir.
pub const ORACLE_PRICE_DEVIATION_BPS: u32 = 3000;

/// Reflector resolution varsayımı (PROMPT 10'da kontrattan teyit edilecek).
/// Şu an çoğu testnet feed'in 5 dakika aralıklarla güncellendiği biliniyor;
/// resolution() çağrısıyla runtime'da teyit edilir.
pub const ASSUMED_ORACLE_RESOLUTION_SECS: u64 = 300;
