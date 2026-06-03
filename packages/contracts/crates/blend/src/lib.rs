//! `blend` — Blend v2 lending pool cross-contract istemcisi.
//!
//! Helios kontratları (`strategy_router`, `keeper`) Blend pool'una Supply /
//! Borrow / Repay / Withdraw / Flash-loan çağrıları buradaki helper'lar
//! aracılığıyla yapar.
//!
//! ## Mimari (AUDIT 2026-05-31 §1.1, §1.2)
//!
//! - Blend pool kendi `flash_loan(from, FlashLoan, requests)` fonksiyonunu
//!   sağlar; Helios **ayrı bir flash_lender YAZMAZ**.
//! - Pozisyon defteri Blend'in kendi `get_positions(user) -> Positions`
//!   çağrısıyla okunur; Helios ayrı bir `vault` YAZMAZ.
//! - `strategy_router` sadece `Vec<Request>` ve `FlashLoan` struct'ı kurar,
//!   bu crate üzerinden Blend'e iletir.
//!
//! ## Neden tip aynası (kopya)?
//!
//! Resmi `blend-contract-sdk@2.25.0` `soroban-sdk = "25.0.1"` pinli; Helios
//! pini `=26.0.1` (STELLAR_STACK.md). İki sürüm arası `Symbol/Address` tipi
//! uyumsuz → external crate ile derleme çatışması. Çözüm: Blend public tip
//! ailesi (`Request`, `RequestType`, `FlashLoan`, `Positions`, `PoolConfig`,
//! `Reserve`, `ReserveConfig`, `ReserveData`) `types` modülünde Helios içinde
//! kopya — kaynak `github.com/blend-capital/blend-contracts-v2`'den (2026-05-31)
//! raw doğrulama.
//!
//! ## HF formülü — bu crate'TE YOK (AUDIT §1.5 disiplini)
//!
//! Blend HF içeride `collateral_base / liability_base` formülüyle hesaplanır
//! ama c_factor / l_factor / b_rate / d_rate / oracle fiyat zinciri karmaşık.
//! Helios HF hesabını **off-chain** yapar (PROMPT 13/18 SDK katmanı). Bu
//! crate sadece veri OKUR (Positions + Reserve + PoolConfig), formül
//! uygulamaz.

#![no_std]

pub mod actions;
pub mod client;
pub mod config;
pub mod hf;
pub mod types;

#[cfg(any(test, feature = "testutils"))]
pub mod testutils;

// Public surface
pub use actions::{borrow_req, repay_req, supply_collateral_req, withdraw_collateral_req};
pub use client::{checked_get_config, checked_get_positions, checked_get_reserve};
pub use config::PoolSet;
pub use hf::{collect_hf_readout, compute_hf_bps, sum_underlying_debt, HfReadout, RATE_SCALAR};
pub use types::{
    FlashLoan, PoolClient, PoolConfig, Positions, Request, RequestType, Reserve, ReserveConfig,
    ReserveData,
};

#[cfg(test)]
mod tests;
