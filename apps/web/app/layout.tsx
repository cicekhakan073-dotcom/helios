import "./globals.css";

import { brand, ToastHost, WalletButton } from "@helios/ui";
import Link from "next/link";

import { Providers } from "./providers";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  metadataBase: new URL("https://helios.invalid"),
  title: {
    default: "Helios — Leveraged yield on Stellar testnet",
    template: "%s · Helios",
  },
  description:
    "AI destekli, kaldıraçlı verim platformu. Stellar/Soroban testnet üzerinde — unaudited, eğitim amaçlı; yatırım tavsiyesi değildir.",
  applicationName: "Helios",
  keywords: ["Stellar", "Soroban", "Blend", "testnet", "leveraged yield", "DeFi", "PWA"],
  authors: [{ name: "Helios" }],
  openGraph: {
    title: "Helios — Leveraged yield on Stellar testnet",
    description:
      "Stellar/Soroban testnet üzerinde AI-rehberli kaldıraçlı stratejiler. Yatırım tavsiyesi değildir.",
    type: "website",
    locale: "tr_TR",
  },
  twitter: {
    card: "summary",
    title: "Helios — Leveraged yield (testnet)",
    description: "AI-rehberli kaldıraçlı stratejiler; eğitim amaçlıdır.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // suppressHydrationWarning: Stellar Wallets Kit client'ta <html>'e --swk-* CSS
  // değişkenleri enjekte ediyor → server/client style uyuşmazlığı (zararsız, 3rd-party).
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <Providers>
          {/* A11y: klavye kullanıcıları için skip link (PROMPT 33 WCAG AA). */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:rounded-md focus:bg-aurora-amber focus:text-text-on-aurora focus:px-4 focus:h-10 focus:inline-flex focus:items-center focus:font-semibold"
          >
            Ana içeriğe atla
          </a>
          <header className="sticky top-0 z-50 backdrop-blur-md bg-space-900/70 border-b border-border-subtle">
            <div className="mx-auto max-w-6xl flex items-center justify-between gap-4 px-6 h-14">
              <Link
                href="/"
                className="text-h4 font-display text-text-high m-0 hover:text-aurora-amber transition-colors"
              >
                {brand.name}
              </Link>
              <WalletButton />
            </div>
          </header>
          <div id="main-content">{children}</div>
          <ToastHost />
        </Providers>
      </body>
    </html>
  );
}
