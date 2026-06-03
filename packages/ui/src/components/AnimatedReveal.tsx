"use client";

/**
 * AnimatedReveal — motion ile fade-up stagger; prefers-reduced-motion'a saygılı.
 *
 * Kullanım: liste/kart container'ı `<AnimatedReveal>` ile sar; doğrudan child
 * öğeler stagger ile belirir. Reduce-motion'da animasyonsuz render edilir.
 */

import { motion, useReducedMotion } from "motion/react";

import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Her child arasındaki gecikme (ms). */
  stagger?: number;
  /** Toplam içerik için sınıf (genelde grid/flex). */
  className?: string;
}

export function AnimatedReveal({ children, stagger = 60, className }: Props) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger / 1000 } },
      }}
    >
      {Array.isArray(children)
        ? children.map((c, i) => (
            <RevealItem key={(c as { key?: string | number })?.key ?? i}>{c}</RevealItem>
          ))
        : children}
    </motion.div>
  );
}

function RevealItem({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: "easeOut" } },
      }}
    >
      {children}
    </motion.div>
  );
}
