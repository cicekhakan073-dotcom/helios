//! Fiyat decimals normalizasyonu.
//!
//! SEP-40 `decimals()` döner; fiyat i128 ham değerdir. HF veya cross-asset
//! karşılaştırmalar için ortak bir target_decimals'a hizalanmalı.
//!
//! AUDIT §1.5 — `decimals` SABİT VARSAYILMAZ; her zaman kontrattan okunur.
//! Bu fn saf math'tir, Soroban Env'e ihtiyacı yok.

use shared::HeliosError;

/// `price` (from_decimals hassasiyetinde) → to_decimals hassasiyetine ölçekle.
///
/// Aşağı ölçeklemede precision kaybı olur; yukarı ölçeklemede taşma riski var
/// → checked_mul/pow ile koruyoruz.
pub const fn normalize_price_unchecked(
    price: i128,
    from_decimals: u32,
    to_decimals: u32,
) -> Option<i128> {
    if from_decimals == to_decimals {
        Some(price)
    } else if from_decimals > to_decimals {
        let scale = pow10(from_decimals - to_decimals);
        match scale {
            Some(s) => Some(price / s),
            None => None,
        }
    } else {
        let scale = pow10(to_decimals - from_decimals);
        match scale {
            Some(s) => price.checked_mul(s),
            None => None,
        }
    }
}

/// `Result`-tabanlı kabuk — HeliosError'a maple.
pub fn normalize_price(
    price: i128,
    from_decimals: u32,
    to_decimals: u32,
) -> Result<i128, HeliosError> {
    normalize_price_unchecked(price, from_decimals, to_decimals)
        .ok_or(HeliosError::InvalidParams)
}

/// 10^n için checked hesap. Aşırı büyük üs (≥39) i128'i aşar → None.
const fn pow10(n: u32) -> Option<i128> {
    if n > 38 {
        return None;
    }
    let mut result: i128 = 1;
    let mut i = 0u32;
    while i < n {
        match result.checked_mul(10) {
            Some(r) => result = r,
            None => return None,
        }
        i += 1;
    }
    Some(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn esit_decimals_ayni_doner() {
        assert_eq!(normalize_price_unchecked(12345, 8, 8), Some(12345));
    }

    #[test]
    fn yukari_olcekle_14_decimal_7_decimal_e() {
        // 1.0 USDC = 10_000_000 (7 dec)
        // 14 decimal'de 100_000_000_000_000
        assert_eq!(
            normalize_price_unchecked(10_000_000, 7, 14),
            Some(100_000_000_000_000)
        );
    }

    #[test]
    fn asagi_olcekle_14_decimal_7_decimal_e() {
        // 1.0 = 100_000_000_000_000 (14 dec) → 10_000_000 (7 dec)
        assert_eq!(
            normalize_price_unchecked(100_000_000_000_000, 14, 7),
            Some(10_000_000)
        );
    }

    #[test]
    fn asiri_yukari_olcekleme_tasmayi_yakaliyor() {
        // i128::MAX ≈ 1.7e38; 10^39 taşırır.
        assert_eq!(normalize_price_unchecked(1, 0, 39), None);
    }

    #[test]
    fn pow10_sinir_degerler() {
        assert_eq!(pow10(0), Some(1));
        assert_eq!(pow10(7), Some(10_000_000));
        assert_eq!(pow10(38), Some(10i128.pow(38)));
        assert_eq!(pow10(39), None);
    }
}
