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

        // Blend reserve c_factor/l_factor 7-dec scalar (9_000_000 = 0.90);
        // effective_* fn'leri BPS bekler (≤10_000). /1000 ile 7-dec → bps
        // (SDK client.ts ile birebir: cfg.c_factor / 1000). Aksi halde
        // 9_000_000 > 10_000 → InvalidParams (#3) — canlı keeper testinde doğrulandı 2026-06-03.
        if raw_coll > 0 {
            let eff = effective_collateral(raw_coll, reserve.config.c_factor / 1000)?;
            total_coll_base = total_coll_base
                .checked_add(eff.checked_mul(price).ok_or(HeliosError::HfOverflow)?)
                .ok_or(HeliosError::HfOverflow)?;
        }
        if raw_liab > 0 {
            let eff = effective_liability(raw_liab, reserve.config.l_factor / 1000)?;
            total_liab_base = total_liab_base
                .checked_add(eff.checked_mul(price).ok_or(HeliosError::HfOverflow)?)
                .ok_or(HeliosError::HfOverflow)?;
        }
    }

    health_factor_bps(total_coll_base, total_liab_base)
}
