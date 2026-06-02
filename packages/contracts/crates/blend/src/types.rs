//! Blend v2 pool public tip ailesi — **Helios kopya**.
//!
//! ## Kaynak doğrulaması (2026-05-31)
//!
//! - `Request`, `RequestType`, `FlashLoan`:
//!     github.com/blend-capital/blend-contracts-v2/blob/main/pool/src/pool/actions.rs
//! - `Positions`:
//!     github.com/blend-capital/blend-contracts-v2/blob/main/pool/src/pool/user.rs
//! - `PoolConfig`, `ReserveConfig`, `ReserveData`:
//!     github.com/blend-capital/blend-contracts-v2/blob/main/pool/src/storage.rs
//! - `Reserve`:
//!     github.com/blend-capital/blend-contracts-v2/blob/main/pool/src/pool/reserve.rs
//! - `PoolClient` macro fn imzaları:
//!     github.com/blend-capital/blend-contracts-v2/blob/main/pool/src/contract.rs
//!
//! Tipler birebir kopya; alanı/sırayı/tipi değiştirmeyin (Soroban
//! `#[contracttype]` ABI sıralı serializasyon kullanır → değişiklik
//! cross-contract çağrıları kırar).

use soroban_sdk::{contractclient, contracttype, Address, Env, Map, Vec};

// ============================================================================
// Action requests — pool.submit/flash_loan'a verilen birim emir
// ============================================================================

/// Tek bir pool aksiyonu (`submit` veya `flash_loan` requests vec'inde geçen).
#[contracttype]
#[derive(Clone, Debug)]
pub struct Request {
    /// `RequestType` u32 değeri — `as u32` ile cast edilir.
    pub request_type: u32,
    /// İlgili asset SAC adresi.
    pub address: Address,
    /// Miktar (decimals: asset'in kendi decimals'ı).
    pub amount: i128,
}

/// Pool aksiyon türleri. Numara değerleri **kalıcı sözleşmedir** (`Request.request_type`).
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RequestType {
    Supply = 0,
    Withdraw = 1,
    SupplyCollateral = 2,
    WithdrawCollateral = 3,
    Borrow = 4,
    Repay = 5,
    FillUserLiquidationAuction = 6,
    FillBadDebtAuction = 7,
    FillInterestAuction = 8,
    DeleteLiquidationAuction = 9,
}

/// Flash loan parametreleri.
///
/// `contract`: flash money'i alacak alıcı (Helios'ta `strategy_router`).
/// Pool, `amount` kadar `asset`'i `contract`'e gönderir, sonra `requests`
/// vec'ini sırayla yürütür, tx sonunda repayment'ı doğrular.
#[contracttype]
#[derive(Clone, Debug)]
pub struct FlashLoan {
    pub contract: Address,
    pub asset: Address,
    pub amount: i128,
}

// ============================================================================
// User pozisyon defteri (Blend tarafında)
// ============================================================================

/// Kullanıcının pool'daki pozisyonu (Blend `get_positions(user)` döner).
///
/// `Map<u32, i128>` anahtarı `reserve.config.index` (rezerv sıra numarası).
/// Değerler **b-token / d-token shareları**dır — gerçek asset miktarına
/// `reserve.scalar` + `reserve.data.b_rate`/`d_rate` ile çevrilir.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Positions {
    /// Borçlar (debt tokens, per reserve index).
    pub liabilities: Map<u32, i128>,
    /// Collateral olarak verilmiş supply (b-tokens, per reserve index).
    pub collateral: Map<u32, i128>,
    /// Collateral olmayan supply (b-tokens, per reserve index).
    pub supply: Map<u32, i128>,
}

// ============================================================================
// Pool / Reserve metadata
// ============================================================================

#[contracttype]
#[derive(Clone, Debug)]
pub struct PoolConfig {
    pub oracle: Address,
    pub min_collateral: i128,
    /// Backstop rate (basis points-like).
    pub bstop_rate: u32,
    /// Pool status (0 = active, vb.)
    pub status: u32,
    /// Max position sayısı (AUDIT §5 — testnet için deploy anında okunmalı).
    pub max_positions: u32,
}

/// Tek bir rezervin (asset'in) konfigürasyonu.
///
/// `c_factor` ve `l_factor` u32 basis points/10000 → HF hesabında çarpan.
/// Bu değerler Blend tarafında set edilir; Helios **OKUR**, override etmez.
#[contracttype]
#[derive(Clone, Debug)]
pub struct ReserveConfig {
    pub index: u32,
    pub decimals: u32,
    /// Collateral factor (örn. 8500 = 0.85). HF hesabında collateral'ı discount eder.
    pub c_factor: u32,
    /// Liability factor (örn. 8000 = 0.80). HF hesabında borç'u penalty'ler.
    pub l_factor: u32,
    pub util: u32,
    pub max_util: u32,
    pub r_base: u32,
    pub r_one: u32,
    pub r_two: u32,
    pub r_three: u32,
    pub reactivity: u32,
    pub supply_cap: i128,
    pub enabled: bool,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct ReserveData {
    pub d_rate: i128,
    pub b_rate: i128,
    pub ir_mod: i128,
    pub b_supply: i128,
    pub d_supply: i128,
    pub backstop_credit: i128,
    pub last_time: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct Reserve {
    pub asset: Address,
    pub config: ReserveConfig,
    pub data: ReserveData,
    /// `10^decimals` — sabit nokta math için.
    pub scalar: i128,
}

// ============================================================================
// PoolClient — cross-contract çağrı sınıfı
// ============================================================================

/// Blend pool `submit/flash_loan/get_positions/get_reserve/get_config` çağrıları.
///
/// Bu trait'in implement edileceği yer **Helios içinde DEĞİL** — gerçek Blend
/// pool kontratı (testnet'te zaten deploy'lu) implement eder. Macro üzerinden
/// `PoolClient::new(env, &pool_addr)` ile çağrılır.
///
/// Mock için `testutils::MockBlendPool` bu trait'in minimum subset'ini
/// implement eder.
#[contractclient(name = "PoolClient")]
pub trait PoolTrait {
    fn submit(
        env: Env,
        from: Address,
        spender: Address,
        to: Address,
        requests: Vec<Request>,
    ) -> Positions;

    fn flash_loan(
        env: Env,
        from: Address,
        flash_loan: FlashLoan,
        requests: Vec<Request>,
    ) -> Positions;

    fn get_positions(env: Env, address: Address) -> Positions;
    fn get_reserve(env: Env, asset: Address) -> Reserve;
    fn get_config(env: Env) -> PoolConfig;
}
