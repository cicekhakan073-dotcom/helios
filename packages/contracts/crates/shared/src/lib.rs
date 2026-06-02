//! `shared` — Helios kontratları arasında paylaşılan tipler, hatalar, sabitler.
//!
//! `no_std` zorunlu (Soroban kısıtı). Buradaki tipler tüm Helios crate'leri
//! (`strategy_router`, `keeper`) tarafından tüketilir.
//!
//! AUDIT 2026-05-31 (../../../ROADMAP.md "AUDIT" bölümü) yansımaları:
//!   §1.1 — Mimari sadeleşme: 4 → 2 (+1 shared). flash_lender ve vault SİLİNDİ.
//!   §1.5 — HF eşik sayıları (1.5/1.2/1.0) burada tek kaynak; TS SDK ile drift
//!          testi PROMPT 18'de.
//!   §1.6 — Oracle güvenlik sabitleri (Blend 2025 oracle exploit yansıması).
//!   §2.2 — Asset registry: AssetId → (feed_address, Asset::Stellar/Other).
//!   §2.4 — TTL sabitleri (persistent low=30d/high=60d; instance low=7d/high=30d).

#![no_std]

pub mod asset;
pub mod error;
pub mod events;
pub mod hf;
pub mod oracle_guard;
pub mod ttl;

// Public re-exports — diğer crate'ler tek import ile alır.
pub use asset::{AssetId, Position};
pub use error::HeliosError;
pub use hf::{
    effective_collateral, effective_liability, health_factor_bps, liquidation_price,
    project_hf_bps, risk_band, HfBand, BPS_DENOM, HF_CAUTION_MIN, HF_CAUTION_MIN_BPS,
    HF_HEALTHY_MIN, HF_HEALTHY_MIN_BPS, HF_LIQUIDATION, HF_LIQUIDATION_BPS, HF_SCALE,
};
pub use oracle_guard::{
    ORACLE_PRICE_DEVIATION_BPS, ORACLE_STALENESS_HARD_SECS, ORACLE_STALENESS_WARN_SECS,
};
pub use ttl::{
    INSTANCE_TTL_BUMP_HIGH, INSTANCE_TTL_BUMP_LOW, PERSISTENT_TTL_BUMP_HIGH,
    PERSISTENT_TTL_BUMP_LOW,
};
