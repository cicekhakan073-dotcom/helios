/**
 * @helios/sdk/wallet — public wallet katmanı.
 *
 * UI tarafı yalnız `useWalletStore` + `connectWallet/disconnectWallet`
 * import etmelidir; Wallets Kit / Freighter API doğrudan UI'da kullanılmaz.
 */

export {
  connectWallet,
  reconnectKnownWallet,
  disconnectWallet,
  syncWalletNetwork,
} from "./actions";

export {
  useWalletStore,
  selectAddress,
  selectLastError,
  selectNetworkInfo,
  selectStatus,
  shortAddress,
  type WalletState,
  type WalletStatus,
  type WalletNetworkInfo,
} from "./store";

export { WalletError, type WalletErrorCode } from "./errors";
