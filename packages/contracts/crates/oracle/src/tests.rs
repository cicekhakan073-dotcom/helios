//! oracle crate testleri — MockReflector contract'ı register edip
//! oracle::client + guard akışını uçtan uca doğrular.

use crate::sep40::{Asset, PriceData};
use crate::testutils::{install_history, install_lastprice, install_state, MockReflector};
use crate::{
    checked_lastprice, checked_prices, ensure_fresh, ensure_sanity, normalize_price,
    reflector_asset_for, FeedConfig, OracleSet,
};
use shared::{AssetId, HeliosError};
use soroban_sdk::{
    symbol_short,
    testutils::{Address as _, Ledger},
    Address, Env, Vec,
};

fn setup_mock_feed(env: &Env, decimals: u32) -> (Address, FeedConfig) {
    let feed_addr = env.register(MockReflector, ());
    install_state(env, &feed_addr, decimals, 300);
    let cfg = FeedConfig {
        feed: feed_addr.clone(),
        decimals,
    };
    (feed_addr, cfg)
}

fn set_ledger_time(env: &Env, ts: u64) {
    // Sadece timestamp güncelle, protocol_version vb. soroban-sdk default'larından kalsın.
    let mut info = env.ledger().get();
    info.timestamp = ts;
    env.ledger().set(info);
}

#[test]
fn happy_path_lastprice_okunur() {
    let env = Env::default();
    set_ledger_time(&env, 1_000_000);
    let (feed, _cfg) = setup_mock_feed(&env, 14);
    let asset = Asset::Other(symbol_short!("BTC"));

    let price_value = 50_000i128 * 10i128.pow(14);
    install_lastprice(&env, &feed, &asset, price_value, 999_700);

    let result = checked_lastprice(&env, &feed, &asset);
    assert!(result.is_ok(), "happy path → Ok beklenir, ama {:?}", result);
    let pd = result.unwrap();
    assert_eq!(pd.price, price_value);
    assert_eq!(pd.timestamp, 999_700);
}

#[test]
fn eksik_fiyat_price_unavailable_verir() {
    let env = Env::default();
    set_ledger_time(&env, 1_000_000);
    let (feed, _cfg) = setup_mock_feed(&env, 14);
    let asset = Asset::Other(symbol_short!("ETH"));

    let result = checked_lastprice(&env, &feed, &asset);
    assert_eq!(result, Err(HeliosError::PriceUnavailable));
}

#[test]
fn stale_fiyat_oracle_stale_verir() {
    let env = Env::default();
    let now: u64 = 1_000_000;
    set_ledger_time(&env, now);
    let (feed, _cfg) = setup_mock_feed(&env, 14);
    let asset = Asset::Other(symbol_short!("BTC"));

    let price_value = 50_000i128 * 10i128.pow(14);
    install_lastprice(&env, &feed, &asset, price_value, now - 700);

    let result = checked_lastprice(&env, &feed, &asset);
    assert_eq!(result, Err(HeliosError::OracleStale));
}

#[test]
fn normalize_14_decimal_7_decimale_dogru() {
    let raw = 100_000_000_000_000i128;
    assert_eq!(normalize_price(raw, 14, 7).unwrap(), 10_000_000);

    let raw_low = 10_000_000i128;
    assert_eq!(
        normalize_price(raw_low, 7, 14).unwrap(),
        100_000_000_000_000
    );
}

#[test]
fn checked_prices_records_sifir_invalid_params() {
    let env = Env::default();
    set_ledger_time(&env, 1_000_000);
    let (feed, _cfg) = setup_mock_feed(&env, 14);
    let asset = Asset::Other(symbol_short!("BTC"));

    let result = checked_prices(&env, &feed, &asset, 0);
    assert_eq!(result, Err(HeliosError::InvalidParams));
}

#[test]
fn checked_prices_history_yokken_unavailable() {
    let env = Env::default();
    set_ledger_time(&env, 1_000_000);
    let (feed, _cfg) = setup_mock_feed(&env, 14);
    let asset = Asset::Other(symbol_short!("BTC"));

    let result = checked_prices(&env, &feed, &asset, 10);
    assert_eq!(result, Err(HeliosError::PriceUnavailable));
}

#[test]
fn checked_prices_uc_kayit_geri_doner() {
    let env = Env::default();
    set_ledger_time(&env, 1_000_000);
    let (feed, _cfg) = setup_mock_feed(&env, 14);
    let asset = Asset::Other(symbol_short!("BTC"));

    let history = Vec::from_array(
        &env,
        [
            PriceData { price: 100, timestamp: 999_400 },
            PriceData { price: 110, timestamp: 999_550 },
            PriceData { price: 105, timestamp: 999_700 },
        ],
    );
    install_history(&env, &feed, &asset, history);

    let result = checked_prices(&env, &feed, &asset, 3).unwrap();
    assert_eq!(result.len(), 3);
    assert_eq!(result.get(0).unwrap().price, 100);
    assert_eq!(result.get(2).unwrap().price, 105);
}

#[test]
fn sanity_bound_yuksek_sapmada_revert() {
    let env = Env::default();
    let prices = Vec::from_array(
        &env,
        [
            PriceData { price: 100, timestamp: 0 },
            PriceData { price: 100, timestamp: 0 },
            PriceData { price: 100, timestamp: 0 },
        ],
    );
    assert_eq!(
        ensure_sanity(150, &prices),
        Err(HeliosError::PriceSanityBoundExceeded)
    );
}

#[test]
fn freshness_helper_eski_timestamp_revert() {
    let env = Env::default();
    set_ledger_time(&env, 1_000_000);
    let pd = PriceData { price: 1, timestamp: 999_300 };
    assert_eq!(ensure_fresh(&env, &pd), Err(HeliosError::OracleStale));
}

#[test]
fn freshness_helper_taze_timestamp_gecer() {
    let env = Env::default();
    set_ledger_time(&env, 1_000_000);
    let pd = PriceData { price: 1, timestamp: 999_700 };
    assert_eq!(ensure_fresh(&env, &pd), Ok(()));
}

#[test]
fn registry_assetid_dogru_feed_ve_asset_uretiyor() {
    let env = Env::default();
    let dex_feed = <Address as soroban_sdk::testutils::Address>::generate(&env);
    let cex_feed = <Address as soroban_sdk::testutils::Address>::generate(&env);
    let usdc = <Address as soroban_sdk::testutils::Address>::generate(&env);
    let xlm = <Address as soroban_sdk::testutils::Address>::generate(&env);

    let set = OracleSet {
        stellar_dex: FeedConfig { feed: dex_feed.clone(), decimals: 14 },
        external_cex_dex: FeedConfig { feed: cex_feed.clone(), decimals: 14 },
        usdc_sac: usdc.clone(),
        xlm_sac: xlm.clone(),
    };

    let usdc_q = reflector_asset_for(&env, AssetId::Usdc, &set).unwrap();
    assert_eq!(usdc_q.feed.feed, dex_feed);
    match usdc_q.asset {
        Asset::Stellar(a) => assert_eq!(a, usdc),
        _ => panic!("USDC için Stellar variant beklenir"),
    }

    let btc_q = reflector_asset_for(&env, AssetId::WBtc, &set).unwrap();
    assert_eq!(btc_q.feed.feed, cex_feed);
    match btc_q.asset {
        Asset::Other(s) => assert_eq!(s, symbol_short!("BTC")),
        _ => panic!("wBTC için Other(Symbol) variant beklenir"),
    }
}
