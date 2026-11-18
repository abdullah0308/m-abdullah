"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Page-read progress, drawn as a hairline across the very top of the viewport.
 *
 * Springs the raw scroll value so the bar eases rather than tracking the wheel
 * one-to-one, which looks mechanical. It sits above the header (z-[60]) and is
 * aria-hidden, the information is already available from the scrollbar.
 */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 26,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left"
      style={{
        scaleX,
        background: "rgb(var(--accent-rgb))",
      }}
    />
  );
}
