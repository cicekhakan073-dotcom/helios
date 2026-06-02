//! Event name sabitleri — tüm Helios kontratlarında topic[0] olarak kullanılır.
//!
//! Soroban event topic'leri `Symbol` tipindedir; max 32 char (a-z, 0-9, _).
//! `Env::events().publish(...)` çağrısında bu string literal'ler
//! `symbol_short!()` veya `Symbol::new(env, ...)` ile sarmalanır.
//!
//! Frontend indexer (PROMPT 18+) bu sabitleri TS aynası ile dinler.

// --- strategy_router events ---------------------------------------------------

pub const EV_POSITION_OPENED: &str = "pos_opened";
pub const EV_POSITION_CLOSED: &str = "pos_closed";
pub const EV_POSITION_PARTIAL: &str = "pos_partial";

// --- keeper events ------------------------------------------------------------

pub const EV_OPT_IN_REGISTERED: &str = "opt_in_reg";
pub const EV_OPT_IN_REMOVED: &str = "opt_in_rem";
pub const EV_REBALANCED: &str = "rebalanced";
pub const EV_REBALANCE_SKIPPED: &str = "reb_skipped";

// --- shared / oracle ----------------------------------------------------------

pub const EV_ORACLE_STALE_DETECTED: &str = "ora_stale";
pub const EV_PRICE_SANITY_REJECTED: &str = "ora_sanity";
