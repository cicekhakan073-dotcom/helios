/**
 * Helios vault + strategy statik config (MVP).
 *
 * AUDIT §1.1 — vault kontratı yok; "vault" Helios MVP'sinde Blend pool
 * üzerindeki tek-asset stratejisidir. Frontend bu listeden cüzdana
 * "Open position" tetikler.
 *
 * Gerçek APY canlı Blend reserve verisinden hesaplanır (PROMPT 20 landing).
 */

import type { AssetId } from "../addresses";

export interface VaultConfig {
  id: AssetId;
  label: string;
  /** Default leverage önerisi (UI başlangıç slider değeri). */
  defaultLeverageBps: number;
  /** Max güvenli leverage — `strategy_router.max_leverage_bps` ile uyumlu. */
  maxLeverageBps: number;
  /** UI rengi / ikon hint'i. */
  brandHint: "amber" | "mauve" | "teal" | "info";
  /**
   * Kullanıcının Helios testnet'inde KENDİ fonlayabileceği asset mi?
   * Canlı doğrulandı 2026-06-03: yalnız XLM (native, Friendbot). USDC/wBTC/wETH
   * resmî TestnetV2 classic-asset'leri (issuer GATALTGT…) → faucet YOK + trustline
   * gerekir → kullanıcı pozisyon açamaz (open_position Error(Contract,#13) "trustline
   * missing"). Bu yüzden UI'da seçilemez. Issuer/faucet yolu açılırsa true yap.
   */
  selfServiceable: boolean;
}

export const VAULTS: readonly VaultConfig[] = [
  {
    id: "USDC",
    label: "USDC (stable)",
    defaultLeverageBps: 300,
    maxLeverageBps: 500,
    brandHint: "amber",
    selfServiceable: false,
  },
  {
    id: "XLM",
    label: "XLM (native)",
    defaultLeverageBps: 200,
    maxLeverageBps: 400,
    brandHint: "teal",
    selfServiceable: true,
  },
  {
    id: "wBTC",
    label: "Wrapped BTC",
    defaultLeverageBps: 250,
    maxLeverageBps: 350,
    brandHint: "amber",
    selfServiceable: false,
  },
  {
    id: "wETH",
    label: "Wrapped ETH",
    defaultLeverageBps: 250,
    maxLeverageBps: 350,
    brandHint: "mauve",
    selfServiceable: false,
  },
];

export interface StrategyConfig {
  id: string;
  label: string;
  description: string;
  vaultId: AssetId;
}

export const STRATEGIES: readonly StrategyConfig[] = [
  {
    id: "usdc-3x",
    label: "USDC × 3 (looped)",
    description: "Atomik flash-loan ile 3x kaldıraçlı USDC pozisyonu (single-asset).",
    vaultId: "USDC",
  },
  {
    id: "xlm-2x",
    label: "XLM × 2 (looped)",
    description: "2x kaldıraçlı XLM pozisyonu — düşük leverage, native asset.",
    vaultId: "XLM",
  },
];
