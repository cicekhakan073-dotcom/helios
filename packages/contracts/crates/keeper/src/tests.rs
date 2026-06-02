//! keeper integration testleri — full stack (MockBlendPool + StrategyRouter + Keeper).

use super::{Keeper, KeeperClient, OptIn};
use blend::testutils::{
    default_reserve_config, default_reserve_data, install_reserve, set_config, MockBlendPool,
};
use blend::types::PoolConfig;
use blend::{Reserve};
use blend::client::checked_get_positions;
use shared::HeliosError;
use soroban_sdk::{testutils::Address as _, Address, Env, Vec};
use strategy_router::{StrategyRouter, StrategyRouterClient};

// ============================================================================
// Fixture
// ============================================================================

struct Fixture {
    env: Env,
    admin: Address,
    keeper_role: Address,
    user: Address,
    pool: Address,
    router: Address,
    keeper: Address,
    usdc: Address,
    assets: Vec<Address>,
    prices: Vec<i128>,
}

fn setup() -> Fixture {
    let env = Env::default();
    // Nested cross-contract çağrılarda (keeper → router → pool) user.require_auth
    // root invocation'a bağlı değil; mock_all_auths_allowing_non_root_auth ile
    // tüm root-dışı authorization'ları kabul ederiz.
    env.mock_all_auths_allowing_non_root_auth();

    let admin = <Address as soroban_sdk::testutils::Address>::generate(&env);
    let keeper_role = <Address as soroban_sdk::testutils::Address>::generate(&env);
    let user = <Address as soroban_sdk::testutils::Address>::generate(&env);
    let usdc = <Address as soroban_sdk::testutils::Address>::generate(&env);

    // MockBlendPool
    let pool = env.register(MockBlendPool, ());
    let oracle = <Address as soroban_sdk::testutils::Address>::generate(&env);
    set_config(
        &env,
        &pool,
        PoolConfig {
            oracle,
            min_collateral: 1,
            bstop_rate: 100,
            status: 0,
            max_positions: 4,
        },
    );
    let usdc_reserve = Reserve {
        asset: usdc.clone(),
        config: default_reserve_config(),
        data: default_reserve_data(),
        scalar: 10_000_000,
    };
    install_reserve(&env, &pool, &usdc, usdc_reserve);

    // StrategyRouter
    let router = env.register(StrategyRouter, ());
    let router_client = StrategyRouterClient::new(&env, &router);
    router_client.init(&admin, &pool, &500u32, &130u32, &0u32);

    // Keeper
    let keeper = env.register(Keeper, ());
    let keeper_client = KeeperClient::new(&env, &keeper);
    keeper_client.init(&admin, &keeper_role, &pool, &router);

    let mut assets: Vec<Address> = Vec::new(&env);
    assets.push_back(usdc.clone());
    let mut prices: Vec<i128> = Vec::new(&env);
    prices.push_back(1);

    Fixture {
        env,
        admin,
        keeper_role,
        user,
        pool,
        router,
        keeper,
        usdc,
        assets,
        prices,
    }
}

/// `user`'a 3x leverage USDC pozisyonu açar (HF=150 — Healthy sınırı).
fn open_user_position_3x(f: &Fixture) {
    let router_client = StrategyRouterClient::new(&f.env, &f.router);
    router_client.open_position(&f.user, &f.usdc, &10_000i128, &300u32);
}

/// `user` için yüksek-borç pozisyonu (HF<trigger durumu yaratmak için).
fn open_user_position_unsafe(f: &Fixture) {
    // principal=10K, 4x leverage → coll=40K, debt=30K
    // simple_hf_estimate = 40000/30000 × 100 = 133 → Caution
    // compute_hf_bps = eff_coll(40000×0.85)=34000, eff_liab(30000/0.80)=37500 → HF=90 → Liquidatable
    let router_client = StrategyRouterClient::new(&f.env, &f.router);
    router_client.open_position(&f.user, &f.usdc, &10_000i128, &400u32);
}

// ============================================================================
// Opt-in CRUD
// ============================================================================

#[test]
fn register_opt_in_kullanici_kendi_imza_ile() {
    let f = setup();
    let client = KeeperClient::new(&f.env, &f.keeper);

    client.register_opt_in(&f.user, &130u32, &160u32, &5000u32);
    assert!(client.is_opted_in(&f.user));

    let opt = client.get_opt_in(&f.user);
    assert_eq!(opt.trigger_hf_bps, 130);
    assert_eq!(opt.target_hf_bps, 160);
    assert_eq!(opt.max_deleverage_bps, 5000);
    assert!(opt.active);
}

#[test]
fn register_opt_in_param_validation() {
    let f = setup();
    let client = KeeperClient::new(&f.env, &f.keeper);

    // trigger < 1.0 (HF_LIQUIDATION) → InvalidParams
    let r1 = client.try_register_opt_in(&f.user, &90u32, &120u32, &5000u32);
    assert_eq!(r1.err().unwrap().unwrap(), HeliosError::InvalidParams.into());

    // target ≤ trigger → InvalidParams
    let r2 = client.try_register_opt_in(&f.user, &150u32, &150u32, &5000u32);
    assert_eq!(r2.err().unwrap().unwrap(), HeliosError::InvalidParams.into());

    // max_deleverage = 0 → InvalidParams
    let r3 = client.try_register_opt_in(&f.user, &130u32, &160u32, &0u32);
    assert_eq!(r3.err().unwrap().unwrap(), HeliosError::InvalidParams.into());

    // max_deleverage > 10000 → InvalidParams
    let r4 = client.try_register_opt_in(&f.user, &130u32, &160u32, &15000u32);
    assert_eq!(r4.err().unwrap().unwrap(), HeliosError::InvalidParams.into());
}

#[test]
fn remove_opt_in_active_false_yapiyor() {
    let f = setup();
    let client = KeeperClient::new(&f.env, &f.keeper);

    client.register_opt_in(&f.user, &130u32, &160u32, &5000u32);
    assert!(client.is_opted_in(&f.user));

    client.remove_opt_in(&f.user);
    assert!(!client.is_opted_in(&f.user));
}

// ============================================================================
// Rebalance — guard'lar
// ============================================================================

#[test]
fn rebalance_opt_in_yokken_not_opted_in() {
    let f = setup();
    let client = KeeperClient::new(&f.env, &f.keeper);

    open_user_position_unsafe(&f);

    let r = client.try_rebalance(
        &f.keeper_role,
        &f.user,
        &f.usdc,
        &1_000i128,
        &1_000i128,
        &f.assets,
        &f.prices,
    );
    assert_eq!(r.err().unwrap().unwrap(), HeliosError::NotOptedIn.into());
}

#[test]
fn rebalance_keeper_olmayan_unauthorized() {
    let f = setup();
    let client = KeeperClient::new(&f.env, &f.keeper);

    client.register_opt_in(&f.user, &130u32, &160u32, &5000u32);
    open_user_position_unsafe(&f);

    let outsider = <Address as soroban_sdk::testutils::Address>::generate(&f.env);
    let r = client.try_rebalance(
        &outsider,
        &f.user,
        &f.usdc,
        &1_000i128,
        &1_000i128,
        &f.assets,
        &f.prices,
    );
    assert_eq!(
        r.err().unwrap().unwrap(),
        HeliosError::KeeperRoleRequired.into()
    );
}

#[test]
fn rebalance_hf_guvenli_no_action_needed() {
    let f = setup();
    let client = KeeperClient::new(&f.env, &f.keeper);

    open_user_position_3x(&f); // 3x: coll=30000, debt=20000
    // compute_hf_bps single-asset: eff_coll=25500, eff_liab=25000 → HF=102
    // "Güvenli" senaryosu için trigger HF_LIQUIDATION=100'ün altına inilemez
    // (register_opt_in InvalidParams). trigger=101 → 102 > 101 → NoActionNeeded.
    client.register_opt_in(&f.user, &101u32, &130u32, &5000u32);

    let r = client.try_rebalance(
        &f.keeper_role,
        &f.user,
        &f.usdc,
        &1_000i128,
        &1_000i128,
        &f.assets,
        &f.prices,
    );
    assert_eq!(r.err().unwrap().unwrap(), HeliosError::NoActionNeeded.into());
}

#[test]
fn rebalance_cap_asildi_red() {
    let f = setup();
    let client = KeeperClient::new(&f.env, &f.keeper);

    open_user_position_unsafe(&f);
    // raw_debt=30000, max_deleverage=2000 (20%) → cap = 30000 × 0.20 = 6000
    client.register_opt_in(&f.user, &200u32, &250u32, &2000u32);

    // 7000 cap üstü
    let r = client.try_rebalance(
        &f.keeper_role,
        &f.user,
        &f.usdc,
        &7_000i128, // > 6000 cap
        &7_000i128,
        &f.assets,
        &f.prices,
    );
    assert_eq!(
        r.err().unwrap().unwrap(),
        HeliosError::DeleverageCapExceeded.into()
    );
}

#[test]
fn rebalance_paused_iken_red() {
    let f = setup();
    let client = KeeperClient::new(&f.env, &f.keeper);

    client.register_opt_in(&f.user, &200u32, &250u32, &5000u32);
    open_user_position_unsafe(&f);

    client.pause();
    let r = client.try_rebalance(
        &f.keeper_role,
        &f.user,
        &f.usdc,
        &1_000i128,
        &1_000i128,
        &f.assets,
        &f.prices,
    );
    assert_eq!(r.err().unwrap().unwrap(), HeliosError::Paused.into());
}

// ============================================================================
// Rebalance happy path + HF artışı
// ============================================================================

#[test]
fn rebalance_hf_dusukken_deleverage_yapiyor_hf_artiyor() {
    let f = setup();
    let client = KeeperClient::new(&f.env, &f.keeper);

    // Pozisyon: 4x leverage → HF≈90 (Liquidatable)
    open_user_position_unsafe(&f);
    // trigger=200 (HF<2.00), cap=50% — yumuşak parametre, deleverage çalışsın
    client.register_opt_in(&f.user, &200u32, &300u32, &5000u32);

    // Pre HF: compute_hf_bps single-asset eff_coll=40K×0.85=34000, eff_liab=30K/0.80=37500 → 90
    // Hedef: 5000 borç + 5000 collateral kapatalım (cap=30K×0.5=15000, içinde)
    let new_hf = client.rebalance(
        &f.keeper_role,
        &f.user,
        &f.usdc,
        &5_000i128,
        &5_000i128,
        &f.assets,
        &f.prices,
    );

    // Post pozisyon: coll=35K, debt=25K
    // eff_coll = 35000×0.85 = 29750, eff_liab = 25000/0.80 = 31250 → HF = 29750/31250×100 = 95
    assert!(new_hf > 90, "rebalance sonrası HF eski 90'dan yukarı olmalı, gerçek: {}", new_hf);
    assert_eq!(new_hf, 95);

    // Pozisyon değişikliğini Blend tarafında doğrula
    let positions = checked_get_positions(&f.env, &f.pool, &f.user).unwrap();
    assert_eq!(positions.collateral.get(0).unwrap(), 35_000);
    assert_eq!(positions.liabilities.get(0).unwrap(), 25_000);
}

// ============================================================================
// Güvenlik — fonlar keeper'a akmıyor
// ============================================================================

#[test]
fn fonlar_keeper_hesabina_akmiyor() {
    let f = setup();
    let client = KeeperClient::new(&f.env, &f.keeper);

    open_user_position_unsafe(&f);
    client.register_opt_in(&f.user, &200u32, &300u32, &5000u32);

    // Keeper kontrat ve keeper_role adresinin pozisyon defterinde hiçbir kaydı olmamalı
    // (rebalance öncesi + sonrası).
    let keeper_pre = checked_get_positions(&f.env, &f.pool, &f.keeper).unwrap();
    let keeper_role_pre = checked_get_positions(&f.env, &f.pool, &f.keeper_role).unwrap();
    assert_eq!(keeper_pre.collateral.len(), 0);
    assert_eq!(keeper_pre.liabilities.len(), 0);
    assert_eq!(keeper_role_pre.collateral.len(), 0);
    assert_eq!(keeper_role_pre.liabilities.len(), 0);

    client.rebalance(
        &f.keeper_role,
        &f.user,
        &f.usdc,
        &5_000i128,
        &5_000i128,
        &f.assets,
        &f.prices,
    );

    let keeper_post = checked_get_positions(&f.env, &f.pool, &f.keeper).unwrap();
    let keeper_role_post = checked_get_positions(&f.env, &f.pool, &f.keeper_role).unwrap();
    assert_eq!(
        keeper_post.collateral.len(),
        0,
        "keeper kontrat collateral ÜRETMEMELI"
    );
    assert_eq!(
        keeper_post.liabilities.len(),
        0,
        "keeper kontrat borç ÜRETMEMELI"
    );
    assert_eq!(keeper_role_post.collateral.len(), 0);
    assert_eq!(keeper_role_post.liabilities.len(), 0);

    // User pozisyonu küçülmeli
    let user_post = checked_get_positions(&f.env, &f.pool, &f.user).unwrap();
    assert_eq!(user_post.collateral.get(0).unwrap(), 35_000);
    assert_eq!(user_post.liabilities.get(0).unwrap(), 25_000);
}

// ============================================================================
// Admin
// ============================================================================

#[test]
fn double_init_already_initialized() {
    let f = setup();
    let client = KeeperClient::new(&f.env, &f.keeper);

    let r = client.try_init(&f.admin, &f.keeper_role, &f.pool, &f.router);
    assert_eq!(
        r.err().unwrap().unwrap(),
        HeliosError::AlreadyInitialized.into()
    );
}

#[test]
fn set_keeper_admin_rolu_degistirebilir() {
    let f = setup();
    let client = KeeperClient::new(&f.env, &f.keeper);

    let new_keeper = <Address as soroban_sdk::testutils::Address>::generate(&f.env);
    client.set_keeper(&new_keeper);
    assert_eq!(client.get_keeper(), new_keeper);

    // Eski keeper artık çağıramaz
    client.register_opt_in(&f.user, &200u32, &300u32, &5000u32);
    open_user_position_unsafe(&f);
    let r = client.try_rebalance(
        &f.keeper_role, // eski
        &f.user,
        &f.usdc,
        &1_000i128,
        &1_000i128,
        &f.assets,
        &f.prices,
    );
    assert_eq!(
        r.err().unwrap().unwrap(),
        HeliosError::KeeperRoleRequired.into()
    );
}
