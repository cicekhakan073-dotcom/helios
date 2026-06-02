//! Blend pool çağrıları için checked wrapper'lar — `Result<_, HeliosError>`.
//!
//! `submit` ve `flash_loan` çağrıları doğrudan `PoolClient::new(env, &pool).
//! submit(...)` ile yapılır (Soroban macro tarafından üretilmiş client).
//! Bu wrapper'lar **okuma** çağrıları için (`get_positions`, `get_reserve`,
//! `get_config`) standart hata haritasını ekler.

use shared::HeliosError;
use soroban_sdk::{Address, Env};

use crate::types::{PoolClient, PoolConfig, Positions, Reserve};

/// `pool.get_positions(user)` — Helios bu pozisyonu off-chain (PROMPT 18)
/// HF hesabıyla zenginleştirir.
pub fn checked_get_positions(
    env: &Env,
    pool: &Address,
    user: &Address,
) -> Result<Positions, HeliosError> {
    let client = PoolClient::new(env, pool);
    let positions = client.get_positions(user);
    Ok(positions)
}

/// `pool.get_reserve(asset)` — c_factor / l_factor / b_rate / d_rate okuma.
///
/// Eğer asset rezerve listesinde yoksa Blend tarafı panic atar; Helios önce
/// `get_config().max_positions` üzerinden ya da config'ten teyit etmeli.
pub fn checked_get_reserve(
    env: &Env,
    pool: &Address,
    asset: &Address,
) -> Result<Reserve, HeliosError> {
    let client = PoolClient::new(env, pool);
    let reserve = client.get_reserve(asset);
    Ok(reserve)
}

/// `pool.get_config()` — oracle adresi + max_positions + status.
pub fn checked_get_config(env: &Env, pool: &Address) -> Result<PoolConfig, HeliosError> {
    let client = PoolClient::new(env, pool);
    let cfg = client.get_config();
    Ok(cfg)
}
