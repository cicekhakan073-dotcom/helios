/**
 * Helios — user-facing message dictionary (English).
 *
 * i18n-ready: to add a language, copy this structure and layer it
 * (i18n provider deferred to the polish phase).
 *
 * Discipline (CLAUDE.md):
 *   - Risk warnings (UnsafeHealthFactor / LeverageTooHigh) stay framed as
 *     "testnet + unaudited + not financial advice"
 *   - No "user's fault" tone; the suggested action is clear and gentle
 */

import type { HeliosErrorName } from "./codes";

export interface UserMessage {
  /** Short title (toast / banner). */
  title: string;
  /** Description paragraph. */
  description: string;
  /** Suggested action (e.g. "Try a lower leverage"). */
  action?: string;
  /** UI severity hint. */
  severity: "danger" | "warn" | "info";
}

export const HELIOS_MESSAGES_TR: Record<HeliosErrorName, UserMessage> = {
  // ---------- 1-9 generic ----------
  Unauthorized: {
    title: "Unauthorized",
    description: "You are not authorized for this action. Please sign in first.",
    action: "Sign in",
    severity: "warn",
  },
  Paused: {
    title: "Contract paused",
    description: "Helios contracts are temporarily paused. Please try again later.",
    severity: "warn",
  },
  InvalidParams: {
    title: "Invalid parameter",
    description: "One of the transaction parameters was rejected by the contract.",
    action: "Check the form values",
    severity: "warn",
  },
  NotInitialized: {
    title: "Contract not ready",
    description:
      "The Helios contract does not appear to be initialized yet. Was the deploy script run?",
    severity: "danger",
  },
  AlreadyInitialized: {
    title: "Already initialized",
    description: "This contract is already initialized. You don't need to init it again.",
    severity: "info",
  },

  // ---------- 10-19 position lifecycle ----------
  PositionNotFound: {
    title: "Position not found",
    description: "There is no open position for this address.",
    severity: "info",
  },
  PositionAlreadyOpen: {
    title: "Position already open",
    description: "This address already has an open position. Close it before opening a new one.",
    action: "Close the current position",
    severity: "warn",
  },
  InsufficientCollateral: {
    title: "Insufficient collateral",
    description: "The position's collateral is not enough for this action.",
    action: "Add more collateral or lower the leverage",
    severity: "warn",
  },
  InsufficientLiquidity: {
    title: "Insufficient pool liquidity",
    description:
      "The Blend pool doesn't have enough liquidity for this action. Try a smaller amount.",
    severity: "warn",
  },

  // ---------- 20-29 strategy ----------
  LeverageTooHigh: {
    title: "Leverage too high",
    description:
      "The leverage you picked exceeds the allowed maximum. ⚠️ Testnet/unaudited demo — not financial advice.",
    action: "Try a lower leverage",
    severity: "warn",
  },
  UnsafeHealthFactor: {
    title: "Unsafe Health Factor",
    description:
      "This position would be near liquidation right after opening. ⚠️ High risk — testnet/unaudited demo. Not financial advice.",
    action: "Lower the leverage or increase the principal",
    severity: "danger",
  },
  RouterStepFailed: {
    title: "Tx step failed",
    description:
      "One of the intermediate steps of the atomic leverage flow failed; the whole tx was reverted.",
    action: "Try again",
    severity: "danger",
  },
  SlippageExceeded: {
    title: "Slippage exceeded",
    description: "Price movement exceeded the slippage threshold you accepted.",
    action: "Increase slippage tolerance or try again",
    severity: "warn",
  },
  FlashRepayFailed: {
    title: "Flash loan repayment failed",
    description:
      "The Blend flash loan could not be repaid within the tx, so the whole flow was reverted.",
    action: "Try again or lower the leverage",
    severity: "danger",
  },

  // ---------- 30-39 oracle (AUDIT §1.6) ----------
  OracleStale: {
    title: "Oracle stale",
    description:
      "The Reflector price update is older than 10 minutes. ⚠️ Wait for the price to refresh before transacting safely.",
    action: "Try again in a few minutes",
    severity: "warn",
  },
  PriceUnavailable: {
    title: "Price unavailable",
    description: "No price data came back from the Reflector feed for this asset.",
    severity: "warn",
  },
  PriceSanityBoundExceeded: {
    title: "Oracle price deviation high",
    description:
      "The latest price deviated more than 30% from the TWAP; manipulation protection kicked in (AUDIT §1.6 — reflecting the Blend 2025 oracle exploit).",
    action: "Try again in a few minutes",
    severity: "danger",
  },
  OracleNotConfigured: {
    title: "Oracle not configured",
    description: "The Reflector feed address for this asset is not connected yet.",
    severity: "danger",
  },

  // ---------- 40-49 blend ----------
  BlendCallFailed: {
    title: "Blend pool call failed",
    description: "The cross-contract call to the lending pool was rejected.",
    action: "Check the position parameters",
    severity: "danger",
  },
  PoolNotConfigured: {
    title: "Blend pool not connected",
    description:
      "The Helios router/keeper is not connected to the pool address yet (init missing).",
    severity: "danger",
  },
  BlendPositionRead: {
    title: "Blend position read failed",
    description: "The user position could not be read from the pool.",
    severity: "warn",
  },

  // ---------- 50-59 keeper ----------
  NotOptedIn: {
    title: "Keeper protection off",
    description: "This address has not opted in to the Auto-Rebalancer yet.",
    action: "Dashboard → Auto-Rebalance → Opt-in",
    severity: "info",
  },
  NoActionNeeded: {
    title: "No action needed",
    description: "The current HF is above the opt-in trigger threshold — no rebalance needed.",
    severity: "info",
  },
  DeleverageCapExceeded: {
    title: "Deleverage cap exceeded",
    description: "The requested rebalance amount is above the cap your opt-in allows.",
    action: "Raise the cap or try a smaller rebalance",
    severity: "warn",
  },
  KeeperRoleRequired: {
    title: "Keeper role required",
    description: "This call can only be made by the assigned keeper account.",
    severity: "warn",
  },

  // ---------- 60-69 token ----------
  UnsupportedAsset: {
    title: "Unsupported asset",
    description: "Helios does not currently support this asset (USDC, XLM, wBTC, wETH).",
    severity: "warn",
  },
  AssetNotInRegistry: {
    title: "Asset not registered",
    description: "There is no Reflector mapping for this asset.",
    severity: "warn",
  },

  // ---------- 70-79 storage ----------
  TtlExtendFailed: {
    title: "Storage TTL extend failed",
    description: "An error occurred while extending the lifetime of the position entry.",
    severity: "warn",
  },

  // ---------- 80-89 HF ----------
  ZeroDebt: {
    title: "No debt",
    description: "Debt is zero for the HF calculation — the risk indicator is meaningless.",
    severity: "info",
  },
  HfOverflow: {
    title: "HF calculation overflow",
    description: "The numeric calculation exceeded the i128 limit; check the inputs.",
    severity: "danger",
  },
};

// ---------- Non-contract category messages ----------

export const NON_CONTRACT_MESSAGES_TR = {
  walletUserRejected: {
    title: "Signature rejected",
    description: "The signature request in the wallet was rejected. You need to sign to continue.",
    severity: "info" as const,
  },
  walletNotInstalled: {
    title: "Wallet not installed",
    description:
      "The wallet you picked is not installed in your browser. Freighter (Chrome/Brave) is the fastest option.",
    action: "Install Freighter",
    severity: "warn" as const,
  },
  walletWrongNetwork: {
    title: "Wallet on wrong network",
    description:
      "The wallet must be connected to Stellar Testnet. Mainnet or another network looks active.",
    action: "Switch the wallet network to Testnet",
    severity: "warn" as const,
  },
  walletConnectionFailed: {
    title: "Wallet connection failed",
    description: "We couldn't connect to the wallet. Make sure it is open and accessible.",
    action: "Try again",
    severity: "danger" as const,
  },
  authUnauthenticated: {
    title: "No session",
    description: "This page requires a SEP-10 session.",
    action: "Sign in",
    severity: "warn" as const,
  },
  authChallengeFailed: {
    title: "Auth challenge failed",
    description: "An error occurred while generating the SEP-10 challenge. Try again.",
    severity: "warn" as const,
  },
  authVerifyFailed: {
    title: "Auth verification failed",
    description:
      "The signed challenge was rejected by the server (replay/expired/signature). Sign again.",
    severity: "danger" as const,
  },
  rpcUnreachable: {
    title: "RPC unreachable",
    description: "Could not reach the Soroban RPC server. Check your internet or the endpoint.",
    action: "Try again",
    severity: "warn" as const,
  },
  rpcHostError: {
    title: "RPC host error",
    description: "The Soroban host returned an unexpected error during the call.",
    severity: "danger" as const,
  },
  networkOffline: {
    title: "No network connection",
    description: "The browser appears to be offline. Check your connection.",
    action: "Try again",
    severity: "warn" as const,
  },
  unknown: {
    title: "Unknown error",
    description: "An unexpected error occurred. Trying again may resolve it.",
    action: "Try again",
    severity: "danger" as const,
  },
} satisfies Record<
  string,
  { title: string; description: string; action?: string; severity: "danger" | "warn" | "info" }
>;

export type NonContractMessageKey = keyof typeof NON_CONTRACT_MESSAGES_TR;
