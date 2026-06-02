//! SEP-40 `PriceFeedClient` sarmalayıcısı — checked dönüş tipleri.
//!
//! Doğrudan `PriceFeedClient::lastprice(...)` çağırırsan `Option<PriceData>`
//! döner; her fiyat tüketicisinin `Option::None`'u manuel ele alması külfettir.
//! Bu modül `Option::None` → `HeliosError::PriceUnavailable` haritasını
//! standartlaştırır + AUDIT §1.6 freshness kontrolünü ekler.

use shared::HeliosError;
use soroban_sdk::{Address, Env, Vec};

use crate::guard::ensure_fresh;
use crate::sep40::{Asset, PriceData, PriceFeedClient};

/// `lastprice` çağır + freshness kontrolü uygula.
///
/// Reddedilenler:
///   - Option::None → `PriceUnavailable`
///   - timestamp çok eski (`now - timestamp > STALENESS_HARD_SECS`)
///     → `OracleStale` (AUDIT §1.6)
///
/// Sanity bound (TWAP sapma) çağıran tarafından `ensure_sanity(...)` ile
/// ekstra çağrılır — bu fn sadece freshness denetler.
pub fn checked_lastprice(
    env: &Env,
    feed: &Address,
    asset: &Asset,
) -> Result<PriceData, HeliosError> {
    let client = PriceFeedClient::new(env, feed);
    let price = client.lastprice(asset).ok_or(HeliosError::PriceUnavailable)?;
    ensure_fresh(env, &price)?;
    Ok(price)
}

/// `prices(asset, records)` çağır + uzunluk + freshness kontrolü.
///
/// TWAP hesabı için kullanılır (PROMPT 27 Monte Carlo + AUDIT §1.6 sanity bound).
/// Reddedilenler:
///   - Option::None → `PriceUnavailable`
///   - `records == 0` → `InvalidParams`
pub fn checked_prices(
    env: &Env,
    feed: &Address,
    asset: &Asset,
    records: u32,
) -> Result<Vec<PriceData>, HeliosError> {
    if records == 0 {
        return Err(HeliosError::InvalidParams);
    }
    let client = PriceFeedClient::new(env, feed);
    let prices = client
        .prices(asset, &records)
        .ok_or(HeliosError::PriceUnavailable)?;
    if prices.is_empty() {
        return Err(HeliosError::PriceUnavailable);
    }
    Ok(prices)
}
