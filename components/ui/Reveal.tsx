"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useReduceMotion } from "@/lib/useReduceMotion";

export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Enter-on-scroll, replayed: content animates in each time it comes into
 * view and resets when it leaves, so scrolling back up and down again plays it
 * again. (An earlier custom observer left content stuck at opacity 0 under
 * fast scrolling; framer-motion's whileInView settles correctly, and the
 * verify suite's scroll-thrash check guards it.)
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "li" | "span" | "p";
}) {
  const reduce = useReduceMotion();
  const Tag = motion[as];

  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            animate={reduce ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: false, amount: 0.2 }}
      transition={reduce ? { duration: 0 } : { duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}
