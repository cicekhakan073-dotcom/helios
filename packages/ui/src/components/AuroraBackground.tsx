"use client";

import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "motion/react";

import { motion as motionTokens } from "../tokens";

/**
 * AuroraBackground — design-system §6.3 + §7.4.
 * 3 yumuşak gradient blob, ambient loop. Reduced-motion'da statik.
 *
 * `position: fixed; inset: 0; z-index: -1; pointer-events: none` —
 * body altında durur, içeriği bloklamaz.
 */

interface BlobConfig {
  className: string;
  animate: TargetAndTransition;
  durationMultiplier: number;
  delay?: number;
}

const blobs: BlobConfig[] = [
  {
    className: "aurora-bg__blob aurora-bg__blob--amber",
    animate: {
      x: ["-15%", "25%", "-10%", "-15%"],
      y: ["-10%", "10%", "20%", "-10%"],
      scale: [1, 1.1, 0.95, 1],
    },
    durationMultiplier: 0.89,
  },
  {
    className: "aurora-bg__blob aurora-bg__blob--mauve",
    animate: {
      x: ["20%", "-15%", "25%", "20%"],
      y: ["-15%", "5%", "15%", "-15%"],
      scale: [1, 1.05, 1, 1],
    },
    durationMultiplier: 1.11,
    delay: 4,
  },
  {
    className: "aurora-bg__blob aurora-bg__blob--teal",
    animate: {
      x: ["0%", "20%", "-20%", "0%"],
      y: ["20%", "-15%", "10%", "20%"],
      scale: [1, 1.1, 0.95, 1],
    },
    durationMultiplier: 1.33,
    delay: 8,
  },
];

export function AuroraBackground() {
  const reduce = useReducedMotion();
  const ambient = motionTokens.duration.ambient;

  return (
    <div className="aurora-bg" aria-hidden="true">
      {blobs.map((blob) => {
        const transition: Transition = {
          duration: ambient * blob.durationMultiplier,
          ease: motionTokens.ease.standard,
          repeat: Number.POSITIVE_INFINITY,
          ...(blob.delay !== undefined ? { delay: blob.delay } : {}),
        };
        // exactOptionalPropertyTypes ile uyumlu: koşullu prop spread.
        const motionProps = reduce ? {} : { animate: blob.animate, transition };
        return <motion.div key={blob.className} className={blob.className} {...motionProps} />;
      })}
      <div className="aurora-bg__vignette" />
    </div>
  );
}
