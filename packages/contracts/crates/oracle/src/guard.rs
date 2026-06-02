//! Oracle güvenlik guard'ları — AUDIT 2026-05-31 §1.6.
//!
//! Blend 2025 oracle manipulation exploit ($10.8M) yansıması. Helios testnet
//! olsa da bu disiplinler tasarıma kazınmıştır:
//!
//!   1. **Staleness check** — Her `lastprice` çağrısı sonrası timestamp denetle.
//!      `now - timestamp > ORACLE_STALENESS_HARD_SECS` (10 dk) → revert.
//!
//!   2. **Sanity bound (TWAP sapma)** — `lastprice` ile `prices(N)` TWAP'ı
//!      karşılaştır. `|last - twap| / twap * 10000 > PRICE_DEVIATION_BPS`
//!      (3000 = %30) → revert. Manipülasyon tek-blok şokuna karşı koruma.

use shared::{
    HeliosError, ORACLE_PRICE_DEVIATION_BPS, ORACLE_STALENESS_HARD_SECS,
};
use soroban_sdk::{Env, Vec};

use crate::sep40::PriceData;

/// `now - price.timestamp <= STALENESS_HARD_SECS` mi?
/// Hayır → `OracleStale`.
pub fn ensure_fresh(env: &Env, price: &PriceData) -> Result<(), HeliosError> {
    let now = env.ledger().timestamp();
    if now < price.timestamp {
        // Saat tutarsızlığı / hatalı kontrat — yine de stale say.
        return Err(HeliosError::OracleStale);
    }
    let age = now - price.timestamp;
    if age > ORACLE_STALENESS_HARD_SECS {
        return Err(HeliosError::OracleStale);
    }
    Ok(())
}

/// TWAP sanity bound: `|lastprice - twap| / twap * 10000 > deviation_bps` mi?
/// Evet → `PriceSanityBoundExceeded`.
///
/// `prices` `checked_prices(...)` üzerinden geldiği için boş gelmez ve
/// pozitif tip varsayımı altında. Yine de TWAP=0 durumunu güvene al.
pub fn ensure_sanity(
    lastprice: i128,
    prices: &Vec<PriceData>,
) -> Result<(), HeliosError> {
    if prices.is_empty() {
        return Err(HeliosError::PriceUnavailable);
    }
    let twap = twap_of(prices);
    if twap <= 0 {
        return Err(HeliosError::PriceUnavailable);
    }
    let diff = if lastprice >= twap {
        lastprice - twap
    } else {
        twap - lastprice
    };
    // diff/twap * 10000 → integer-friendly çarpım
    let scaled = diff
        .checked_mul(10_000)
        .ok_or(HeliosError::PriceSanityBoundExceeded)?;
    let deviation_bps = scaled / twap;
    if deviation_bps > ORACLE_PRICE_DEVIATION_BPS as i128 {
        return Err(HeliosError::PriceSanityBoundExceeded);
    }
    Ok(())
}

/// Time-weighted average price — basitleştirilmiş ortalama (eşit ağırlık).
/// Gerçek TWAP zaman aralığıyla ağırlıklandırılır; Reflector resolution
/// (genelde 5 dk sabit) altında basit ortalama eşdeğer.
fn twap_of(prices: &Vec<PriceData>) -> i128 {
    let len = prices.len() as i128;
    if len == 0 {
        return 0;
    }
    let mut sum: i128 = 0;
    for p in prices.iter() {
        sum = sum.saturating_add(p.price);
    }
    sum / len
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sep40::PriceData;
    use soroban_sdk::Env;

    fn pd(price: i128) -> PriceData {
        PriceData {
            price,
            timestamp: 0,
        }
    }

    #[test]
    fn twap_uc_esit_fiyatta_ayni() {
        let env = Env::default();
        let v = Vec::from_array(&env, [pd(100), pd(100), pd(100)]);
        assert_eq!(twap_of(&v), 100);
    }

    #[test]
    fn twap_ortalama() {
        let env = Env::default();
        let v = Vec::from_array(&env, [pd(100), pd(200), pd(300)]);
        assert_eq!(twap_of(&v), 200);
    }

    #[test]
    fn sanity_yuzde_20_sapmada_gecer() {
        let env = Env::default();
        let prices = Vec::from_array(&env, [pd(100), pd(100), pd(100)]);
        // %20 sapma — eşik %30 → geçer
        assert!(ensure_sanity(120, &prices).is_ok());
        assert!(ensure_sanity(80, &prices).is_ok());
    }

    #[test]
    fn sanity_yuzde_35_sapmada_red() {
        let env = Env::default();
        let prices = Vec::from_array(&env, [pd(100), pd(100), pd(100)]);
        // %35 sapma — eşik %30 → revert
        assert_eq!(
            ensure_sanity(135, &prices),
            Err(HeliosError::PriceSanityBoundExceeded)
        );
        assert_eq!(
            ensure_sanity(65, &prices),
            Err(HeliosError::PriceSanityBoundExceeded)
        );
    }

    #[test]
    fn sanity_sinir_yuzde_30() {
        let env = Env::default();
        let prices = Vec::from_array(&env, [pd(100)]);
        // %30 tam — eşik dahil → geçer
        assert!(ensure_sanity(130, &prices).is_ok());
        // %30.01 — eşik aşılır
        assert_eq!(
            ensure_sanity(131, &prices),
            Err(HeliosError::PriceSanityBoundExceeded)
        );
    }
}
