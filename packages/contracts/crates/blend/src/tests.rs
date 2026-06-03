//! blend crate integration testleri — MockBlendPool üstünde
//! supply→borrow→repay→withdraw akışları + Request builder + HF readout.

use crate::actions::{
    borrow_req, close_position_requests, open_position_requests, repay_req, supply_collateral_req,
    withdraw_collateral_req,
};
use crate::client::{checked_get_config, checked_get_positions, checked_get_reserve};
use crate::hf::{collect_hf_readout, compute_hf_bps};
use shared::HfBand;
use crate::testutils::{
    default_reserve_config, default_reserve_data, install_reserve, set_config, MockBlendPool,
};
use crate::types::{PoolClient, PoolConfig, Request, RequestType, Reserve};
use soroban_sdk::{Address, Env, Vec};

// ============================================================================
// Setup yardımcıları
// ============================================================================

struct Fixture {
    env: Env,
    pool: Address,
    user: Address,
    usdc: Address,
}

fn setup() -> Fixture {
    let env = Env::default();
    env.mock_all_auths();

    let pool = env.register(MockBlendPool, ());
    let user = <Address as soroban_sdk::testutils::Address>::generate(&env);
    let usdc = <Address as soroban_sdk::testutils::Address>::generate(&env);

    // Pool config
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

    // USDC rezervi (index 0)
    let usdc_reserve = Reserve {
        asset: usdc.clone(),
        config: default_reserve_config(),
        data: default_reserve_data(),
        scalar: 10_000_000, // 10^7
    };
    install_reserve(&env, &pool, &usdc, usdc_reserve);

    Fixture {
        env,
        pool,
        user,
        usdc,
    }
}

// ============================================================================
// Builder testleri
// ============================================================================

#[test]
fn request_builder_supply_collateral_dogru_request_type() {
    let env = Env::default();
    let asset = <Address as soroban_sdk::testutils::Address>::generate(&env);
    let r = supply_collateral_req(asset.clone(), 1000);
    assert_eq!(r.request_type, RequestType::SupplyCollateral as u32);
    assert_eq!(r.address, asset);
    assert_eq!(r.amount, 1000);
}

#[test]
fn request_builder_borrow_request_type_4() {
    let env = Env::default();
    let asset = <Address as soroban_sdk::testutils::Address>::generate(&env);
    let r = borrow_req(asset, 500);
    assert_eq!(r.request_type, 4);
}

#[test]
fn open_position_requests_iki_request_uretiyor() {
    let env = Env::default();
    let usdc = <Address as soroban_sdk::testutils::Address>::generate(&env);
    let v = open_position_requests(&env, usdc.clone(), 3000, 2000);
    assert_eq!(v.len(), 2);
    assert_eq!(v.get(0).unwrap().request_type, 2); // SupplyCollateral
    assert_eq!(v.get(0).unwrap().amount, 3000);
    assert_eq!(v.get(1).unwrap().request_type, 4); // Borrow
    assert_eq!(v.get(1).unwrap().amount, 2000);
}

#[test]
fn close_position_requests_repay_sonra_withdraw() {
    let env = Env::default();
    let usdc = <Address as soroban_sdk::testutils::Address>::generate(&env);
    let v = close_position_requests(&env, usdc.clone(), 1500, usdc.clone(), 2000);
    assert_eq!(v.len(), 2);
    assert_eq!(v.get(0).unwrap().request_type, 5); // Repay
    assert_eq!(v.get(1).unwrap().request_type, 3); // WithdrawCollateral
}

// ============================================================================
// Pool wrapper testleri
// ============================================================================

#[test]
fn supply_borrow_akisi_pozisyona_yansiyor() {
    let f = setup();
    let client = PoolClient::new(&f.env, &f.pool);

    let mut requests: Vec<Request> = Vec::new(&f.env);
    requests.push_back(supply_collateral_req(f.usdc.clone(), 10_000));
    requests.push_back(borrow_req(f.usdc.clone(), 4_000));

    let positions = client.submit(&f.user, &f.user, &f.user, &requests);

    // Mock pozisyon defteri: collateral idx 0 → 10_000, liabilities idx 0 → 4_000
    assert_eq!(positions.collateral.get(0).unwrap(), 10_000);
    assert_eq!(positions.liabilities.get(0).unwrap(), 4_000);
}

#[test]
fn repay_withdraw_pozisyonu_azaltiyor() {
    let f = setup();
    let client = PoolClient::new(&f.env, &f.pool);

    // İlk: aç pozisyonu
    let mut open: Vec<Request> = Vec::new(&f.env);
    open.push_back(supply_collateral_req(f.usdc.clone(), 10_000));
    open.push_back(borrow_req(f.usdc.clone(), 4_000));
    client.submit(&f.user, &f.user, &f.user, &open);

    // Sonra kapat
    let mut close: Vec<Request> = Vec::new(&f.env);
    close.push_back(repay_req(f.usdc.clone(), 4_000));
    close.push_back(withdraw_collateral_req(f.usdc.clone(), 10_000));
    let final_pos = client.submit(&f.user, &f.user, &f.user, &close);

    assert_eq!(final_pos.collateral.get(0).unwrap_or(0), 0);
    assert_eq!(final_pos.liabilities.get(0).unwrap_or(0), 0);
}

#[test]
fn get_positions_baslangicta_bos_doner() {
    let f = setup();
    let positions = checked_get_positions(&f.env, &f.pool, &f.user).unwrap();
    assert_eq!(positions.collateral.len(), 0);
    assert_eq!(positions.liabilities.len(), 0);
}

#[test]
fn get_reserve_kurulu_reserve_i_okuyor() {
    let f = setup();
    let r = checked_get_reserve(&f.env, &f.pool, &f.usdc).unwrap();
    assert_eq!(r.asset, f.usdc);
    assert_eq!(r.config.c_factor, 8_500_000); // default_reserve_config (7-dec scalar)
    assert_eq!(r.config.l_factor, 8_000_000);
    assert!(r.config.enabled);
}

#[test]
fn get_config_oracle_adresini_doner() {
    let f = setup();
    let cfg = checked_get_config(&f.env, &f.pool).unwrap();
    assert_eq!(cfg.max_positions, 4);
    assert_eq!(cfg.status, 0);
}

#[test]
fn flash_loan_requests_uygulaniyor() {
    use crate::types::FlashLoan;
    let f = setup();
    let client = PoolClient::new(&f.env, &f.pool);

    let flash = FlashLoan {
        contract: f.user.clone(),
        asset: f.usdc.clone(),
        amount: 5_000,
    };
    // DOĞRU desen (AUDIT 2026-06-03): flash_amount Blend tarafında ZATEN borç olur;
    // requests'e AYRI Borrow EKLENMEZ. Yalnız supply.
    let mut requests: Vec<Request> = Vec::new(&f.env);
    requests.push_back(supply_collateral_req(f.usdc.clone(), 8_000));

    let positions = client.flash_loan(&f.user, &flash, &requests);
    assert_eq!(positions.collateral.get(0).unwrap(), 8_000);
    // debt = yalnız flash_amount (5_000) — sadık mock flash'ı borç yazıyor.
    assert_eq!(positions.liabilities.get(0).unwrap(), 5_000);
}

#[test]
fn collect_hf_readout_pozisyon_ve_reserve_toplar() {
    let f = setup();
    let client = PoolClient::new(&f.env, &f.pool);

    let mut requests: Vec<Request> = Vec::new(&f.env);
    requests.push_back(supply_collateral_req(f.usdc.clone(), 10_000));
    requests.push_back(borrow_req(f.usdc.clone(), 3_000));
    client.submit(&f.user, &f.user, &f.user, &requests);

    let mut assets: Vec<Address> = Vec::new(&f.env);
    assets.push_back(f.usdc.clone());

    let readout = collect_hf_readout(&f.env, &f.pool, &f.user, &assets).unwrap();
    assert_eq!(readout.positions.collateral.get(0).unwrap(), 10_000);
    assert_eq!(readout.positions.liabilities.get(0).unwrap(), 3_000);
    assert_eq!(readout.reserves.len(), 1);
    assert_eq!(readout.reserves.get(0).unwrap().asset, f.usdc);
    assert_eq!(readout.reserves.get(0).unwrap().config.c_factor, 8_500_000);
}

#[test]
fn compute_hf_blend_paramlariyla_bekleneni_uretiyor() {
    // PROMPT 13 doğrulama: Blend'den okunan c_factor=0.85, l_factor=0.80 ile
    //   raw_coll = 10_000, raw_liab = 5_000, fiyat = 1 (tek birim)
    //   eff_coll = 10000 × 0.85 = 8500
    //   eff_liab = 5000  × 1.25 = 6250 (5000 × 10000 / 8000)
    //   HF = 8500/6250 = 1.36 → bps=136
    let f = setup();
    let client = PoolClient::new(&f.env, &f.pool);

    let mut requests: Vec<Request> = Vec::new(&f.env);
    requests.push_back(supply_collateral_req(f.usdc.clone(), 10_000));
    requests.push_back(borrow_req(f.usdc.clone(), 5_000));
    client.submit(&f.user, &f.user, &f.user, &requests);

    let mut assets: Vec<Address> = Vec::new(&f.env);
    assets.push_back(f.usdc.clone());
    let readout = collect_hf_readout(&f.env, &f.pool, &f.user, &assets).unwrap();

    let mut prices: Vec<i128> = Vec::new(&f.env);
    prices.push_back(1);

    let hf = compute_hf_bps(&readout, &prices).unwrap();
    assert_eq!(hf, 136, "HF eff_coll=8500 / eff_liab=6250 × 100 = 136");
    assert_eq!(shared::risk_band(hf), HfBand::Caution);
}

#[test]
fn compute_hf_yuksek_borcla_dusuyor() {
    // raw_coll=10_000, raw_liab=10_000 → eff_coll=8500, eff_liab=12500 → HF=68 (likide)
    let f = setup();
    let client = PoolClient::new(&f.env, &f.pool);

    let mut requests: Vec<Request> = Vec::new(&f.env);
    requests.push_back(supply_collateral_req(f.usdc.clone(), 10_000));
    requests.push_back(borrow_req(f.usdc.clone(), 10_000));
    client.submit(&f.user, &f.user, &f.user, &requests);

    let mut assets: Vec<Address> = Vec::new(&f.env);
    assets.push_back(f.usdc.clone());
    let readout = collect_hf_readout(&f.env, &f.pool, &f.user, &assets).unwrap();
    let mut prices: Vec<i128> = Vec::new(&f.env);
    prices.push_back(1);

    let hf = compute_hf_bps(&readout, &prices).unwrap();
    // 8500/12500 × 100 = 68
    assert_eq!(hf, 68);
    assert_eq!(shared::risk_band(hf), HfBand::Liquidatable);
}

#[test]
fn compute_hf_prices_length_mismatch_invalid() {
    let f = setup();
    let mut assets: Vec<Address> = Vec::new(&f.env);
    assets.push_back(f.usdc.clone());
    let readout = collect_hf_readout(&f.env, &f.pool, &f.user, &assets).unwrap();
    let prices: Vec<i128> = Vec::new(&f.env); // boş — length mismatch

    let result = compute_hf_bps(&readout, &prices);
    assert!(result.is_err());
}

#[test]
fn supply_arttikca_borrow_arttikca_collateral_borc_orani_dusuyor() {
    // Bu "HF düşmesi" simülasyonunu kabul kriteri olarak gösterir.
    // Gerçek HF off-chain hesaplanır (AUDIT §1.5); burada *simplified ratio* test:
    //   ratio = collateral / liabilities. Borrow arttıkça ratio düşer.
    let f = setup();
    let client = PoolClient::new(&f.env, &f.pool);

    // Aşama 1: 10K collateral, 2K debt → ratio 5.0
    let mut step1: Vec<Request> = Vec::new(&f.env);
    step1.push_back(supply_collateral_req(f.usdc.clone(), 10_000));
    step1.push_back(borrow_req(f.usdc.clone(), 2_000));
    let p1 = client.submit(&f.user, &f.user, &f.user, &step1);
    let ratio1 = (p1.collateral.get(0).unwrap() * 1000) / p1.liabilities.get(0).unwrap();

    // Aşama 2: +5K debt → toplam 7K debt → ratio düşer
    let mut step2: Vec<Request> = Vec::new(&f.env);
    step2.push_back(borrow_req(f.usdc.clone(), 5_000));
    let p2 = client.submit(&f.user, &f.user, &f.user, &step2);
    let ratio2 = (p2.collateral.get(0).unwrap() * 1000) / p2.liabilities.get(0).unwrap();

    assert!(ratio1 > ratio2, "borrow arttıkça collateral/debt oranı düşmeli");
    assert_eq!(p2.liabilities.get(0).unwrap(), 7_000);
}
