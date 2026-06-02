//! MockBlendPool — Helios kendi minimum Blend pool simülatörü.
//!
//! ## Neden Helios'a özel mock?
//!
//! Resmi `blend-contract-sdk::testutils::BlendFixture` `soroban-sdk = 25.0.1`
//! pinli; Helios `=26.0.1` kullandığı için crate'in import edilmesi tip
//! çatışmasıyla sonuçlanır (sep-40 ile aynı durum, AUDIT §1.2 raporu).
//!
//! ## Mock kapsamı
//!
//! `PoolClient` (Blend `PoolTrait`) için **minimum** fn'ler:
//!   - `submit(from, spender, to, requests)` → Positions
//!   - `flash_loan(from, flash_loan, requests)` → Positions
//!   - `get_positions(user)` → Positions
//!   - `get_reserve(asset)` → Reserve
//!   - `get_config()` → PoolConfig
//!
//! Davranış basitleştirilmiş:
//!   - Request listesini sırayla uygular → kullanıcının `collateral` /
//!     `liabilities` map'lerini güncellenir
//!   - Faiz akümülasyonu YOK (test'ler için gerek olmadığı sürece)
//!   - flash loan tx içinde requests'i uygular; gerçek "transfer + repay
//!     verify" mekaniği yok (Helios router'ı atomiklik testinde gerçek pool
//!     gerektirir — testnet integration ile PROMPT 12'de)
//!
//! Test helper'ları (`install_reserve`, `set_config`, `read_positions`) Rust
//! fn'leri, `#[contractimpl]` dışında — sep-40 mock'undaki pattern.

#![cfg(any(test, feature = "testutils"))]

use soroban_sdk::{
    contract, contractimpl, symbol_short, Address, Env, Map, Symbol, Vec,
};

use crate::types::{
    FlashLoan, PoolConfig, Positions, Request, RequestType, Reserve, ReserveConfig, ReserveData,
};

const KEY_CONFIG: Symbol = symbol_short!("CFG");

#[contract]
pub struct MockBlendPool;

#[contractimpl]
impl MockBlendPool {
    pub fn submit(
        env: Env,
        from: Address,
        _spender: Address,
        _to: Address,
        requests: Vec<Request>,
    ) -> Positions {
        apply_requests(&env, &from, &requests)
    }

    /// Mock flash_loan — gerçek Blend pool akışından **kasıtlı sapma**:
    ///
    /// Gerçek pool `FlashLoanClient(flash.contract).exec_op(...)` çağırır, ama bu
    /// soroban-env-host 26.1.3'te **immediate contract re-entry** sayılır
    /// (router → pool → router) ve `ContractReentryMode::Prohibited` default'u
    /// yüzünden test ortamında `"Contract re-entry is not allowed"` hatası ile
    /// revert eder. soroban-sdk 26.0.1 reentry mode'u dışarı açmadığı için mock
    /// burada exec_op'u **çağırmaz** — yalnız request'leri uygular ve flash
    /// transfer + repayment kontrolünü atlar.
    ///
    /// **exec_op kapsama testi**: `strategy_router::tests` içinde standalone
    /// `exec_op_caller_imzasiyla_user_a_transfer_eder` testi receiver imzasını,
    /// auth gereksinimini ve token transferini doğrudan doğrular.
    ///
    /// **Production akışı bu ayrımı kaldırır** — gerçek Blend pool tx-level
    /// auth + reentry policy'sini canlı testte handle eder (PROMPT 12-FIX
    /// redeploy'unun ardından canlı tx flash callback'i ÇALIŞIYOR; sapma yalnız
    /// off-chain test'lerde, on-chain'de değil).
    pub fn flash_loan(
        env: Env,
        from: Address,
        _flash_loan: FlashLoan,
        requests: Vec<Request>,
    ) -> Positions {
        apply_requests(&env, &from, &requests)
    }

    pub fn get_positions(env: Env, address: Address) -> Positions {
        positions_of(&env, &address)
    }

    pub fn get_reserve(env: Env, asset: Address) -> Reserve {
        env.storage()
            .persistent()
            .get(&(symbol_short!("RSV"), asset))
            .expect("reserve not installed (install_reserve önce çağrılmalı)")
    }

    pub fn get_config(env: Env) -> PoolConfig {
        env.storage()
            .instance()
            .get(&KEY_CONFIG)
            .expect("config not installed (set_config önce çağrılmalı)")
    }
}

// ============================================================================
// Pozisyon defteri yardımcıları (kontrat dışı, mock state'i okuma/yazma)
// ============================================================================

fn positions_key(user: &Address) -> (Symbol, Address) {
    (symbol_short!("POS"), user.clone())
}

fn empty_positions(env: &Env) -> Positions {
    Positions {
        liabilities: Map::new(env),
        collateral: Map::new(env),
        supply: Map::new(env),
    }
}

fn positions_of(env: &Env, user: &Address) -> Positions {
    env.storage()
        .persistent()
        .get(&positions_key(user))
        .unwrap_or_else(|| empty_positions(env))
}

fn save_positions(env: &Env, user: &Address, p: &Positions) {
    env.storage().persistent().set(&positions_key(user), p);
}

fn reserve_index_for(env: &Env, asset: &Address) -> u32 {
    let r: Reserve = env
        .storage()
        .persistent()
        .get(&(symbol_short!("RSV"), asset.clone()))
        .expect("reserve not installed");
    r.config.index
}

/// Tek bir request'i pozisyona uygula (mock; faizsiz).
fn apply_one(env: &Env, p: &mut Positions, asset: &Address, amount: i128, kind: u32) {
    let idx = reserve_index_for(env, asset);
    if kind == RequestType::SupplyCollateral as u32 {
        let prev = p.collateral.get(idx).unwrap_or(0);
        p.collateral.set(idx, prev + amount);
    } else if kind == RequestType::WithdrawCollateral as u32 {
        let prev = p.collateral.get(idx).unwrap_or(0);
        p.collateral.set(idx, prev - amount);
    } else if kind == RequestType::Borrow as u32 {
        let prev = p.liabilities.get(idx).unwrap_or(0);
        p.liabilities.set(idx, prev + amount);
    } else if kind == RequestType::Repay as u32 {
        let prev = p.liabilities.get(idx).unwrap_or(0);
        p.liabilities.set(idx, prev - amount);
    } else if kind == RequestType::Supply as u32 {
        let prev = p.supply.get(idx).unwrap_or(0);
        p.supply.set(idx, prev + amount);
    } else if kind == RequestType::Withdraw as u32 {
        let prev = p.supply.get(idx).unwrap_or(0);
        p.supply.set(idx, prev - amount);
    }
    // Auction request type'larını mock atlar.
}

fn apply_requests(env: &Env, user: &Address, requests: &Vec<Request>) -> Positions {
    let mut p = positions_of(env, user);
    for r in requests.iter() {
        apply_one(env, &mut p, &r.address, r.amount, r.request_type);
    }
    save_positions(env, user, &p);
    p
}


// ============================================================================
// Test helper'ları (kontrat dışı)
// ============================================================================

pub fn set_config(env: &Env, pool: &Address, config: PoolConfig) {
    env.as_contract(pool, || {
        env.storage().instance().set(&KEY_CONFIG, &config);
    });
}

pub fn install_reserve(env: &Env, pool: &Address, asset: &Address, reserve: Reserve) {
    env.as_contract(pool, || {
        env.storage()
            .persistent()
            .set(&(symbol_short!("RSV"), asset.clone()), &reserve);
    });
}

/// Hızlı bir varsayılan rezerv config (testlerde tek satırlık setup için).
pub fn default_reserve_config() -> ReserveConfig {
    ReserveConfig {
        index: 0,
        decimals: 7,
        c_factor: 8500, // 0.85
        l_factor: 8000, // 0.80
        util: 0,
        max_util: 9_500,
        r_base: 100,
        r_one: 500,
        r_two: 5_000,
        r_three: 50_000,
        reactivity: 0,
        supply_cap: i128::MAX,
        enabled: true,
    }
}

pub fn default_reserve_data() -> ReserveData {
    ReserveData {
        d_rate: 1_000_000_000,
        b_rate: 1_000_000_000,
        ir_mod: 1_000_000_000,
        b_supply: 0,
        d_supply: 0,
        backstop_credit: 0,
        last_time: 0,
    }
}
