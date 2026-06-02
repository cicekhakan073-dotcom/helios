"use client";

import { ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine, Repeat } from "lucide-react";
import { motion } from "motion/react";

const STEPS = [
  {
    icon: ArrowDownToLine,
    title: "Flash borrow",
    desc: "Blend pool'dan flash kredi al — geri ödeme aynı tx içinde.",
    color: "text-aurora-amber",
  },
  {
    icon: ArrowUpFromLine,
    title: "Supply collateral",
    desc: "Kullanıcının teminatı + flash miktarı pool'a supply edilir.",
    color: "text-aurora-mauve",
  },
  {
    icon: ArrowRightLeft,
    title: "Borrow",
    desc: "Pool'dan borç alınır — flash repayment'ı karşılayacak miktar.",
    color: "text-aurora-teal",
  },
  {
    icon: Repeat,
    title: "Flash repay",
    desc: "Flash kredi + Blend fee aynı tx'te geri ödenir — atomik.",
    color: "text-success",
  },
] as const;

/**
 * 4 adım atomik flash-loan döngüsü — Framer Motion stagger.
 * Tek tx vurgusu en altta.
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 px-6">
      <div className="mx-auto max-w-5xl flex flex-col gap-10">
        <div className="text-center">
          <h2 className="text-h1 text-text-high m-0">Tek atomik tx</h2>
          <p className="text-body-lg text-text-medium mt-3 max-w-2xl mx-auto">
            Soroban&apos;da tx başına tek <code>InvokeHostFunctionOp</code>. Helios bu kısıt
            içinde Blend pool&apos;un <code>flash_loan(from, FlashLoan, requests)</code> fn&apos;ini
            çağırır — herhangi bir adım fail ederse tüm akış geri alınır.
          </p>
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-4 gap-4 list-none p-0 m-0">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.4, delay: i * 0.12, ease: [0.2, 0, 0, 1] }}
              className="relative rounded-lg bg-space-700 border border-border-default p-5 flex flex-col gap-3"
            >
              <span className="absolute top-3 right-3 text-micro text-text-low tabular">
                {String(i + 1).padStart(2, "0")}
              </span>
              <step.icon className={`size-7 ${step.color}`} aria-hidden="true" />
              <h3 className="text-h4 text-text-high m-0">{step.title}</h3>
              <p className="text-caption text-text-medium m-0">{step.desc}</p>
            </motion.li>
          ))}
        </ol>
        <p className="text-caption text-text-low text-center max-w-xl mx-auto">
          ⚠️ Herhangi bir adımda revert olursa pozisyon hiç açılmaz — kullanıcı fonları güvende.
          Testnet · unaudited demo.
        </p>
      </div>
    </section>
  );
}
