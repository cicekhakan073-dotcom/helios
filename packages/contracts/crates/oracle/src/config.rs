//! Oracle feed konfigürasyonu — runtime'da geçirilen Reflector feed adresleri.
//!
//! AUDIT §2.2 — Helios iki ayrı Reflector feed'i kullanır:
//!   - Stellar DEX feed: XLM + USDC fiyatları (`Asset::Stellar(sac_address)`)
//!   - External CEX & DEX feed: wBTC + wETH (`Asset::Other(symbol_short!("BTC"|"ETH"))`)
//!
//! Adresler **PROMPT 15** deploy script tarafından `.env`/`addresses.json`'a
//! yazılır; bu kontrat init sırasında `Env::storage().instance()` üzerinden
//! tutar. Bu modül adresleri **DEPOLAMAZ** — sadece tip ve config struct.

use soroban_sdk::{contracttype, Address};

/// Tek bir Reflector feed config'i.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeedConfig {
    /// Feed contract ID (Soroban Address).
    pub feed: Address,
    /// Bu feed'in `decimals()` çağrısının dönüş değeri.
    /// Init sırasında okuyup cache'lemek gas tasarrufu sağlar.
    pub decimals: u32,
}

/// Helios'un kullandığı tüm feed'lerin toplamı + SAC adresleri.
///
/// `usdc_sac` ve `xlm_sac`: Stellar Asset Contract adresleri (Reflector'a
/// `Asset::Stellar(addr)` olarak gönderilir).
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OracleSet {
    /// XLM + USDC için kullanılan Stellar DEX feed.
    /// AUDIT §2.2 — testnet adres örneği:
    ///   `CAVLP5DH2GJPZMVO7IJY4CVOD5MWEFTJFVPD2YY2FQXOQHRGHK4D6HLP`
    /// # DOĞRULA — testnet reset'te değişebilir, deploy anında resmi
    /// kaynaktan yeniden çek.
    pub stellar_dex: FeedConfig,

    /// wBTC + wETH için kullanılan External CEX & DEX feed.
    /// AUDIT §2.2 — testnet adres örneği:
    ///   `CCYOZJCOPG34LLQQ7N24YXBM7LL62R7ONMZ3G6WZAAYPB5OYKOMJRN63`
    /// # DOĞRULA — testnet reset'te değişebilir, deploy anında resmi
    /// kaynaktan yeniden çek.
    pub external_cex_dex: FeedConfig,

    /// USDC SAC adresi (mock token PROMPT 15'te deploy edilir).
    /// # DOĞRULA — deploy çıktısından alınır.
    pub usdc_sac: Address,

    /// XLM native SAC adresi (testnet'te zaten var, deploy YOK).
    /// # DOĞRULA — testnet RPC üzerinden teyit.
    pub xlm_sac: Address,
}
