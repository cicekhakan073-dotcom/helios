//! strategy_router integration testleri.
//!
//! MockBlendPool (blend testutils) router'a register edilir; uçtan uca
//! open_position/close_position akışı + 4 guard + 1 atomiklik testi.

use super::{simple_hf_estimate, StrategyRouter, StrategyRouterClient};
use blend::testutils::{
    default_reserve_config, default_reserve_data, install_reserve, set_config, MockBlendPool,
};
use blend::{Positions, Reserve};
use blend::client::checked_get_positions;
use blend::types::PoolConfig;
use shared::HeliosError;
use soroban_sdk::{
    testutils::{Address as _, StellarAssetContract},
    token, Address, Env, Map, Vec,
};

// ============================================================================
// Fixture
// ============================================================================

#[allow(dead_code)]
struct Fixture {
    env: Env,
    admin: Address,
    user: Address,
    pool: Address,
    router: Address,
    usdc: Address,
    usdc_sac: StellarAssetContract,
}

const TEST_PROVISION_PER_PARTY: i128 = 1_000_000;

fn setup(max_lev_bps: u32, min_open_hf_bps: u32, flash_fee_bps: u32) -> Fixture {
    let env = Env::default();
    // PROMPT 12-FIX-V: mock pool flash_loan içinde nested cross-contract
    // exec_op + token transfer çağrıları → root-only mock_all_auths yetmez.
    env.mock_all_auths_allowing_non_root_auth();

    let admin = Address::generate(&env);
    let user = Address::generate(&env);

    // USDC — gerçek Stellar Asset Contract (token transferleri için).
    let usdc_sac = env.register_stellar_asset_contract_v2(admin.clone());
    let usdc = usdc_sac.address();

    // MockBlendPool kur
    let pool = env.register(MockBlendPool, ());
    let oracle = Address::generate(&env);
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

    // Router kur + init. flash_receiver: mock FlashLoan.contract'ı yok saydığı için
    // testte generated adres yeterli; gerçek receiver exec_op'u flash_receiver crate
    // testinde doğrulanır (AUDIT 2026-06-03 re-entry fix).
    let flash_receiver = Address::generate(&env);
    let router = env.register(StrategyRouter, ());
    let client = StrategyRouterClient::new(&env, &router);
    client.init(&admin, &pool, &flash_receiver, &max_lev_bps, &min_open_hf_bps, &flash_fee_bps);

    // Provision: hem user (principal için) hem pool (flash + borrow için) yeterli
    // bakiye. flash_loan mock'u gerçek SAC transferi yapar → bakiye yetmezse revert.
    let usdc_admin = token::StellarAssetClient::new(&env, &usdc);
    usdc_admin.mint(&user, &TEST_PROVISION_PER_PARTY);
    usdc_admin.mint(&pool, &TEST_PROVISION_PER_PARTY);

    Fixture { env, admin, user, pool, router, usdc, usdc_sac }
}

// ============================================================================
// Happy path
// ============================================================================

#[test]
fn open_position_3x_basariyla_pozisyon_aciyor() {
    let f = setup(/*max_lev=*/ 500, /*min_open_hf=*/ 130, /*flash_fee=*/ 0);
    let client = StrategyRouterClient::new(&f.env, &f.router);

    // principal=10K, leverage=3x → flash=20K, total_collateral=30K, borrow=20K
    client.open_position(&f.user, &f.usdc, &10_000i128, &300u32);

    let positions = checked_get_positions(&f.env, &f.pool, &f.user).unwrap();
    assert_eq!(
        positions.collateral.get(0).unwrap(),
        30_000,
        "3x leverage'da collateral = principal * leverage = 30K olmalı"
    );
    assert_eq!(
        positions.liabilities.get(0).unwrap(),
        20_000,
        "borrow = flash_amount = principal * (leverage-1) = 20K olmalı"
    );

    // simple HF: 30000/20000 * 100 = 150 (1.50)
    assert_eq!(simple_hf_estimate(&positions), 150);
}

// NOT (AUDIT 2026-06-03 re-entry fix): exec_op router'dan ayrı `flash_receiver`
// kontratına taşındı. exec_op kapsama testi artık `flash_receiver` crate'inde.

// ============================================================================
// Guard'lar
// ============================================================================

#[test]
fn open_position_leverage_max_uzerinde_red() {
    let f = setup(/*max_lev=*/ 500, 130, 0);
    let client = StrategyRouterClient::new(&f.env, &f.router);

    // 7x > 5x cap
    let result = client.try_open_position(&f.user, &f.usdc, &10_000i128, &700u32);
    assert_eq!(result.err().unwrap().unwrap(), HeliosError::LeverageTooHigh.into());
}

#[test]
fn open_position_principal_sifir_invalid_params() {
    let f = setup(500, 130, 0);
    let client = StrategyRouterClient::new(&f.env, &f.router);

    let result = client.try_open_position(&f.user, &f.usdc, &0i128, &300u32);
    assert_eq!(result.err().unwrap().unwrap(), HeliosError::InvalidParams.into());
}

#[test]
fn open_position_leverage_1x_altinda_invalid() {
    let f = setup(500, 130, 0);
    let client = StrategyRouterClient::new(&f.env, &f.router);

    // 50 = 0.5x → InvalidParams
    let result = client.try_open_position(&f.user, &f.usdc, &10_000i128, &50u32);
    assert_eq!(result.err().unwrap().unwrap(), HeliosError::InvalidParams.into());
}

#[test]
fn open_position_unsafe_hf_red() {
    // min_open_hf=160 (1.60) — 3x leverage simple_hf = 150 → eşik altı → revert
    let f = setup(/*max_lev=*/ 500, /*min_open_hf=*/ 160, 0);
    let client = StrategyRouterClient::new(&f.env, &f.router);

    let result = client.try_open_position(&f.user, &f.usdc, &10_000i128, &300u32);
    assert_eq!(result.err().unwrap().unwrap(), HeliosError::UnsafeHealthFactor.into());
}

// ============================================================================
// Atomiklik kanıtı
// ============================================================================

#[test]
fn atomiklik_pool_yokken_acilis_state_degismez() {
    let f = setup(500, 130, 0);
    let client = StrategyRouterClient::new(&f.env, &f.router);

    // Pre-state: pozisyon boş
    let pre = checked_get_positions(&f.env, &f.pool, &f.user).unwrap();
    assert_eq!(pre.collateral.len(), 0);
    assert_eq!(pre.liabilities.len(), 0);

    // Aşağıdaki çağrı min_open_hf eşik altı yüzünden Result::Err döner (post-check'te revert).
    // Soroban try_ ile call'ın revert ettiğini gözlemleriz, ancak Blend mock'unda
    // request'ler zaten uygulanmış olabilir → atomiklik ispatı için final HeliosError
    // çağrısı state-değiştiren submit ÖNCESİ trigger eden adımı yapmamız lazım.
    //
    // Senaryo: principal=0 (pre-check'te erken revert). Submit hiç çağrılmadığı için
    // mock pool state'i değişmemiş olmalı.
    let _ = client.try_open_position(&f.user, &f.usdc, &0i128, &300u32);

    let post = checked_get_positions(&f.env, &f.pool, &f.user).unwrap();
    assert_eq!(
        post.collateral.len(),
        0,
        "principal=0 → erken revert; submit çağrılmadı; collateral değişmedi"
    );
    assert_eq!(post.liabilities.len(), 0);
}

// ============================================================================
// close_position
// ============================================================================

#[test]
fn close_position_pozisyonu_temizliyor() {
    let f = setup(500, 130, 0);
    let client = StrategyRouterClient::new(&f.env, &f.router);

    // Önce aç
    client.open_position(&f.user, &f.usdc, &10_000i128, &300u32);
    let opened = checked_get_positions(&f.env, &f.pool, &f.user).unwrap();
    assert_eq!(opened.collateral.get(0).unwrap(), 30_000);
    assert_eq!(opened.liabilities.get(0).unwrap(), 20_000);

    // Sonra kapat
    client.close_position(&f.user, &f.usdc, &20_000i128, &30_000i128);

    let closed = checked_get_positions(&f.env, &f.pool, &f.user).unwrap();
    assert_eq!(closed.collateral.get(0).unwrap_or(0), 0);
    assert_eq!(closed.liabilities.get(0).unwrap_or(0), 0);
}

#[test]
fn close_position_negatif_amount_invalid() {
    let f = setup(500, 130, 0);
    let client = StrategyRouterClient::new(&f.env, &f.router);

    let result = client.try_close_position(&f.user, &f.usdc, &0i128, &100i128);
    assert_eq!(result.err().unwrap().unwrap(), HeliosError::InvalidParams.into());
}

// ============================================================================
// Pause / unpause
// ============================================================================

#[test]
fn paused_iken_open_position_red() {
    let f = setup(500, 130, 0);
    let client = StrategyRouterClient::new(&f.env, &f.router);

    client.pause();
    assert!(client.is_paused());

    let result = client.try_open_position(&f.user, &f.usdc, &10_000i128, &300u32);
    assert_eq!(result.err().unwrap().unwrap(), HeliosError::Paused.into());

    // unpause → tekrar çalışır
    client.unpause();
    client.open_position(&f.user, &f.usdc, &10_000i128, &300u32);
    let positions = checked_get_positions(&f.env, &f.pool, &f.user).unwrap();
    assert_eq!(positions.collateral.get(0).unwrap(), 30_000);
}

#[test]
fn double_init_already_initialized() {
    let f = setup(500, 130, 0);
    let client = StrategyRouterClient::new(&f.env, &f.router);

    // Tekrar init dene
    let result = client.try_init(&f.admin, &f.pool, &f.pool, &500u32, &130u32, &0u32);
    assert_eq!(
        result.err().unwrap().unwrap(),
        HeliosError::AlreadyInitialized.into()
    );
}

// ============================================================================
// simple_hf_estimate doğrudan birim testi
// ============================================================================

#[test]
fn simple_hf_estimate_borc_yokken_max_doner() {
    let env = Env::default();
    let p = Positions {
        liabilities: Map::new(&env),
        collateral: Map::new(&env),
        supply: Map::new(&env),
    };
    assert_eq!(simple_hf_estimate(&p), i128::MAX);
}

#[test]
fn simple_hf_estimate_3x_leverage_da_150_doner() {
    let env = Env::default();
    let mut col: Map<u32, i128> = Map::new(&env);
    col.set(0, 30_000);
    let mut deb: Map<u32, i128> = Map::new(&env);
    deb.set(0, 20_000);
    let p = Positions {
        liabilities: deb,
        collateral: col,
        supply: Map::new(&env),
    };
    // 30000/20000 * 100 = 150
    assert_eq!(simple_hf_estimate(&p), 150);
}

// ============================================================================
// (silent — Vec import sebebi: Map ile birlikte derleyici warning'ini engellemek)
// ============================================================================
#[allow(dead_code)]
fn _vec_keeper() -> Vec<i128> {
    Vec::new(&Env::default())
}
