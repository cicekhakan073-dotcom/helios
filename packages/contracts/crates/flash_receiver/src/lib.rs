//! `flash_receiver` — Blend v2 flash_loan callback alıcısı.
//!
//! ## Neden AYRI kontrat (AUDIT 2026-06-03 — re-entry düzeltmesi)
//!
//! Blend `pool.flash_loan(from, FlashLoan{contract, asset, amount}, requests)`:
//!   1. flash'ı `FlashLoan.contract`'a transfer eder
//!   2. `FlashLoanClient(contract).exec_op(&from, &asset, &amount, &0)` çağırır
//!
//! Eğer `contract == strategy_router` olursa çağrı zinciri
//! `router.open_position → pool.flash_loan → router.exec_op` olur ki bu
//! **router'ın re-entry'sidir** ve Soroban (`ContractReentryMode::Prohibited`)
//! bunu **yasaklar** → `Error(Context, InvalidAction)` / "Contract re-entry is
//! not allowed" (canlı testnet'te doğrulandı 2026-06-03).
//!
//! Çözüm: `FlashLoan.contract`'ı **router'dan ayrı bu kontrat** yap. Zincir
//! `router → pool → flash_receiver` olur; hiçbir kontrat iki kez girilmez → re-entry yok.
//!
//! ## exec_op davranışı
//!
//! Pool flash'ı bu kontrata gönderir; biz onu `caller` (open_position'daki user)
//! adresine **ilet**iriz. Böylece sonraki `SupplyCollateral(principal+flash)`
//! request'i user'ın bakiyesinden (principal + yeni gelen flash) fonlanır.
//!
//! ## Güvenlik
//!
//! `caller.require_auth()` **YOK**: bu kontrat yalnız bir flash_loan tx'i sırasında
//! transient bakiye tutar (pool gönderir → biz user'a iletiriz, hepsi tek tx). Flash
//! dışı bir standalone çağrıda kontrat bakiyesi 0 olduğundan transfer 0/no-op olur —
//! sömürü vektörü yok. require_auth eklemek auth-entry karmaşası getirir; transient
//! pass-through için gereksiz.

#![no_std]

use soroban_sdk::{contract, contractimpl, token, Address, Env};

#[contract]
pub struct FlashReceiver;

#[contractimpl]
impl FlashReceiver {
    /// Blend flash_loan callback. İmza Blend `FlashLoan` trait'i + referans
    /// `mocks/moderc3156` ile birebir: `exec_op(caller, token, amount, fee)`.
    /// Aldığı flash'ı `caller`'a (user) iletir.
    pub fn exec_op(env: Env, caller: Address, token_addr: Address, amount: i128, _fee: i128) {
        token::TokenClient::new(&env, &token_addr).transfer(
            &env.current_contract_address(),
            &caller,
            &amount,
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    /// exec_op aldığı flash'ı caller'a (user) iletmeli; receiver transient → 0.
    /// (Router'dan taşındı — AUDIT 2026-06-03 re-entry fix.)
    #[test]
    fn exec_op_flash_i_caller_a_iletir() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let sac = env.register_stellar_asset_contract_v2(admin);
        let token_addr = sac.address();
        let receiver = env.register(FlashReceiver, ());

        let amount: i128 = 25_000;
        // Pool'un flash transfer'ı yerine receiver'ı fonla.
        token::StellarAssetClient::new(&env, &token_addr).mint(&receiver, &amount);

        let tok = token::TokenClient::new(&env, &token_addr);
        let user_pre = tok.balance(&user);
        assert_eq!(tok.balance(&receiver), amount);

        FlashReceiverClient::new(&env, &receiver).exec_op(&user, &token_addr, &amount, &0i128);

        assert_eq!(tok.balance(&receiver), 0, "receiver transient bakiye sıfırlanmalı");
        assert_eq!(tok.balance(&user), user_pre + amount, "flash user'a iletildi");
    }
}
