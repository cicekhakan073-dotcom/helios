"use client";

import { ArrowDownToLine, ArrowRightLeft, ArrowUpFromLine, Repeat } from "lucide-react";
import { motion } from "motion/react";

const STEPS = [
  {
    icon: ArrowDownToLine,
    title: "Flash borrow",
    desc: "Take a flash loan from the Blend pool — repaid within the same tx.",
    color: "text-aurora-amber",
  },
  {
    icon: ArrowUpFromLine,
    title: "Supply collateral",
    desc: "The user's collateral + the flash amount are supplied to the pool.",
    color: "text-aurora-mauve",
  },
  {
    icon: ArrowRightLeft,
    title: "Borrow",
    desc: "Borrow from the pool — enough to cover the flash repayment.",
    color: "text-aurora-teal",
  },
  {
    icon: Repeat,
    title: "Flash repay",
    desc: "The flash loan + Blend fee are repaid in the same tx — atomic.",
    color: "text-success",
  },
] as const;

/**
 * The 4-step atomic flash-loan loop — Framer Motion stagger.
 * Single-tx emphasis at the bottom.
 */
export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 px-6">
      <div className="mx-auto max-w-5xl flex flex-col gap-10">
        <div className="text-center">
          <h2 className="text-h1 text-text-high m-0">One atomic tx</h2>
          <p className="text-body-lg text-text-medium mt-3 max-w-2xl mx-auto">
            A single <code>InvokeHostFunctionOp</code> per tx on Soroban. Within that constraint
            Helios calls the Blend pool&apos;s <code>flash_loan(from, FlashLoan, requests)</code>{" "}
            function — if any step fails, the whole flow is reverted.
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
          ⚠️ If any step reverts, the position is never opened — user funds stay safe. Testnet ·
          unaudited demo.
        </p>
      </div>
    </section>
  );
}
