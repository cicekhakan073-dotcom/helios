//! `strategy_router` — Helios'un atomik tek-tx kaldıraç orchestrator'ı.
//!
//! ## Mimari (AUDIT 2026-05-31 §1.1, §1.2)
//!
//! Soroban'da tx başına TEK `InvokeHostFunctionOp` vardır. Kaldıraç akışı
//! atomik olmalı → tüm cross-contract çağrılar tek router fn'inde zincirlenir.
//!
//! Helios **flash_lender YAZMAZ.** Blend v2 pool kontratının kendi
//! `flash_loan(from, FlashLoan, requests: Vec<Request>)` fn'i flash + Supply +
//! Borrow + Repay + Withdraw zincirini atomik yürütür. Router yalnızca
//! `Vec<Request>` ve `FlashLoan` struct'ını kurar ve `pool.flash_loan(...)`
//! çağırır. **exec_op callback zinciri yoktur.**
//!
//! ## Pozisyon metadata
//!
//! Blend `get_positions(user) → Positions` collateral + debt'i zaten tutar.
//! Helios'a özel meta (entry_price, leverage_bps, opt-in işareti) **off-chain
//! Neon DB**'de tutulur (AUDIT §1.1 + PROMPT 30). Router event yayar →
//! indexer Neon'a yazar.
//!
//! ## Tx-level disiplinler (router DEĞİL, tx'i kuran tarafın sorumluluğu)
//!
//! - **MEMO_NONE zorunlu** — Soroban tx'i memo kabul etmez. Frontend
//!   (PROMPT 22) bu tx'i `Memo::None` ile inşa etmeli.
//! - **Muxed account YASAK** — `from`/`spender`/`to` muxed (M…) olamaz.
//!   Frontend wallet bunu engellemeli; deploy script de teyit etmeli.
//! - **Tek `InvokeHostFunctionOp`** — birden çok op tek tx'te yasak.
//!
//! Bu üç kısıt **kod düzeyinde değil**, **tx-build aşamasında** denetlenir.
//! Bu modül yorumda hatırlatır.
//!
//! ## MVP single-asset
//!
//! Bu sürümde `collateral_asset == debt_asset` (örn. USDC üzerinde leveraged
//! USDC pozisyonu). Cross-asset (USDC collateral, XLM debt) bir sonraki
//! iterasyon — DEX swap entegrasyonu gerektirir, kapsam dışı.

#![no_std]

use blend::actions::{repay_req, supply_collateral_req, withdraw_collateral_req};
use blend::{FlashLoan, PoolClient, Positions, Request};
use shared::HeliosError;
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol, Vec};

// ============================================================================
// Storage anahtarları
// ============================================================================

const KEY_ADMIN: Symbol = symbol_short!("admin");
const KEY_PAUSED: Symbol = symbol_short!("paused");
const KEY_POOL: Symbol = symbol_short!("pool");
const KEY_MAX_LEV: Symbol = symbol_short!("max_lev");
const KEY_MIN_HF: Symbol = symbol_short!("min_hf");
const KEY_FLASH_BPS: Symbol = symbol_short!("flash_bps");
const KEY_RECEIVER: Symbol = symbol_short!("receiver");

// ============================================================================
// Sabitler
// ============================================================================

/// Leverage temsili: `100 = 1x`, `300 = 3x`, `500 = 5x`. Basis-points/100.
const LEVERAGE_BASE: u32 = 100;

// ============================================================================
// Events
//
// NOT — soroban-sdk 26'da `Events::publish` deprecated; idiomatik yol
// `#[contractevent]` struct'larıdır. Bu macro'nun scope davranışı şu an
// belirsiz olduğu için (PROMPT 12 zamansal disiplini), eski API ile devam
// ediyoruz ve `#[allow(deprecated)]` ile warning'i susturuyoruz. PROMPT 14
// veya sonrası refactor'da `#[contractevent]` ile değiştirilecek.
// ============================================================================

// ============================================================================
// Helpers
// ============================================================================

fn admin(env: &Env) -> Result<Address, HeliosError> {
    env.storage()
        .instance()
        .get(&KEY_ADMIN)
        .ok_or(HeliosError::NotInitialized)
}

fn ensure_not_paused(env: &Env) -> Result<(), HeliosError> {
    let paused: bool = env.storage().instance().get(&KEY_PAUSED).unwrap_or(false);
    if paused {
        return Err(HeliosError::Paused);
    }
    Ok(())
}

fn pool_address(env: &Env) -> Result<Address, HeliosError> {
    env.storage()
        .instance()
        .get(&KEY_POOL)
        .ok_or(HeliosError::NotInitialized)
}

/// Flash receiver kontratı (router'dan AYRI — re-entry önler, AUDIT 2026-06-03).
fn receiver_address(env: &Env) -> Result<Address, HeliosError> {
    env.storage()
        .instance()
        .get(&KEY_RECEIVER)
        .ok_or(HeliosError::NotInitialized)
}

/// Pozisyondan basit collateral/liability oranı, ×100 ölçek (HF=1.50 → 150).
///
/// **NOT** — Bu **gerçek HF değil**. Gerçek HF c_factor / l_factor / b_rate /
/// d_rate / oracle base zinciriyle off-chain hesaplanır (AUDIT §1.5, PROMPT
/// 13/18). Bu fn yalnız on-chain ön-kontrol için kullanılır (open_position
/// post-check: `ratio < min_open_hf_bps` ise revert). Conservativeci sayım:
/// shareler birebir 1:1 değer kabul edilir (c_factor uygulanmaz).
pub fn simple_hf_estimate(positions: &Positions) -> i128 {
    let mut col: i128 = 0;
    for (_idx, v) in positions.collateral.iter() {
        col = col.saturating_add(v);
    }
    let mut deb: i128 = 0;
    for (_idx, v) in positions.liabilities.iter() {
        deb = deb.saturating_add(v);
    }
    if deb == 0 {
        return i128::MAX;
    }
    (col * 100) / deb
}

// ============================================================================
// Contract
// ============================================================================

#[contract]
pub struct StrategyRouter;

#[contractimpl]
impl StrategyRouter {
    /// Init — admin + Blend pool adresini + guard parametrelerini bağlar.
    ///
    /// - `max_leverage_bps`: izin verilen üst sınır (örn. 500 = 5x).
    /// - `min_open_hf_bps`: open sonrası post-check için minimum HF ×100
    ///   (örn. 130 = 1.30 — AUDIT bandlarına göre Healthy/Caution sınırının
    ///   biraz üstü; gerçek HF off-chain).
    /// - `flash_fee_bps`: Blend'in flash loan fee'sini (varsa) basis-points
    ///   olarak bekler. AUDIT §2.6 — Helios kendi flash fee'si YOK; bu değer
    ///   yalnız Blend pool fee'sini yansıtır, deploy anında set edilir.
    pub fn init(
        env: Env,
        admin: Address,
        pool: Address,
        flash_receiver: Address,
        max_leverage_bps: u32,
        min_open_hf_bps: u32,
        flash_fee_bps: u32,
    ) -> Result<(), HeliosError> {
        if env.storage().instance().has(&KEY_ADMIN) {
            return Err(HeliosError::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&KEY_ADMIN, &admin);
        env.storage().instance().set(&KEY_PAUSED, &false);
        env.storage().instance().set(&KEY_POOL, &pool);
        env.storage().instance().set(&KEY_RECEIVER, &flash_receiver);
        env.storage().instance().set(&KEY_MAX_LEV, &max_leverage_bps);
        env.storage().instance().set(&KEY_MIN_HF, &min_open_hf_bps);
        env.storage().instance().set(&KEY_FLASH_BPS, &flash_fee_bps);
        Ok(())
    }

    // NOT (AUDIT 2026-06-03 re-entry fix): `exec_op` ARTIK BURADA DEĞİL.
    // Ayrı `flash_receiver` kontratına taşındı. Router exec_op'u taşırsa
    // router→pool→router re-entry'si oluşur ve Soroban bunu yasaklar
    // ("Contract re-entry is not allowed", canlı doğrulandı). open_position
    // FlashLoan.contract = flash_receiver geçirir → zincir router→pool→receiver.

    /// Atomik tek-tx kaldıraç açılışı.
    ///
    /// Akış:
    ///   1. Guard'lar (auth, paused, principal>0, leverage cap)
    ///   2. flash_amount = principal × (leverage_bps − 100) / 100
    ///   3. `pool.flash_loan(user, FlashLoan{router, asset, flash_amount}, [
    ///        SupplyCollateral(asset, principal+flash_amount),
    ///        Borrow(asset, flash_amount + blend_flash_fee)
    ///      ])`
    ///   4. Post-check: simple_hf_estimate(positions) ≥ min_open_hf_bps
    ///   5. Event: `pos_opened`
    ///
    /// Tek `InvokeHostFunctionOp` altında zincirlenir (`flash_loan` Blend
    /// içinde `SupplyCollateral` ve `Borrow` request'lerini sırayla uygular).
    pub fn open_position(
        env: Env,
        user: Address,
        asset: Address,
        principal: i128,
        leverage_bps: u32,
    ) -> Result<(), HeliosError> {
        user.require_auth();
        ensure_not_paused(&env)?;

        // -- Pre-check'ler ---------------------------------------------------
        if principal <= 0 {
            return Err(HeliosError::InvalidParams);
        }
        if leverage_bps < LEVERAGE_BASE {
            return Err(HeliosError::InvalidParams); // 1x altı = leverage değil
        }
        let max_lev: u32 = env
            .storage()
            .instance()
            .get(&KEY_MAX_LEV)
            .ok_or(HeliosError::NotInitialized)?;
        if leverage_bps > max_lev {
            return Err(HeliosError::LeverageTooHigh);
        }

        // -- Miktarları hesapla ---------------------------------------------
        let flash_amount: i128 =
            (principal * (leverage_bps as i128 - LEVERAGE_BASE as i128)) / LEVERAGE_BASE as i128;
        let total_collateral: i128 = principal + flash_amount;
        // AUDIT 2026-06-03 (TEŞHİS #1205 — çift-borç fix): Blend flash_loan
        // `flash_amount`'u user'ın borcu olarak ZATEN yazıyor
        // (execute_submit_with_flash_loan ADIM 1: d_token mint). Bu yüzden requests
        // vec'ine AYRI Borrow EKLENMEZ — eklersek çift-borç → HF düşer → #1205 InvalidHf.
        // flash_fee de Blend'in to_d_token_up rounding'inde içeride taşınır.
        let debt_amount: i128 = flash_amount; // standing borç = flash (event için)

        // -- Blend'e atomik çağrı (flash_loan + requests) -------------------
        let pool = pool_address(&env)?;
        let pool_client = PoolClient::new(&env, &pool);
        // AUDIT 2026-06-03 (re-entry fix): FlashLoan.contract = AYRI flash_receiver
        // (router DEĞİL) → zincir router→pool→receiver, re-entry yok.
        let receiver = receiver_address(&env)?;

        let flash = FlashLoan {
            contract: receiver,
            asset: asset.clone(),
            amount: flash_amount,
        };
        let mut requests: Vec<Request> = Vec::new(&env);
        requests.push_back(supply_collateral_req(asset.clone(), total_collateral));
        // Borrow request YOK — flash_amount Blend tarafında zaten borç (yukarı not).

        let positions: Positions = pool_client.flash_loan(&user, &flash, &requests);

        // -- Post-check: HF basit oranı min eşiğin üstünde mi ---------------
        let min_hf_bps: u32 = env
            .storage()
            .instance()
            .get(&KEY_MIN_HF)
            .ok_or(HeliosError::NotInitialized)?;
        let ratio = simple_hf_estimate(&positions);
        if ratio < min_hf_bps as i128 {
            return Err(HeliosError::UnsafeHealthFactor);
        }

        // -- Event ----------------------------------------------------------
        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("posopen"), user.clone()),
            (asset, principal, total_collateral, debt_amount, leverage_bps),
        );

        Ok(())
    }

    /// Atomik tek-tx kaldıraç kapanışı.
    ///
    /// Akış:
    ///   1. Guard (auth, paused)
    ///   2. `pool.submit(user, user, user, [
    ///        WithdrawCollateral(asset, collateral_amount),
    ///        Repay(asset, debt_amount)
    ///      ])`
    ///   3. Event: `pos_closed`
    ///
    /// AUDIT 2026-06-03 (TEŞHİS #1205): close/deleverage flash_loan'a İHTİYAÇ DUYMAZ.
    /// Çekilen teminat borç ödemesini fonlar (net token akışı ≈ collateral−debt);
    /// tek `submit` yeterli. Eski flash_loan tasarımı Blend'in flash→borç ADIM 1'i
    /// yüzünden çift-borç üretiyordu (open ile aynı sınıf bug) — kaldırıldı. Flash
    /// yalnız OPEN'da gerekli (önden fazla fon).
    ///
    /// Kullanıcı `debt_amount` + `collateral_amount`'u frontend'den hesaplar (Blend
    /// `get_positions(user)` güncel değerleri); `collateral_amount ≥ debt_amount`
    /// olmalı ki net çekiş fonlanabilsin ve bitiş HF'si ≥ Blend eşiği kalsın.
    pub fn close_position(
        env: Env,
        user: Address,
        asset: Address,
        debt_amount: i128,
        collateral_amount: i128,
    ) -> Result<(), HeliosError> {
        user.require_auth();
        ensure_not_paused(&env)?;

        if debt_amount <= 0 || collateral_amount <= 0 {
            return Err(HeliosError::InvalidParams);
        }

        let pool = pool_address(&env)?;
        let pool_client = PoolClient::new(&env, &pool);

        let mut requests: Vec<Request> = Vec::new(&env);
        requests.push_back(withdraw_collateral_req(asset.clone(), collateral_amount));
        requests.push_back(repay_req(asset.clone(), debt_amount));

        let _positions: Positions = pool_client.submit(&user, &user, &user, &requests);

        #[allow(deprecated)]
        env.events().publish(
            (symbol_short!("posclose"), user.clone()),
            (asset, debt_amount, collateral_amount),
        );

        Ok(())
    }

    // ========================================================================
    // Admin fn'leri
    // ========================================================================

    pub fn pause(env: Env) -> Result<(), HeliosError> {
        let a = admin(&env)?;
        a.require_auth();
        env.storage().instance().set(&KEY_PAUSED, &true);
        Ok(())
    }

    pub fn unpause(env: Env) -> Result<(), HeliosError> {
        let a = admin(&env)?;
        a.require_auth();
        env.storage().instance().set(&KEY_PAUSED, &false);
        Ok(())
    }

    pub fn get_admin(env: Env) -> Result<Address, HeliosError> {
        admin(&env)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&KEY_PAUSED).unwrap_or(false)
    }
}

#[cfg(test)]
mod tests;
