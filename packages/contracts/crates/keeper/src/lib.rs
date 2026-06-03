//! `keeper` — Helios Auto-Rebalancer (opt-in tabanlı kısmi deleverage).
//!
//! ## Akış (AUDIT 2026-05-31 §2.3 — hybrid model)
//!
//! 1. **Kullanıcı opt-in verir** (`register_opt_in`): trigger_hf, target_hf,
//!    max_deleverage_bps. Persistent storage'da tutulur.
//! 2. **Off-chain cron** (PROMPT 29) Neon mirror'dan opt-in'leri çeker,
//!    Blend'den her birinin HF'sini hesaplar, trigger altı olanlar için
//!    deleverage parametrelerini hesaplar.
//! 3. **Cron `keeper.rebalance(...)` çağırır.** On-chain keeper:
//!    - keeper rolü kontrolü
//!    - opt-in var mı + aktif mi
//!    - HF Blend'den oku — trigger altında mı (NoActionNeeded değilse)
//!    - cap kontrolü: `debt_amount ≤ max_deleverage_bps × raw_debt / 10000`
//!    - **router.close_position çağrı** — Blend pool atomik repay+withdraw
//! 4. **Fonların yolu:** Blend pool collateral'ı **kullanıcıya** çıkarır
//!    (router.close_position 'user' adresini geçirir). Keeper hesabı asla
//!    fon almaz.
//!
//! ## Güvenlik invariantları
//!
//! - Kullanıcı opt-in olmadan dokunulamaz (`NotOptedIn`).
//! - HF güvenli iken çalışmaz (`NoActionNeeded`).
//! - Cap'i aşamaz (`DeleverageCapExceeded`).
//! - Yalnız "keeper rolü" çağırabilir (`KeeperRoleRequired`).
//! - Pausable.

#![no_std]

use blend::{collect_hf_readout, compute_hf_bps, sum_underlying_debt};
use shared::HeliosError;
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, IntoVal, Symbol, Val, Vec,
};

// ============================================================================
// Storage keys
// ============================================================================

const KEY_ADMIN: Symbol = symbol_short!("admin");
const KEY_PAUSED: Symbol = symbol_short!("paused");
const KEY_KEEPER: Symbol = symbol_short!("keeper");
const KEY_POOL: Symbol = symbol_short!("pool");
const KEY_ROUTER: Symbol = symbol_short!("router");
const KEY_OPTIN: Symbol = symbol_short!("optin");

// Persistent (opt-in) için TTL — `shared::ttl` sabitlerinden.
use shared::{PERSISTENT_TTL_BUMP_HIGH, PERSISTENT_TTL_BUMP_LOW};

// ============================================================================
// Public tipler
// ============================================================================

/// Kullanıcının auto-rebalance opt-in parametreleri.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OptIn {
    /// HF < trigger ise keeper devreye girer (×100 ölçek, `shared::hf` uyumlu).
    pub trigger_hf_bps: u32,
    /// Hedef HF (off-chain cron'a referans; on-chain doğrulayıcı değil).
    pub target_hf_bps: u32,
    /// Tek seferde debt'in en fazla yüzde kaçını kapatabilir (×10000).
    pub max_deleverage_bps: u32,
    /// Kullanıcı kapatırsa `false` — silmek yerine flag ile tutuyoruz ki
    /// off-chain mirror'ın senkronu basit kalsın.
    pub active: bool,
}

// ============================================================================
// Helpers
// ============================================================================

fn admin(env: &Env) -> Result<Address, HeliosError> {
    env.storage()
        .instance()
        .get(&KEY_ADMIN)
        .ok_or(HeliosError::NotInitialized)
}

fn keeper(env: &Env) -> Result<Address, HeliosError> {
    env.storage()
        .instance()
        .get(&KEY_KEEPER)
        .ok_or(HeliosError::NotInitialized)
}

fn ensure_not_paused(env: &Env) -> Result<(), HeliosError> {
    let paused: bool = env.storage().instance().get(&KEY_PAUSED).unwrap_or(false);
    if paused {
        Err(HeliosError::Paused)
    } else {
        Ok(())
    }
}

fn ensure_keeper(env: &Env, caller: &Address) -> Result<(), HeliosError> {
    let k = keeper(env)?;
    if &k != caller {
        return Err(HeliosError::KeeperRoleRequired);
    }
    Ok(())
}

fn opt_in_key(user: &Address) -> (Symbol, Address) {
    (KEY_OPTIN, user.clone())
}

fn read_opt_in(env: &Env, user: &Address) -> Option<OptIn> {
    env.storage().persistent().get(&opt_in_key(user))
}

fn write_opt_in(env: &Env, user: &Address, opt: &OptIn) {
    let key = opt_in_key(user);
    env.storage().persistent().set(&key, opt);
    env.storage().persistent().extend_ttl(
        &key,
        PERSISTENT_TTL_BUMP_LOW,
        PERSISTENT_TTL_BUMP_HIGH,
    );
}


// ============================================================================
// Contract
// ============================================================================

#[contract]
pub struct Keeper;

#[contractimpl]
impl Keeper {
    /// Init — admin + keeper + bağlı pool + router adresini bağlar.
    pub fn init(
        env: Env,
        admin: Address,
        keeper: Address,
        pool: Address,
        router: Address,
    ) -> Result<(), HeliosError> {
        if env.storage().instance().has(&KEY_ADMIN) {
            return Err(HeliosError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&KEY_ADMIN, &admin);
        env.storage().instance().set(&KEY_KEEPER, &keeper);
        env.storage().instance().set(&KEY_POOL, &pool);
        env.storage().instance().set(&KEY_ROUTER, &router);
        env.storage().instance().set(&KEY_PAUSED, &false);
        Ok(())
    }

    // ========================================================================
    // Opt-in CRUD
    // ========================================================================

    /// Kullanıcı korumayı açar (kendi adına require_auth).
    pub fn register_opt_in(
        env: Env,
        user: Address,
        trigger_hf_bps: u32,
        target_hf_bps: u32,
        max_deleverage_bps: u32,
    ) -> Result<(), HeliosError> {
        user.require_auth();
        ensure_not_paused(&env)?;

        // Param validate
        if trigger_hf_bps < shared::HF_LIQUIDATION as u32 {
            return Err(HeliosError::InvalidParams); // < 1.0 anlamsız
        }
        if target_hf_bps <= trigger_hf_bps {
            return Err(HeliosError::InvalidParams); // target > trigger olmalı
        }
        if max_deleverage_bps == 0 || max_deleverage_bps > 10_000 {
            return Err(HeliosError::InvalidParams); // 0% < cap ≤ 100%
        }

        let opt = OptIn {
            trigger_hf_bps,
            target_hf_bps,
            max_deleverage_bps,
            active: true,
        };
        write_opt_in(&env, &user, &opt);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("optinreg"), user.clone()),
            (trigger_hf_bps, target_hf_bps, max_deleverage_bps),
        );
        Ok(())
    }

    pub fn remove_opt_in(env: Env, user: Address) -> Result<(), HeliosError> {
        user.require_auth();
        ensure_not_paused(&env)?;
        let mut opt = read_opt_in(&env, &user).ok_or(HeliosError::NotOptedIn)?;
        opt.active = false;
        write_opt_in(&env, &user, &opt);

        #[allow(deprecated)]
        env.events()
            .publish((symbol_short!("optinrem"), user.clone()), ());
        Ok(())
    }

    pub fn is_opted_in(env: Env, user: Address) -> bool {
        read_opt_in(&env, &user).map(|o| o.active).unwrap_or(false)
    }

    pub fn get_opt_in(env: Env, user: Address) -> Result<OptIn, HeliosError> {
        read_opt_in(&env, &user).ok_or(HeliosError::NotOptedIn)
    }

    // ========================================================================
    // Rebalance
    // ========================================================================

    /// Cron tarafından çağrılır. Guard'ları geçtikten sonra
    /// router.close_position üzerinden kısmi deleverage tetikler.
    ///
    /// **Parametreler:**
    /// - `caller`: keeper rol adresi (= init'te bağlanan)
    /// - `user`: opt-in'in sahibi
    /// - `asset`: deleverage edilecek asset (collateral_asset == debt_asset MVP)
    /// - `debt_amount`: kapatılacak borç (off-chain hesaplandı)
    /// - `collateral_amount`: çekilecek teminat
    /// - `assets_for_hf` + `prices_for_hf`: Blend HF okuması için paralel
    ///   vektörler (her i'ye karşılık reserve asset + oracle price)
    pub fn rebalance(
        env: Env,
        caller: Address,
        user: Address,
        asset: Address,
        debt_amount: i128,
        collateral_amount: i128,
        assets_for_hf: Vec<Address>,
        prices_for_hf: Vec<i128>,
    ) -> Result<i128, HeliosError> {
        caller.require_auth();
        ensure_keeper(&env, &caller)?;
        ensure_not_paused(&env)?;

        // Param sanity
        if debt_amount <= 0 || collateral_amount <= 0 {
            return Err(HeliosError::InvalidParams);
        }

        // Opt-in kontrolü
        let opt = read_opt_in(&env, &user).ok_or(HeliosError::NotOptedIn)?;
        if !opt.active {
            return Err(HeliosError::NotOptedIn);
        }

        // HF oku (Blend'den)
        let pool: Address = env
            .storage()
            .instance()
            .get(&KEY_POOL)
            .ok_or(HeliosError::NotInitialized)?;
        let readout = collect_hf_readout(&env, &pool, &user, &assets_for_hf)?;
        let current_hf = compute_hf_bps(&readout, &prices_for_hf)?;

        // Trigger kontrolü
        if current_hf >= opt.trigger_hf_bps as i128 {
            #[allow(deprecated)]
            env.events()
                .publish((symbol_short!("rebskip"), user.clone()), current_hf);
            return Err(HeliosError::NoActionNeeded);
        }

        // Cap kontrolü — UNDERLYING cinsinden (scan da underlying debt_amount gönderir;
        // ham d_token cap'i ile uyumsuzluk #52 DeleverageCapExceeded'a yol açıyordu).
        let underlying_debt = sum_underlying_debt(&readout)?;
        if underlying_debt <= 0 {
            return Err(HeliosError::NoActionNeeded);
        }
        let cap = (underlying_debt * opt.max_deleverage_bps as i128) / 10_000;
        if debt_amount > cap {
            return Err(HeliosError::DeleverageCapExceeded);
        }

        // Router → close_position (atomik repay + withdraw, Blend pool tarafında)
        //
        // Cross-contract çağrı `env.invoke_contract` ile dinamik (strategy_router
        // cdylib symbol çakışmasını önlemek için; bkz. Cargo.toml yorumu).
        let router: Address = env
            .storage()
            .instance()
            .get(&KEY_ROUTER)
            .ok_or(HeliosError::NotInitialized)?;
        let args: Vec<Val> = Vec::from_array(
            &env,
            [
                user.clone().into_val(&env),
                asset.clone().into_val(&env),
                debt_amount.into_val(&env),
                collateral_amount.into_val(&env),
            ],
        );
        let fn_name = Symbol::new(&env, "close_position");
        let _: Val = env.invoke_contract(&router, &fn_name, args);

        // Post HF oku (rebalanced event payload'ı için)
        let new_readout = collect_hf_readout(&env, &pool, &user, &assets_for_hf)?;
        let new_hf = compute_hf_bps(&new_readout, &prices_for_hf).unwrap_or(0);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("rebal"), user.clone()),
            (current_hf, new_hf, debt_amount, collateral_amount),
        );

        Ok(new_hf)
    }

    // ========================================================================
    // Admin fn'leri
    // ========================================================================

    pub fn pause(env: Env) -> Result<(), HeliosError> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&KEY_PAUSED, &true);
        Ok(())
    }

    pub fn unpause(env: Env) -> Result<(), HeliosError> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&KEY_PAUSED, &false);
        Ok(())
    }

    pub fn set_keeper(env: Env, new_keeper: Address) -> Result<(), HeliosError> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&KEY_KEEPER, &new_keeper);
        Ok(())
    }

    pub fn get_admin(env: Env) -> Result<Address, HeliosError> {
        admin(&env)
    }

    pub fn get_keeper(env: Env) -> Result<Address, HeliosError> {
        keeper(&env)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&KEY_PAUSED).unwrap_or(false)
    }
}

#[cfg(test)]
mod tests;
