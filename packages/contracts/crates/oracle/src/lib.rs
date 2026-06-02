//! `oracle` — Reflector V3 (SEP-40) cross-contract istemcisi.
//!
//! Helios kontratları (`strategy_router`, `keeper`, gelecekte HF mantığı)
//! buradaki helper'ları çağırır. Bu crate **rlib**'dir; kendi başına deploy
//! edilmez, başka kontratlardan import edilir.
//!
//! AUDIT 2026-05-31 yansımaları:
//!   §1.5 — SEP-40 trait imzaları canlı kaynaktan doğrulandı; sep-40-oracle
//!          1.4.0 `PriceFeedClient` macro'su kullanılır.
//!   §1.6 — Oracle güvenlik gereksinimleri (staleness + sanity bound) bu
//!          crate'in `guard` modülünde uygulanır. **Her** fiyat okuması bu
//!          guard'lardan geçmelidir.
//!   §2.2 — Pulse feed mapping (`registry` modülü):
//!            USDC/XLM → Stellar DEX feed (`Asset::Stellar(sac)`)
//!            wBTC/wETH → External CEX & DEX feed (`Asset::Other(symbol)`)
//!
//! Feed contract ID'leri **runtime'da** config struct olarak geçirilir;
//! kontrat/crate seviyesinde hardcode YOK. Adresler PROMPT 15 deploy script'inde
//! `.env`/`addresses.json`'a yazılır.

#![no_std]

pub mod client;
pub mod config;
pub mod guard;
pub mod normalize;
pub mod registry;
pub mod sep40;

#[cfg(any(test, feature = "testutils"))]
pub mod testutils;

// Public surface — Helios kontratlarının doğrudan tüketeceği fn'ler.
pub use client::{checked_lastprice, checked_prices};
pub use config::{FeedConfig, OracleSet};
pub use guard::{ensure_fresh, ensure_sanity};
pub use normalize::normalize_price;
pub use registry::reflector_asset_for;

// Type re-exports — kullanıcılar bizden alabilsin SEP-40 import zincirini
// yazmasın.
pub use sep40::{Asset, PriceData, PriceFeedClient};

#[cfg(test)]
mod tests;
