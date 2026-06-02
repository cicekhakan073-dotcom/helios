"use client";

import { brand } from "@helios/ui";
import { motion } from "motion/react";
import Link from "next/link";

/**
 * Hero — demo'nun 0-10s hook'u.
 * Slogan + 2 CTA + üretim-kalite mikroinetiraksiyonlar.
 */
export function Hero() {
  return (
    <section className="relative pt-24 pb-16 px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        className="mx-auto max-w-4xl flex flex-col items-center text-center gap-6"
      >
        <span className="text-micro tracking-wider uppercase text-aurora-mauve">
          AI-guided leveraged yield · Stellar
        </span>
        <h1
          className="text-display font-display text-text-high m-0 max-w-3xl"
          style={{
            background: "var(--gradient-aurora)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {brand.tagline}
        </h1>
        <p className="text-body-lg text-text-medium m-0 max-w-2xl">
          Tek atomik tx&apos;te flash loan + Blend lending döngüsüyle kaldıraçlı pozisyon aç. AI
          Copilot ve Risk Radar ile riskin şeffaf. ⚠️ Sadece testnet — yatırım tavsiyesi değildir.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <Link
            href="/open"
            className="inline-flex items-center gap-2 rounded-md bg-aurora-amber text-text-on-aurora px-5 h-12 font-semibold hover:bg-aurora-amber-glow shadow-glow-amber transition-[background,box-shadow] duration-[120ms]"
          >
            Launch App
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-md border border-border-default px-5 h-12 text-text-high hover:bg-white/[0.04] hover:border-border-strong transition-colors"
          >
            How it works
          </a>
        </div>
      </motion.div>
    </section>
  );
}
