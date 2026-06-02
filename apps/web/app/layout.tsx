import "./globals.css";

import { brand, ToastHost, WalletButton } from "@helios/ui";
import Link from "next/link";

import { Providers } from "./providers";

import type { Metadata } from "next";
import type { ReactNode } from "react";


export const metadata: Metadata = {
  title: "Helios — Leveraged yield on Stellar",
  description:
    "AI destekli, çoklu varlık, kaldıraçlı verim platformu. Stellar/Soroban testnet üzerinde — unaudited, not financial advice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Providers>
          <header className="sticky top-0 z-50 backdrop-blur-md bg-space-900/70 border-b border-border-subtle">
            <div className="mx-auto max-w-6xl flex items-center justify-between gap-4 px-6 h-14">
              <Link href="/" className="text-h4 font-display text-text-high m-0 hover:text-aurora-amber transition-colors">
                {brand.name}
              </Link>
              <WalletButton />
            </div>
          </header>
          {children}
          <ToastHost />
        </Providers>
      </body>
    </html>
  );
}
