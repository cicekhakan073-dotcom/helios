/**
 * StellarWalletsKit static singleton sarmalayıcısı.
 *
 * Kit v2.2.0 **static class API** kullanır: `StellarWalletsKit.init(...)` →
 * sonra `StellarWalletsKit.getAddress()` / `getNetwork()` / `setWallet()` /
 * `disconnect()` / `authModal()` statik fn'leri.
 *
 * Browser-only: `window` yoksa erken hata. Lazy init pattern'i SSR'ı korur.
 *
 * STELLAR_STACK.md §1 pin: @creit.tech/stellar-wallets-kit 2.2.0.
 * Freighter v2 explicit-connect davranışı: `getAddress()` ilk çağrıda
 * Freighter "Connect" istemini gösterir (imza istemeden).
 */

import {
  Networks,
  StellarWalletsKit,
  type ISupportedWallet,
} from "@creit.tech/stellar-wallets-kit";
import { AlbedoModule } from "@creit.tech/stellar-wallets-kit/modules/albedo";
import {
  FREIGHTER_ID,
  FreighterModule,
} from "@creit.tech/stellar-wallets-kit/modules/freighter";
import { HanaModule } from "@creit.tech/stellar-wallets-kit/modules/hana";
import { LobstrModule } from "@creit.tech/stellar-wallets-kit/modules/lobstr";
import { RabetModule } from "@creit.tech/stellar-wallets-kit/modules/rabet";
import { xBullModule } from "@creit.tech/stellar-wallets-kit/modules/xbull";

let _initialized = false;

function ensureBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("StellarWalletsKit yalnız browser'da kullanılabilir (window yok).");
  }
}

/** İlk çağrıda kit'i `init` eder (static, idempotent). */
function ensureInit(): void {
  if (_initialized) return;
  ensureBrowser();
  StellarWalletsKit.init({
    modules: [
      new FreighterModule(),
      new xBullModule(),
      new AlbedoModule(),
      new LobstrModule(),
      new RabetModule(),
      new HanaModule(),
    ],
    selectedWalletId: FREIGHTER_ID,
    network: Networks.TESTNET,
  });
  _initialized = true;
}

/** Wallets Kit auth modal'ı aç + cüzdan seçtir → adres döner. */
export async function openAuthModal(): Promise<{ address: string }> {
  ensureInit();
  return StellarWalletsKit.authModal();
}

/** Seçili cüzdandan adresi al. */
export async function getKitAddress(): Promise<{ address: string }> {
  ensureInit();
  return StellarWalletsKit.getAddress();
}

/** Seçili cüzdandan ağ bilgisini al. */
export async function getKitNetwork(): Promise<{
  network: string;
  networkPassphrase: string;
}> {
  ensureInit();
  return StellarWalletsKit.getNetwork();
}

/** Belirli bir wallet id'ye geç. */
export function setKitWallet(walletId: string): void {
  ensureInit();
  StellarWalletsKit.setWallet(walletId);
}

/** Kit'in disconnect mantığı (kullanıcı state'i temizler; modül-spesifik). */
export async function kitDisconnect(): Promise<void> {
  if (!_initialized) return;
  return StellarWalletsKit.disconnect();
}

/** Helios testnet passphrase mi? */
export function isTestnetPassphrase(passphrase: string): boolean {
  // Networks enum string-valued; explicit cast'le `no-unsafe-enum-comparison` susar.
  return passphrase === (Networks.TESTNET as string);
}

export { FREIGHTER_ID, Networks };
export type { ISupportedWallet };
