/**
 * Helios contract `HeliosError` enum'unun TS aynası.
 *
 * **Tek doğruluk kaynağı:** `packages/contracts/crates/shared/src/error.rs`
 * Bu dosya orada tanımlı numaralarla **birebir** eşleşir. Drift testi
 * `errors/index.test.ts` numara aralıklarını ve isim haritasını korur.
 *
 * Numara aralıkları (kalıcı sözleşme):
 *   1-9    : Generic (auth, paused, params)
 *   10-19  : Position lifecycle
 *   20-29  : Strategy / leverage
 *   30-39  : Oracle (AUDIT §1.6)
 *   40-49  : Blend cross-contract
 *   50-59  : Keeper / opt-in
 *   60-69  : Token / SEP-41
 *   70-79  : Storage / TTL
 *   80-89  : HF / risk calculation
 */

export const HELIOS_ERROR_CODES = {
  // 1-9 generic
  Unauthorized: 1,
  Paused: 2,
  InvalidParams: 3,
  NotInitialized: 4,
  AlreadyInitialized: 5,

  // 10-19 position lifecycle
  PositionNotFound: 10,
  PositionAlreadyOpen: 11,
  InsufficientCollateral: 12,
  InsufficientLiquidity: 13,

  // 20-29 strategy
  LeverageTooHigh: 20,
  UnsafeHealthFactor: 21,
  RouterStepFailed: 22,
  SlippageExceeded: 23,
  FlashRepayFailed: 24,

  // 30-39 oracle (AUDIT §1.6)
  OracleStale: 30,
  PriceUnavailable: 31,
  PriceSanityBoundExceeded: 32,
  OracleNotConfigured: 33,

  // 40-49 blend
  BlendCallFailed: 40,
  PoolNotConfigured: 41,
  BlendPositionRead: 42,

  // 50-59 keeper
  NotOptedIn: 50,
  NoActionNeeded: 51,
  DeleverageCapExceeded: 52,
  KeeperRoleRequired: 53,

  // 60-69 token
  UnsupportedAsset: 60,
  AssetNotInRegistry: 61,

  // 70-79 storage
  TtlExtendFailed: 70,

  // 80-89 HF
  ZeroDebt: 80,
  HfOverflow: 81,
} as const;

export type HeliosErrorName = keyof typeof HELIOS_ERROR_CODES;
export type HeliosErrorCode = (typeof HELIOS_ERROR_CODES)[HeliosErrorName];

/** Numara → isim ters lookup. */
export const HELIOS_ERROR_NAME_BY_CODE = Object.fromEntries(
  (Object.entries(HELIOS_ERROR_CODES) as [HeliosErrorName, number][]).map(([name, code]) => [
    code,
    name,
  ]),
) as Record<number, HeliosErrorName>;

export function isKnownHeliosErrorCode(code: number): code is HeliosErrorCode {
  return code in HELIOS_ERROR_NAME_BY_CODE;
}
