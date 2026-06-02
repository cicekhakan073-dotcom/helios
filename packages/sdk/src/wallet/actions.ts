/**
 * Kit ↔ Zustand store köprüsü: connect / disconnect / re-sync.
 *
 * UI bu fn'leri çağırır → store güncellenir → React re-render eder.
 */

import { network as heliosNetwork } from "../index";

import { toWalletError } from "./errors";
import {
  getKitAddress,
  getKitNetwork,
  isTestnetPassphrase,
  kitDisconnect,
  openAuthModal,
  setKitWallet,
} from "./kit";
import { useWalletStore, type WalletNetworkInfo } from "./store";

/** Auth modal aç + bağlan. Kit `authModal()` modal'ı gösterir, kullanıcı
 *  cüzdan seçtikten sonra address döner; ardından getNetwork ile passphrase
 *  doğrulama. */
export async function connectWallet(): Promise<void> {
  const store = useWalletStore.getState();
  store._setConnecting();
  try {
    const { address } = await openAuthModal();
    // authModal seçili wallet id'yi kit içinde set eder; store'a yazmak için
    // bir sonraki refresh'e bırakıyoruz (selectedWalletId rendering için
    // optional — UI önce address'i gösterir).
    const netResp = await getKitNetwork();
    const networkInfo: WalletNetworkInfo = {
      network: netResp.network,
      passphrase: netResp.networkPassphrase,
    };
    const walletId = store.selectedWalletId ?? ""; // kit tarafından set edildi
    if (!isTestnetPassphrase(netResp.networkPassphrase)) {
      store._setWrongNetwork(address, walletId, networkInfo);
      return;
    }
    if (networkInfo.passphrase !== heliosNetwork.passphrase) {
      store._setWrongNetwork(address, walletId, networkInfo);
      return;
    }
    store._setConnected(address, walletId, networkInfo);
  } catch (err) {
    const walletErr = toWalletError(err, "CONNECTION_FAILED");
    store._setError(walletErr);
    store._setDisconnected();
    throw walletErr;
  }
}

/** Bilinen wallet id ile bağlanma (re-connect — sayfa yenilemede kullanılır). */
export async function reconnectKnownWallet(walletId: string): Promise<void> {
  const store = useWalletStore.getState();
  store._setConnecting();
  try {
    setKitWallet(walletId);
    await refreshConnection(walletId);
  } catch (err) {
    const walletErr = toWalletError(err, "CONNECTION_FAILED");
    store._setError(walletErr);
    store._setDisconnected();
    throw walletErr;
  }
}

/** Adres + ağ tekrar oku, store güncelle. */
async function refreshConnection(walletId: string): Promise<void> {
  const store = useWalletStore.getState();
  const [addrResp, netResp] = await Promise.all([getKitAddress(), getKitNetwork()]);
  const networkInfo: WalletNetworkInfo = {
    network: netResp.network,
    passphrase: netResp.networkPassphrase,
  };
  if (!isTestnetPassphrase(netResp.networkPassphrase)) {
    store._setWrongNetwork(addrResp.address, walletId, networkInfo);
    return;
  }
  if (networkInfo.passphrase !== heliosNetwork.passphrase) {
    store._setWrongNetwork(addrResp.address, walletId, networkInfo);
    return;
  }
  store._setConnected(addrResp.address, walletId, networkInfo);
}

/** Bağlantıyı kes (state temizle + kit-side disconnect). */
export async function disconnectWallet(): Promise<void> {
  const store = useWalletStore.getState();
  try {
    await kitDisconnect();
  } catch {
    /* idempotent */
  }
  store._setDisconnected();
}

/** Ağ değişimini elle kontrol et (kit broadcaster'a abone değil — periyodik poll için). */
export async function syncWalletNetwork(): Promise<void> {
  const state = useWalletStore.getState();
  if (state.status === "disconnected" || !state.selectedWalletId) return;
  try {
    const netResp = await getKitNetwork();
    const networkInfo: WalletNetworkInfo = {
      network: netResp.network,
      passphrase: netResp.networkPassphrase,
    };
    const ok = isTestnetPassphrase(netResp.networkPassphrase)
      && networkInfo.passphrase === heliosNetwork.passphrase;
    if (!ok) {
      if (state.address && state.selectedWalletId) {
        state._setWrongNetwork(state.address, state.selectedWalletId, networkInfo);
      }
    } else if (state.status === "wrong-network" && state.address && state.selectedWalletId) {
      state._setConnected(state.address, state.selectedWalletId, networkInfo);
    }
  } catch {
    // Kit hatasında bağlantıyı koparma — bir sonraki poll'da düzelir.
  }
}
