/**
 * Wallet global state — Zustand.
 *
 * Tutulan state:
 *   - address          : Connected wallet'ın public key'i
 *   - selectedWalletId : Hangi cüzdan tipi (FREIGHTER_ID vs)
 *   - network          : "testnet" | "public" (passphrase ile)
 *   - status           : "disconnected" | "connecting" | "connected" | "wrong-network"
 *   - lastError        : Son `WalletError` (UI gösterimi için)
 *
 * Persistence: yalnız `selectedWalletId` localStorage'a yazılır → sayfa
 * yenilemesinde son cüzdan hatırlanır, ancak otomatik bağlanma YOK
 * (kullanıcı yeniden "Connect" tıklamalı — explicit-connect disiplini).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { type WalletError } from "./errors";

export type WalletStatus = "disconnected" | "connecting" | "connected" | "wrong-network";

export interface WalletNetworkInfo {
  /** "testnet" / "public" — kit `WalletNetwork` enum string'i. */
  network: string;
  passphrase: string;
}

export interface WalletState {
  address: string | null;
  selectedWalletId: string | null;
  networkInfo: WalletNetworkInfo | null;
  status: WalletStatus;
  lastError: WalletError | null;

  // Mutators (kit ile bağlanan action'lar wallet/actions.ts'te)
  _setConnecting: () => void;
  _setConnected: (address: string, walletId: string, network: WalletNetworkInfo) => void;
  _setDisconnected: () => void;
  _setWrongNetwork: (address: string, walletId: string, network: WalletNetworkInfo) => void;
  _setError: (err: WalletError | null) => void;
}

/** Persist edilen alt küme — sadece son cüzdan id'si. */
interface PersistedState {
  selectedWalletId: string | null;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      selectedWalletId: null,
      networkInfo: null,
      status: "disconnected",
      lastError: null,

      _setConnecting: () => set({ status: "connecting", lastError: null }),

      _setConnected: (address, walletId, network) =>
        set({
          address,
          selectedWalletId: walletId,
          networkInfo: network,
          status: "connected",
          lastError: null,
        }),

      _setDisconnected: () =>
        set({
          address: null,
          networkInfo: null,
          status: "disconnected",
          // selectedWalletId KORUNUR — sayfa yenilemesinde "son cüzdanı hatırla" için
          lastError: null,
        }),

      _setWrongNetwork: (address, walletId, network) =>
        set({
          address,
          selectedWalletId: walletId,
          networkInfo: network,
          status: "wrong-network",
        }),

      _setError: (err) => set({ lastError: err }),
    }),
    {
      name: "helios-wallet", // localStorage key
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          // SSR fallback — no-op storage
          return {
            getItem: () => null,
            setItem: () => {
              /* no-op SSR */
            },
            removeItem: () => {
              /* no-op SSR */
            },
          };
        }
        return window.localStorage;
      }),
      partialize: (state): PersistedState => ({
        selectedWalletId: state.selectedWalletId,
      }),
    },
  ),
);

/** UI seçicileri — re-render minimize için. */
export const selectStatus = (s: WalletState) => s.status;
export const selectAddress = (s: WalletState) => s.address;
export const selectNetworkInfo = (s: WalletState) => s.networkInfo;
export const selectLastError = (s: WalletState) => s.lastError;

/** Kısaltılmış adres: "GAQU…APYM" gibi. */
export function shortAddress(addr: string | null, head = 4, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
