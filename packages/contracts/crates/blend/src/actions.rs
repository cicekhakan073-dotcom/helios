//! Request builder helper'ları — `submit`/`flash_loan` çağrılarında geçen
//! `Vec<Request>` vec'lerini kurmak için.
//!
//! Bu yardımcılar her aksiyon için kısa, isimli builder'lar sağlar; kullanıcı
//! kod manuel `Request { request_type: 2, ... }` yazmak zorunda kalmaz.

use soroban_sdk::{Address, Env, Vec};

use crate::types::{Request, RequestType};

#[inline]
fn request(request_type: RequestType, address: Address, amount: i128) -> Request {
    Request {
        request_type: request_type as u32,
        address,
        amount,
    }
}

pub fn supply_collateral_req(asset: Address, amount: i128) -> Request {
    request(RequestType::SupplyCollateral, asset, amount)
}

pub fn withdraw_collateral_req(asset: Address, amount: i128) -> Request {
    request(RequestType::WithdrawCollateral, asset, amount)
}

pub fn borrow_req(asset: Address, amount: i128) -> Request {
    request(RequestType::Borrow, asset, amount)
}

pub fn repay_req(asset: Address, amount: i128) -> Request {
    request(RequestType::Repay, asset, amount)
}

pub fn supply_req(asset: Address, amount: i128) -> Request {
    request(RequestType::Supply, asset, amount)
}

pub fn withdraw_req(asset: Address, amount: i128) -> Request {
    request(RequestType::Withdraw, asset, amount)
}

/// `strategy_router::open_position` için tipik request vec'i (atomic flash loan içinde):
///   1. SupplyCollateral(asset, principal + flash_amount)
///   2. Borrow(asset, repayment_amount)
///
/// PROMPT 12 router içeride bu helper'ı kullanır.
pub fn open_position_requests(
    env: &Env,
    asset: Address,
    total_collateral: i128,
    borrow_amount: i128,
) -> Vec<Request> {
    let mut v = Vec::new(env);
    v.push_back(supply_collateral_req(asset.clone(), total_collateral));
    v.push_back(borrow_req(asset, borrow_amount));
    v
}

/// `strategy_router::close_position` tipik request vec'i:
///   1. Repay(asset, debt_amount)
///   2. WithdrawCollateral(asset, collateral_amount)
pub fn close_position_requests(
    env: &Env,
    debt_asset: Address,
    debt_amount: i128,
    collateral_asset: Address,
    collateral_amount: i128,
) -> Vec<Request> {
    let mut v = Vec::new(env);
    v.push_back(repay_req(debt_asset, debt_amount));
    v.push_back(withdraw_collateral_req(collateral_asset, collateral_amount));
    v
}
