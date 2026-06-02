//! AssetId → Reflector `Asset` + uygun feed kararı.
//!
//! AUDIT §2.2 eşleşmesi:
//!   USDC → Stellar DEX feed,        Asset::Stellar(usdc_sac)
//!   XLM  → Stellar DEX feed,        Asset::Stellar(xlm_sac)
//!   wBTC → External CEX & DEX feed, Asset::Other(symbol_short!("BTC"))
//!   wETH → External CEX & DEX feed, Asset::Other(symbol_short!("ETH"))
//!
//! Bu fonksiyon Helios kontratlarının "AssetId verdim, hangi feed'den + ne
//! `Asset` ile sorayım" sorusunu **tek noktada** cevaplar. Yeni asset eklerken
//! bir yerde değişir, dağılmaz.

use shared::{AssetId, HeliosError};
use soroban_sdk::{symbol_short, Env};

use crate::config::{FeedConfig, OracleSet};
use crate::sep40::Asset;

pub struct FeedQuery {
    /// Hangi feed'e sorulacak.
    pub feed: FeedConfig,
    /// Reflector'a verilecek Asset enum'u.
    pub asset: Asset,
}

/// AssetId → (feed, asset) eşlemesini döndür.
///
/// `Env`'e ihtiyaç: `symbol_short!()` macro'su Env'siz çalışmaz ve
/// `Address::clone` Env scope'unda anlamlı.
pub fn reflector_asset_for(
    env: &Env,
    asset_id: AssetId,
    set: &OracleSet,
) -> Result<FeedQuery, HeliosError> {
    let _ = env;
    match asset_id {
        AssetId::Usdc => Ok(FeedQuery {
            feed: set.stellar_dex.clone(),
            asset: Asset::Stellar(set.usdc_sac.clone()),
        }),
        AssetId::Xlm => Ok(FeedQuery {
            feed: set.stellar_dex.clone(),
            asset: Asset::Stellar(set.xlm_sac.clone()),
        }),
        AssetId::WBtc => Ok(FeedQuery {
            feed: set.external_cex_dex.clone(),
            asset: Asset::Other(symbol_short!("BTC")),
        }),
        AssetId::WEth => Ok(FeedQuery {
            feed: set.external_cex_dex.clone(),
            asset: Asset::Other(symbol_short!("ETH")),
        }),
    }
}
