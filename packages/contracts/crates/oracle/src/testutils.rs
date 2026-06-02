//! Mock SEP-40 oracle kontratı — testler için.
//!
//! `testutils` feature behind. PROMPT 11+'da strategy_router/keeper testleri
//! de bu mock'u register edebilir.
//!
//! ## Tasarım
//!
//! Mock kontratın `#[contractimpl]`'i **yalnızca SEP-40 trait fn'lerini**
//! içerir (lastprice / prices / decimals / resolution). Bu sayede
//! `PriceFeedClient::new(env, &mock_addr)` üzerinden Helios production kodu
//! mock'a şeffaf bağlanır.
//!
//! Test helper'ları (`install_*`) `#[contractimpl]` DIŞINDA Rust fn'leridir —
//! `env.as_contract(addr, || ...)` ile doğrudan storage'a yazar. Bu pattern
//! soroban-sdk testutils standardıdır ve `MockReflectorClient` macro
//! dağılımıyla uyumsuzluk yaratmaz.

#![cfg(any(test, feature = "testutils"))]

use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol, Vec};

use crate::sep40::{Asset, PriceData};

const STATE_DECIMALS: Symbol = symbol_short!("DEC");
const STATE_RESOLUTION: Symbol = symbol_short!("RES");
const LAST_KEY: Symbol = symbol_short!("LAST");
const HIST_KEY: Symbol = symbol_short!("HIST");

#[contract]
pub struct MockReflector;

#[contractimpl]
impl MockReflector {
    /// SEP-40 `lastprice` — `Option<PriceData>`.
    pub fn lastprice(env: Env, asset: Asset) -> Option<PriceData> {
        env.storage().persistent().get(&(LAST_KEY, asset))
    }

    /// SEP-40 `prices` — son `records` örnek.
    pub fn prices(env: Env, asset: Asset, records: u32) -> Option<Vec<PriceData>> {
        let full: Option<Vec<PriceData>> = env.storage().persistent().get(&(HIST_KEY, asset));
        full.map(|v| {
            let take = records.min(v.len());
            let mut out = Vec::new(&env);
            for i in 0..take {
                if let Some(p) = v.get(i) {
                    out.push_back(p);
                }
            }
            out
        })
    }

    /// SEP-40 `decimals` — sabit ölçek.
    pub fn decimals(env: Env) -> u32 {
        env.storage().instance().get(&STATE_DECIMALS).unwrap_or(0)
    }

    /// SEP-40 `resolution` — saniye cinsinden update aralığı.
    pub fn resolution(env: Env) -> u32 {
        env.storage().instance().get(&STATE_RESOLUTION).unwrap_or(0)
    }
}

// =================== Test helper'ları (kontrat dışı Rust fn'leri) ===================
//
// `env.as_contract(&addr, || ...)` storage'a doğrudan yazar; client method
// çağırmaz, dolayısıyla #[contractimpl]/macro-üretilen-client dağılımına
// bağımlı değildir.

pub fn install_state(env: &Env, feed: &Address, decimals: u32, resolution: u32) {
    env.as_contract(feed, || {
        env.storage().instance().set(&STATE_DECIMALS, &decimals);
        env.storage().instance().set(&STATE_RESOLUTION, &resolution);
    });
}

pub fn install_lastprice(env: &Env, feed: &Address, asset: &Asset, price: i128, timestamp: u64) {
    let pd = PriceData { price, timestamp };
    env.as_contract(feed, || {
        env.storage()
            .persistent()
            .set(&(LAST_KEY, asset.clone()), &pd);
    });
}

pub fn install_history(env: &Env, feed: &Address, asset: &Asset, prices: Vec<PriceData>) {
    env.as_contract(feed, || {
        env.storage()
            .persistent()
            .set(&(HIST_KEY, asset.clone()), &prices);
    });
}
