//! `HeliosError` — tüm Helios kontratlarının paylaştığı typed hata enum'u.
//!
//! Numara aralıkları (drift'i önlemek için sabitlendi):
//!   1-9    : Genel (auth, paused, params)
//!   10-19  : Position lifecycle
//!   20-29  : Strategy / leverage
//!   30-39  : Oracle (AUDIT §1.6 — Blend 2025 exploit yansıması)
//!   40-49  : Blend cross-contract
//!   50-59  : Keeper / opt-in
//!   60-69  : Token / SEP-41
//!   70-79  : Storage / TTL
//!
//! Yeni hata eklerken **mevcut numarayı asla değiştirme** — frontend (PROMPT 19)
//! kod → kullanıcı mesajı eşleme tablosu bu numaralara dayanır.

use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum HeliosError {
    // -- 1-9: Generic ----------------------------------------------------
    Unauthorized = 1,
    Paused = 2,
    InvalidParams = 3,
    NotInitialized = 4,
    AlreadyInitialized = 5,

    // -- 10-19: Position lifecycle --------------------------------------
    PositionNotFound = 10,
    PositionAlreadyOpen = 11,
    InsufficientCollateral = 12,
    InsufficientLiquidity = 13,

    // -- 20-29: Strategy / leverage -------------------------------------
    LeverageTooHigh = 20,
    UnsafeHealthFactor = 21,
    RouterStepFailed = 22,
    SlippageExceeded = 23,
    FlashRepayFailed = 24,

    // -- 30-39: Oracle (AUDIT §1.6) -------------------------------------
    OracleStale = 30,
    PriceUnavailable = 31,
    PriceSanityBoundExceeded = 32, // |last − TWAP(N)| / TWAP > eşik
    OracleNotConfigured = 33,

    // -- 40-49: Blend cross-contract ------------------------------------
    BlendCallFailed = 40,
    PoolNotConfigured = 41,
    BlendPositionRead = 42,

    // -- 50-59: Keeper / opt-in -----------------------------------------
    NotOptedIn = 50,
    NoActionNeeded = 51,
    DeleverageCapExceeded = 52,
    KeeperRoleRequired = 53,

    // -- 60-69: Token / SEP-41 ------------------------------------------
    UnsupportedAsset = 60,
    AssetNotInRegistry = 61,

    // -- 70-79: Storage / TTL -------------------------------------------
    TtlExtendFailed = 70,

    // -- 80-89: HF / risk calculation -----------------------------------
    /// Borç yok — HF matematiksel olarak sonsuz; tüketici tarafı `Option::None`
    /// veya `i128::MAX` semantik olarak ele almalı.
    ZeroDebt = 80,
    /// Hesaplama (mul/pow) i128 sınırını aştı.
    HfOverflow = 81,
}
