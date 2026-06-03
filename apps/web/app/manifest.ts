/**
 * Helios web app manifest (Next.js 16 metadata file convention).
 *
 * iOS 16.4+ home-screen install ile push notification destekler;
 * masaüstü Chromium/Firefox/Safari 16 macOS 13+ standart.
 */

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Helios — Stellar testnet leveraged yield",
    short_name: "Helios",
    description:
      "Stellar/Soroban testnet üzerinde AI-rehberli kaldıraçlı stratejiler — eğitim amaçlı, yatırım tavsiyesi değildir.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0e1a",
    theme_color: "#f6c34d",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
