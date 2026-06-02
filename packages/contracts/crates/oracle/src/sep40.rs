//! SEP-40 (Stellar Price Feed Oracle) minimum trait + tipler — **Helios kopya**.
//!
//! ## Neden burada kopya?
//!
//! Resmi `sep-40-oracle` crate (1.4.0) `soroban-sdk = "25.0.1"` workspace
//! pini kullanıyor; Helios pin'i `=26.0.1` (STELLAR_STACK.md). İki sürüm arası
//! `Symbol`/`Address` tipleri uyumsuz → resmi crate'i kullanmak derlemeyi
//! çatışmaya sokuyor. Çözüm: SEP-40 trait'i Helios içinde 1-1 kopya tanımlı.
//!
//! ## Kaynak doğrulaması
//!
//! - github.com/script3/sep-40-oracle/blob/main/sep-40/src/lib.rs (raw)
//! - Doğrulama tarihi: 2026-05-31 (AUDIT 2026-05-31 §1.5)
//! - Uyumluluk: imzalar **birebir** kopya. Yeni Reflector sürümlerini takip et;
//!   AUDIT'in `helios-known-unknowns` memory'sinde kayıtlı.
//!
//! ## API yüzeyi
//!
//! - `PriceFeedTrait` — `#[contractclient(name = "PriceFeedClient")]` macro'su
//!   ile cross-contract çağrı sınıfı üretilir.
//! - `Asset` enum: `Stellar(Address)` (SAC tokenları) | `Other(Symbol)` (sembolik).
//! - `PriceData` struct: `{ price: i128, timestamp: u64 }`.
//!
//! Reflector kontratları bu trait'i implement eder; biz çağıran tarafız.

use soroban_sdk::{contractclient, contracttype, Address, Env, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PriceData {
    pub price: i128,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Asset {
    Stellar(Address),
    Other(Symbol),
}

#[contractclient(name = "PriceFeedClient")]
pub trait PriceFeedTrait {
    fn base(env: Env) -> Asset;
    fn assets(env: Env) -> Vec<Asset>;
    fn decimals(env: Env) -> u32;
    fn resolution(env: Env) -> u32;
    fn price(env: Env, asset: Asset, timestamp: u64) -> Option<PriceData>;
    fn prices(env: Env, asset: Asset, records: u32) -> Option<Vec<PriceData>>;
    fn lastprice(env: Env, asset: Asset) -> Option<PriceData>;
}
