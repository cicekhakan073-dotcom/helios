"use client";

import {
  connectWallet,
  disconnectWallet,
  selectAddress,
  selectLastError,
  selectNetworkInfo,
  selectStatus,
  shortAddress,
  useAuth,
  useWalletStore,
} from "@helios/sdk";
import { AlertTriangle, KeyRound, Loader2, Wallet } from "lucide-react";

import { cn } from "../utils";

/**
 * WalletButton — design-system §7.8 + PROMPT 16 kabul kriterleri.
 *
 * 4 durum:
 *   - disconnected   → "Connect wallet" ghost button
 *   - connecting     → shimmer + spinner
 *   - connected      → pill: avatar + kısa adres + ağ rozeti + (disconnect menüsü)
 *   - wrong-network  → kırmızı pill: "Switch to Testnet" CTA
 *
 * Wallets Kit ile bağlantı yalnız client tarafında çalışır → "use client".
 */
export function WalletButton({ className }: { className?: string }) {
  const status = useWalletStore(selectStatus);
  const address = useWalletStore(selectAddress);
  const networkInfo = useWalletStore(selectNetworkInfo);
  const lastError = useWalletStore(selectLastError);

  // PROMPT 17 — SEP-10 oturum durumu
  const auth = useAuth();

  const onConnect = () => {
    void connectWallet().catch(() => {
      /* hata zaten store.lastError'a yansıdı */
    });
  };

  const onDisconnect = () => {
    auth.logout.mutate();
    void disconnectWallet();
  };

  const onSignIn = () => {
    if (!address) return;
    auth.signIn.mutate(address);
  };

  if (status === "disconnected") {
    return (
      <button
        type="button"
        onClick={onConnect}
        aria-label={lastError ? `Connect — son hata: ${lastError.message}` : "Connect wallet"}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-border-default bg-transparent",
          "px-4 h-10 text-body text-text-high",
          "transition-[background,border-color] duration-[120ms] ease-[var(--ease-standard)]",
          "hover:bg-white/[0.04] hover:border-border-strong",
          "focus-visible:outline-3 focus-visible:outline-aurora-teal focus-visible:outline-offset-2",
          className,
        )}
      >
        <Wallet className="size-4" aria-hidden="true" />
        Connect
      </button>
    );
  }

  if (status === "connecting") {
    return (
      <button
        type="button"
        disabled
        aria-busy="true"
        aria-label="Cüzdana bağlanıyor"
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-border-default bg-transparent",
          "px-4 h-10 text-body text-text-medium opacity-60",
          className,
        )}
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Connecting…
      </button>
    );
  }

  if (status === "wrong-network") {
    return (
      <button
        type="button"
        onClick={onConnect}
        aria-label="Cüzdan yanlış ağda — Testnet'e geç"
        className={cn(
          "inline-flex items-center gap-2 rounded-pill border border-danger/40 bg-danger-soft",
          "px-3 h-9 text-caption font-semibold text-hf-danger",
          "transition-[background,border-color] duration-[120ms] ease-[var(--ease-standard)]",
          "hover:bg-danger-soft/80",
          "focus-visible:outline-3 focus-visible:outline-aurora-teal focus-visible:outline-offset-2",
          className,
        )}
        data-status="wrong-network"
      >
        <AlertTriangle className="size-4" aria-hidden="true" />
        Switch to Testnet
      </button>
    );
  }

  // connected
  const addr = address ?? "";
  const isTestnet = networkInfo?.passphrase === "Test SDF Network ; September 2015";
  const isSigningIn = auth.signIn.isPending;
  const showSignIn = !auth.isAuthenticated;

  return (
    <div className="inline-flex items-center gap-2">
      {showSignIn && (
        <button
          type="button"
          onClick={onSignIn}
          disabled={isSigningIn}
          aria-label="SEP-10 ile oturum aç"
          className={cn(
            "inline-flex items-center gap-1 rounded-md border border-aurora-amber/40 bg-aurora-amber/10",
            "px-3 h-9 text-caption font-semibold text-aurora-amber",
            "hover:bg-aurora-amber/20 transition-colors",
            "focus-visible:outline-3 focus-visible:outline-aurora-teal focus-visible:outline-offset-2",
            "disabled:opacity-60",
          )}
          data-action="sign-in"
        >
          {isSigningIn ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <KeyRound className="size-4" aria-hidden="true" />
          )}
          {isSigningIn ? "Signing…" : "Sign in"}
        </button>
      )}
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-pill bg-space-600 px-3 h-9 border border-border-default",
          className,
        )}
        data-status="connected"
        data-authenticated={auth.isAuthenticated ? "true" : "false"}
      >
        <span
          aria-hidden="true"
          className="inline-block size-6 rounded-full bg-gradient-to-br from-aurora-amber via-aurora-mauve to-aurora-teal"
        />
        <span className="text-caption font-mono tabular text-text-high" data-num title={addr}>
          {shortAddress(addr)}
        </span>
        <span
          className={cn(
            "text-micro uppercase tracking-wider px-2 py-0.5 rounded-sm",
            isTestnet ? "bg-success-soft text-success" : "bg-warn-soft text-warn",
          )}
        >
          {isTestnet ? "Testnet" : networkInfo?.network ?? "?"}
        </span>
        {auth.isAuthenticated && (
          <span
            aria-label="Oturum açık"
            className="text-micro uppercase tracking-wider px-2 py-0.5 rounded-sm bg-success-soft text-success"
          >
            Authed
          </span>
        )}
        <button
          type="button"
          onClick={onDisconnect}
          aria-label="Bağlantıyı kes"
          className={cn(
            "ml-1 text-caption text-text-low hover:text-text-high",
            "focus-visible:outline-3 focus-visible:outline-aurora-teal focus-visible:outline-offset-2 rounded-sm",
          )}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
