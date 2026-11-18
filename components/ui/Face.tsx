"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { faceSrc, type FloconFace } from "@/components/flocon/assets";

export const ABDULLAH_FACE = "/images/abdullah-face.webp";

/**
 * A round portrait of one of the two narrators. Flocon's expression can
 * change; when it does the photos crossfade (she never moves). Size comes
 * from `className` (h-/w- utilities), `sizes` tells the browser how big.
 */
export default function Face({
  who = "flocon",
  face = "neutral",
  className = "h-12 w-12",
  sizes = "64px",
}: {
  who?: "flocon" | "abdullah";
  face?: FloconFace;
  className?: string;
  sizes?: string;
}) {
  const reduce = useReduceMotion();
  const src = who === "abdullah" ? ABDULLAH_FACE : faceSrc(face);

  return (
    <span className={`relative block shrink-0 overflow-hidden rounded-full bg-[#1b1e24] ${className}`}>
      <AnimatePresence initial={false}>
        <motion.span
          key={src}
          className="absolute inset-0"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
