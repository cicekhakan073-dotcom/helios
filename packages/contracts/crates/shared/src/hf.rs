//! Health Factor eşik sabitleri + saf matematik primitifleri + risk bandı.
//!
//! **Tek doğruluk kaynağı.** Bu sayılar tasarım sisteminden
//! (`../../../../design-system.md` §1.4) ve TS tokens.ts'ten birebir aynalanır.
//! PROMPT 18'de drift testi: TS `riskBand()` ile Rust `risk_band()` aynı
//! sınırları döndürmeli.
//!
//! ## Blend HF mekaniği (AUDIT 2026-05-31 §1.5 — kaynak doğrulamalı)
//!
//! Blend pool kendi içinde HF'yi şöyle hesaplar:
//!
//!   `HF = collateral_base / liability_base`
//!
//! Burada:
//!   - `collateral_base = Σ (raw_collateral_i × c_factor_i / 10000 × price_i)`
//!   - `liability_base  = Σ (raw_debt_j × 10000 / l_factor_j × price_j)`
//!
//! `c_factor` collateral'ı **discount eder** (raw × c_factor / SCALAR).
//! `l_factor` liability'yi **inflate eder** (raw × SCALAR / l_factor).
//! Doğrulama: `pool/src/pool/reserve.rs::to_effective_asset_from_b_token` ve
//! `..._d_token` fn'leri (2026-06-01).
//!
//! Likidasyon noktası **HF=1.0 effective değerlerde**. Helios `HF_LIQUIDATION_BPS=100`.
//!
//! ## Bu modül NE içerir
//!
//! - Eşik sabitleri (`HF_HEALTHY_MIN_BPS`, `HF_CAUTION_MIN_BPS`, `HF_LIQUIDATION_BPS`)
//! - `risk_band(hf_bps) → HfBand`
//! - Saf math: `health_factor_bps`, `project_hf_bps`, `liquidation_price`,
//!   `effective_collateral`, `effective_liability`
//!
//! ## Bu modül NE içermez
//!
//! - Soroban `Env`'e bağımlı kod (saf math no_std)
//! - Blend tip ayrıştırma (o blend::hf adapter'ında)
//! - Cross-asset toplama (o blend::hf::compute_hf)

use crate::error::HeliosError;

// ============================================================================
// Eşikler — DESIGN-SYSTEM AYNASI (drift testi PROMPT 18)
// ============================================================================

pub const HF_HEALTHY_MIN_BPS: i128 = 150; // 1.50
pub const HF_CAUTION_MIN_BPS: i128 = 120; // 1.20
pub const HF_LIQUIDATION_BPS: i128 = 100; // 1.00

// Float-cinsi karşılıkları (yalnız doc; runtime'da kullanma).
pub const HF_HEALTHY_MIN: u32 = 150;
pub const HF_CAUTION_MIN: u32 = 120;
pub const HF_LIQUIDATION: u32 = 100;

/// Basis-points denominator (10_000) — c_factor / l_factor scale'i.
pub const BPS_DENOM: i128 = 10_000;

/// HF iç ölçek — risk_band ve eşiklerle uyumlu (HF=1.50 → 150).
pub const HF_SCALE: i128 = 100;

// ============================================================================
// Risk band enum
// ============================================================================

#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum HfBand {
    Healthy = 0,
    Caution = 1,
    Danger = 2,
    Liquidatable = 3,
}

/// HF değerinden risk bandını türet. `hf_bps` = HF × 100.
/// TS SDK `riskBand()` ile **aynı sınırları** verir (drift testi PROMPT 18).
pub const fn risk_band(hf_bps: i128) -> HfBand {
    if hf_bps < HF_LIQUIDATION_BPS {
        HfBand::Liquidatable
    } else if hf_bps < HF_CAUTION_MIN_BPS {
        HfBand::Danger
    } else if hf_bps < HF_HEALTHY_MIN_BPS {
        HfBand::Caution
    } else {
        HfBand::Healthy
    }
}

// ============================================================================
// Saf math primitifleri
// ============================================================================

/// Raw collateral → effective collateral (c_factor discount).
///
/// `c_factor_bps` Blend ReserveConfig.c_factor (örn. 8500 = 0.85). Tipik
/// c_factor 0-1 aralığında → effective_collateral ≤ raw.
pub fn effective_collateral(raw: i128, c_factor_bps: u32) -> Result<i128, HeliosError> {
    if c_factor_bps > BPS_DENOM as u32 {
        return Err(HeliosError::InvalidParams); // > 1.0 anlamsız
    }
    raw.checked_mul(c_factor_bps as i128)
        .map(|x| x / BPS_DENOM)
        .ok_or(HeliosError::HfOverflow)
}

/// Raw liability → effective liability (l_factor inflate).
///
/// `l_factor_bps` Blend ReserveConfig.l_factor (örn. 8000 = 0.80). Tipik
/// l_factor 0-1 aralığında → effective_liability ≥ raw.
pub fn effective_liability(raw: i128, l_factor_bps: u32) -> Result<i128, HeliosError> {
    if l_factor_bps == 0 {
        return Err(HeliosError::InvalidParams);
    }
    if l_factor_bps > BPS_DENOM as u32 {
        return Err(HeliosError::InvalidParams); // > 1.0 anlamsız
    }
    raw.checked_mul(BPS_DENOM)
        .map(|x| x / l_factor_bps as i128)
        .ok_or(HeliosError::HfOverflow)
}

/// HF (×100 ölçek): collateral_base / liability_base × 100.
///
/// Girdiler ÖNCEDEN effective + price-multiplied olmalı (collateral_base ve
/// liability_base "base unit"e çevrilmiş). Cross-asset toplama bu fn'in dışı.
///
/// `liability_base == 0` → `ZeroDebt` (HF sonsuz; tüketici Option/MAX
/// semantiğine çevirir).
pub fn health_factor_bps(
    collateral_base: i128,
    liability_base: i128,
) -> Result<i128, HeliosError> {
    if collateral_base < 0 || liability_base < 0 {
        return Err(HeliosError::InvalidParams);
    }
    if liability_base == 0 {
        return Err(HeliosError::ZeroDebt);
    }
    collateral_base
        .checked_mul(HF_SCALE)
        .map(|x| x / liability_base)
        .ok_or(HeliosError::HfOverflow)
}

/// Fiyat şoku projeksiyonu: collateral_base'in fiyat bileşeni %X değişirse
/// HF nasıl olur?
///
/// `price_delta_bps`: −2000 = −%20 (düşüş, HF düşer). Pozitif = artış.
///
/// Tüm pozisyon SINGLE-asset varsayımı: tüm collateral aynı fiyat şokuna
/// maruz. Cross-asset projeksiyon off-chain (PROMPT 27 Monte Carlo).
pub fn project_hf_bps(
    collateral_base: i128,
    liability_base: i128,
    price_delta_bps: i32,
) -> Result<i128, HeliosError> {
    if liability_base == 0 {
        return Err(HeliosError::ZeroDebt);
    }
    let multiplier = BPS_DENOM
        .checked_add(price_delta_bps as i128)
        .ok_or(HeliosError::InvalidParams)?;
    if multiplier <= 0 {
        // %-100 ve aşağısı → collateral sıfır/negatif → HF=0
        return Ok(0);
    }
    let new_collateral = collateral_base
        .checked_mul(multiplier)
        .ok_or(HeliosError::HfOverflow)?
        / BPS_DENOM;
    health_factor_bps(new_collateral, liability_base)
}

/// Likidasyon fiyatı: HF=1 (BPS=100) olduğu collateral fiyatı.
///
/// `current_price`: collateral asset'in oracle base price'ı (i128).
/// `collateral_base` ve `liability_base`: AKTUEL effective değerler.
///
/// Formül: `collateral_base × (price_liq / current_price) = liability_base`
///       → `price_liq = current_price × liability_base / collateral_base`
///
/// `collateral_base == 0` → kullanıcı collateral'sız (geçersiz pozisyon).
/// `liability_base == 0` → borç yok, likidasyon yok → `Ok(0)`.
pub fn liquidation_price(
    current_price: i128,
    collateral_base: i128,
    liability_base: i128,
) -> Result<i128, HeliosError> {
    if current_price < 0 || collateral_base < 0 || liability_base < 0 {
        return Err(HeliosError::InvalidParams);
    }
    if collateral_base == 0 {
        return Err(HeliosError::InvalidParams);
    }
    if liability_base == 0 {
        return Ok(0);
    }
    current_price
        .checked_mul(liability_base)
        .map(|x| x / collateral_base)
        .ok_or(HeliosError::HfOverflow)
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ---------- risk_band ----------

    #[test]
    fn band_sinirlari_dogru() {
        assert_eq!(risk_band(150), HfBand::Healthy);
        assert_eq!(risk_band(149), HfBand::Caution);
        assert_eq!(risk_band(120), HfBand::Caution);
        assert_eq!(risk_band(119), HfBand::Danger);
        assert_eq!(risk_band(100), HfBand::Danger);
        assert_eq!(risk_band(99), HfBand::Liquidatable);
        assert_eq!(risk_band(0), HfBand::Liquidatable);
    }

    #[test]
    fn band_design_system_renkleriyle_hizali() {
        // Tasarım sisteminin HF eşikleri (design-system.md §1.4):
        //   Healthy   : HF ≥ 1.5  → ≥ 150 bps
        //   Caution   : 1.2 ≤ HF < 1.5 → [120, 150)
        //   Danger    : HF < 1.2 → < 120
        //   Liquidatable : HF < 1.0 → < 100
        assert_eq!(HF_HEALTHY_MIN_BPS, 150);
        assert_eq!(HF_CAUTION_MIN_BPS, 120);
        assert_eq!(HF_LIQUIDATION_BPS, 100);
    }

    // ---------- effective_collateral / effective_liability ----------

    #[test]
    fn effective_collateral_c_factor_0_85_uygulanir() {
        // raw=10000, c_factor=8500 → 10000 × 8500 / 10000 = 8500
        assert_eq!(effective_collateral(10_000, 8500).unwrap(), 8500);
    }

    #[test]
    fn effective_liability_l_factor_0_80_buyutur() {
        // raw=8000, l_factor=8000 → 8000 × 10000 / 8000 = 10000
        assert_eq!(effective_liability(8_000, 8000).unwrap(), 10_000);
    }

    #[test]
    fn effective_collateral_c_factor_uzerinde_invalid() {
        // c_factor > 1.0 anlamsız
        assert_eq!(
            effective_collateral(1000, 11_000),
            Err(HeliosError::InvalidParams)
        );
    }

    #[test]
    fn effective_liability_sifir_l_factor_invalid() {
        assert_eq!(effective_liability(1000, 0), Err(HeliosError::InvalidParams));
    }

    // ---------- health_factor_bps ----------

    #[test]
    fn health_factor_collateral_iki_kat_borcun_hf_200() {
        // coll_base=20000, liab_base=10000 → HF=2.00 → bps=200
        assert_eq!(health_factor_bps(20_000, 10_000).unwrap(), 200);
    }

    #[test]
    fn health_factor_esit_bazda_hf_100() {
        // HF=1.00 → bps=100 (likidasyon sınırı)
        assert_eq!(health_factor_bps(10_000, 10_000).unwrap(), 100);
    }

    #[test]
    fn health_factor_borc_sifir_zero_debt() {
        assert_eq!(
            health_factor_bps(10_000, 0),
            Err(HeliosError::ZeroDebt)
        );
    }

    #[test]
    fn health_factor_negatif_input_invalid() {
        assert_eq!(
            health_factor_bps(-1, 100),
            Err(HeliosError::InvalidParams)
        );
        assert_eq!(
            health_factor_bps(100, -1),
            Err(HeliosError::InvalidParams)
        );
    }

    // ---------- project_hf_bps (PROMPT 13 DOĞRULAMA: -20% / -40% şok elle hesap) ----------

    #[test]
    fn project_hf_minus_20_collateral_dustugunde_hf_dusuyor() {
        // Başlangıç: coll=15000, liab=10000 → HF=1.50 (bps=150)
        // -20% şok → coll=12000 → HF=1.20 (bps=120)
        let initial = health_factor_bps(15_000, 10_000).unwrap();
        assert_eq!(initial, 150);

        let shocked = project_hf_bps(15_000, 10_000, -2000).unwrap();
        assert_eq!(shocked, 120, "−20% şokta HF 1.50 → 1.20 olmalı");
    }

    #[test]
    fn project_hf_minus_40_likidasyona_yaklasir() {
        // Başlangıç: coll=15000, liab=10000 → HF=1.50
        // -40% şok → coll=9000 → HF=0.90 (bps=90) — likide
        let shocked = project_hf_bps(15_000, 10_000, -4000).unwrap();
        assert_eq!(shocked, 90, "−40% şokta HF 1.50 → 0.90 (likide) olmalı");
        assert_eq!(risk_band(shocked), HfBand::Liquidatable);
    }

    #[test]
    fn project_hf_pozitif_delta_hf_yukseltir() {
        // +20% şok → coll=18000 → HF=1.80
        let shocked = project_hf_bps(15_000, 10_000, 2000).unwrap();
        assert_eq!(shocked, 180);
    }

    #[test]
    fn project_hf_minus_100_collateral_sifir_hf_sifir() {
        // -%100 → multiplier=0 → coll=0 → HF=0
        let shocked = project_hf_bps(15_000, 10_000, -10_000).unwrap();
        assert_eq!(shocked, 0);
    }

    #[test]
    fn project_hf_zero_debt_zero_debt() {
        assert_eq!(
            project_hf_bps(15_000, 0, -2000),
            Err(HeliosError::ZeroDebt)
        );
    }

    // ---------- liquidation_price ----------

    #[test]
    fn liquidation_price_elle_hesap_uyumu() {
        // current_price=2000 (BTC=$2000)
        // collateral_base=15000, liability_base=10000 → HF=1.50
        // price_liq = 2000 × 10000 / 15000 = 1333
        let lp = liquidation_price(2000, 15_000, 10_000).unwrap();
        assert_eq!(lp, 1333, "price_liq = current_price × liab / coll");
    }

    #[test]
    fn liquidation_price_borc_yokken_sifir() {
        assert_eq!(liquidation_price(2000, 15_000, 0).unwrap(), 0);
    }

    #[test]
    fn liquidation_price_collateral_sifir_invalid() {
        assert_eq!(
            liquidation_price(2000, 0, 100),
            Err(HeliosError::InvalidParams)
        );
    }

    #[test]
    fn liquidation_price_negatif_input_invalid() {
        assert_eq!(
            liquidation_price(-1, 100, 100),
            Err(HeliosError::InvalidParams)
        );
    }

    // ---------- Compose: effective × hf zinciri ----------

    #[test]
    fn compose_effective_ve_hf_blend_paramlariyla_uyumlu() {
        // Senaryo: raw_coll=10000 USDC, c_factor=8500
        //          raw_debt=5000  USDC, l_factor=8000
        // effective_coll = 10000 × 0.85 = 8500
        // effective_liab = 5000  × 1.25 = 6250
        // HF = 8500/6250 = 1.36 → bps=136
        let ec = effective_collateral(10_000, 8500).unwrap();
        let el = effective_liability(5_000, 8000).unwrap();
        assert_eq!(ec, 8500);
        assert_eq!(el, 6250);
        let hf = health_factor_bps(ec, el).unwrap();
        assert_eq!(hf, 136);
        assert_eq!(risk_band(hf), HfBand::Caution);
    }
}
