//! Helios <-> Blend HF okuma + hesap köprüsü.
//!
//! ## Tasarım kararı (AUDIT §1.5)
//!
//! Helios HF hesabı **iki katmanda** yapılır:
//!
//!   1. **Veri toplama** (`collect_hf_readout`) — `Positions` + ihtiyaç duyulan
//!      `Reserve`'leri Blend pool'dan çeker (cross-contract). Bu fn off-chain
//!      indexer'lar (PROMPT 18 SDK) için da uygundur.
//!
//!   2. **Hesap** (`compute_hf_bps`) — `shared::hf` saf primitiflerini Blend
//!      tipleriyle besler. c_factor (collateral discount) + l_factor (liability
//!      inflate) + asset_to_base price ile final HF bps üretilir.
//!
//! Üretim HF ZINCIRI Helios'ta off-chain (PROMPT 18 TS SDK) ile aynalanır;
//! drift testi `shared::hf` sabitlerinin TS ↔ Rust eşit olmasını garanti
//! eder.
//!
//! ## Single-asset MVP basitleştirmesi
//!
//! `compute_hf_bps` her rezerv için `(amount, c_factor, l_factor, price)`
//! girdisini tüketir; cross-asset toplama kullanıcı tarafında yapılır
//! (örn. PROMPT 27 Monte Carlo). Bu fn her bir asset için ayrı
//! collateral/debt base'i toplar ve şu son HF formülünü uygular:
//!
//!   `HF = Σ(eff_coll_i × price_i) / Σ(eff_liab_i × price_i)` (×100)
//!
//! Asset-base price scale farkları çağıran tarafın sorumluluğu: tüm
//! price'lar **aynı decimals'ta** olmalı (TS SDK öncesinde normalize edilir).

use shared::{
    effective_collateral, effective_liability, health_factor_bps, HeliosError,
};
use soroban_sdk::{Address, Env, Vec};

use crate::client::{checked_get_positions, checked_get_reserve};
use crate::types::{Positions, Reserve};

/// Blend b_rate / d_rate sabit-nokta scalar'ı = 1e12 (12-dec).
/// Canlı doğrulandı 2026-06-03: b_rate=1_330_987_588_133 (≈1.331),
/// d_rate=1_514_602_077_746 (≈1.515). underlying = raw_token × rate / RATE_SCALAR.
pub const RATE_SCALAR: i128 = 1_000_000_000_000;

/// b/d-token shareını underlying asset miktarına çevirir (raw × rate / 1e12).
fn to_underlying(raw: i128, rate: i128) -> Result<i128, HeliosError> {
    if raw == 0 {
        return Ok(0);
    }
    Ok(raw
        .checked_mul(rate)
        .ok_or(HeliosError::HfOverflow)?
        / RATE_SCALAR)
}

/// Kullanıcının toplam borcunu UNDERLYING cinsinden döndürür (keeper cap'i için —
/// scan da underlying gönderir; ham d_token cap'i ile uyumsuzluk #52'ye yol açıyordu).
pub fn sum_underlying_debt(readout: &HfReadout) -> Result<i128, HeliosError> {
    let mut total: i128 = 0;
    for i in 0..readout.reserves.len() {
        let reserve = readout.reserves.get(i).ok_or(HeliosError::InvalidParams)?;
        let raw = readout
            .positions
            .liabilities
            .get(reserve.config.index)
            .unwrap_or(0);
        total = total
            .checked_add(to_underlying(raw, reserve.data.d_rate)?)
            .ok_or(HeliosError::HfOverflow)?;
    }
    Ok(total)
}

/// Helios HF okuması için **gerekli ham veriyi tek noktada toplar**.
#[derive(Clone)]
pub struct HfReadout {
    pub positions: Positions,
    /// Pool reserveleri — çağıran tarafın verdiği `assets` listesinin sırasıyla.
    pub reserves: soroban_sdk::Vec<Reserve>,
}

/// `positions` ve verilen asset listesi için `Reserve` verisini topla.
pub fn collect_hf_readout(
    env: &Env,
    pool: &Address,
    user: &Address,
    assets: &Vec<Address>,
) -> Result<HfReadout, HeliosError> {
    let positions = checked_get_positions(env, pool, user)?;
    let mut reserves = soroban_sdk::Vec::new(env);
    for asset in assets.iter() {
        let r = checked_get_reserve(env, pool, &asset)?;
        reserves.push_back(r);
    }
    Ok(HfReadout {
        positions,
        reserves,
    })
}

/// `HfReadout`'tan + paralel price vektöründen final HF bps hesabı.
///
/// `prices[i]` `reserves[i]` ile aynı sırada — i'nci rezervin asset-to-base
/// oracle fiyatı (tüm price'lar aynı decimals'ta normalize edilmiş).
///
/// Pozisyonun her rezervi için:
///   - `raw_collateral_i` = positions.collateral[reserve_index]
///   - `eff_coll_i` = effective_collateral(raw, reserve.config.c_factor)
///   - `coll_base_i` = eff_coll_i × price_i
///   - aynı şekilde liability
///
/// **Önemli:** Bu fn share-to-asset conversion (b_rate / d_rate) **yapmaz**;
/// raw collateral değerinin asset miktarı kabul eder. Tam-eşdeğer Blend HF
/// için `b_rate * raw_collateral / SCALAR` yapılmalı (off-chain TS aynası
/// PROMPT 18'de bu uçtan uca uygulanır). MockBlendPool b_rate=1.0 olduğu
/// için test'lerde bu basitleştirme şeffaf.
pub fn compute_hf_bps(
    readout: &HfReadout,
    prices: &Vec<i128>,
) -> Result<i128, HeliosError> {
    if readout.reserves.len() != prices.len() {
        return Err(HeliosError::InvalidParams);
    }

    let mut total_coll_base: i128 = 0;
    let mut total_liab_base: i128 = 0;

    for i in 0..readout.reserves.len() {
        let reserve = readout
            .reserves
            .get(i)
            .ok_or(HeliosError::InvalidParams)?;
        let price = prices.get(i).ok_or(HeliosError::InvalidParams)?;

        let raw_coll = readout
            .positions
            .collateral
            .get(reserve.config.index)
            .unwrap_or(0);
        let raw_liab = readout
            .positions
            .liabilities
            .get(reserve.config.index)
            .unwrap_or(0);

        // b/d-token → UNDERLYING (Blend rate scalar 1e12; canlı doğrulandı 2026-06-03:
        // b_rate=1.33e12, d_rate=1.51e12). HF underlying üzerinden hesaplanmalı ki SDK/scan
        // ile TUTARLI olsun; aksi halde b_rate≠d_rate yüzünden on-chain HF şişer (#51).
        let underlying_coll = to_underlying(raw_coll, reserve.data.b_rate)?;
        let underlying_liab = to_underlying(raw_liab, reserve.data.d_rate)?;

        // c_factor/l_factor 7-dec scalar (9_000_000 = 0.90); effective_* BPS bekler (≤10_000).
        // /1000 ile 7-dec → bps (SDK client.ts ile birebir). Aksi halde #3 InvalidParams.
        if underlying_coll > 0 {
            let eff = effective_collateral(underlying_coll, reserve.config.c_factor / 1000)?;
            total_coll_base = total_coll_base
                .checked_add(eff.checked_mul(price).ok_or(HeliosError::HfOverflow)?)
                .ok_or(HeliosError::HfOverflow)?;
        }
        if underlying_liab > 0 {
            let eff = effective_liability(underlying_liab, reserve.config.l_factor / 1000)?;
            total_liab_base = total_liab_base
                .checked_add(eff.checked_mul(price).ok_or(HeliosError::HfOverflow)?)
                .ok_or(HeliosError::HfOverflow)?;
        }
    }

    health_factor_bps(total_coll_base, total_liab_base)
}
