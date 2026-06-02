//! Helios desteklenen varlık ailesi + pozisyon defteri tipi.
//!
//! AUDIT §2.2 — Reflector feed eşleşmesi (testnet):
//!   USDC/XLM → Stellar DEX feed (Asset::Stellar variant)
//!   wBTC/wETH → External CEX & DEX feed (Asset::Other(Symbol) variant)
//!
//! AUDIT §2.1 — Mock SEP-41 tokenları (USDC/wBTC/wETH) PROMPT 15 deploy
//! script'inde üretilir; XLM native SAC. Adresler runtime'da config'ten okunur,
//! shared'da hardcode YOK.

use soroban_sdk::contracttype;

#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum AssetId {
    Usdc = 0,
    Xlm = 1,
    WBtc = 2,
    WEth = 3,
}

/// Helios pozisyon defteri kaydı.
///
/// **NOT** — Blend pool zaten `get_positions(user) -> Positions` ile collateral
/// + debt'i tutar (AUDIT §1.1). Bu yapı Helios'a özel meta bilgileri taşır:
/// giriş fiyatı, kullanıcının seçtiği leverage, keeper opt-in işareti.
///
/// Mimari kararı (AUDIT §1.1): pozisyon meta'sı **off-chain Neon DB**'de
/// (PROMPT 30) tutulur. Bu struct yine de event payload ve test fixtures için
/// burada `#[contracttype]` olarak dursun; ileride helios_position_meta
/// kontratı (opsiyonel) eklenirse direkt kullanılır.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Position {
    pub user: soroban_sdk::Address,
    pub collateral_asset: AssetId,
    pub debt_asset: AssetId,
    /// Kullanıcının başlangıç sermayesi (decimals: collateral_asset'in decimals'ı).
    pub principal: i128,
    /// Leverage çarpanı × 100 (örn. 3x → 300). Sabit nokta integer.
    pub leverage_bps_hundredths: u32,
    /// Pozisyon açılışındaki collateral asset fiyatı (oracle'dan).
    pub entry_price: i128,
    /// Oracle decimal sayısı (PriceFeedTrait::decimals() dönüşü).
    pub entry_price_decimals: u32,
    /// Pozisyon açılış zamanı (ledger seconds).
    pub opened_at: u64,
}
