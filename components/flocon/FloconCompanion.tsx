"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useVoice } from "@/context/VoiceContext";
import { SECTION_IDS, useActiveSection } from "@/lib/useActiveSection";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { meow, warmMeows } from "@/lib/meow";
import Face from "@/components/ui/Face";
import type { FloconFace } from "./assets";

/** Which expression Flocon wears in each section. */
const FACE_FOR: Record<string, FloconFace> = {
  top: "neutral",
  about: "profile",
  flocon: "curious",
  process: "lookup",
  work: "grumpy",
  skills: "curious",
  archery: "profile",
  contact: "neutral",
};

const RING = 2 * Math.PI * 30;

/**
 * Flocon rides along in the corner for the whole journey. Three jobs:
 *   1. Her face changes with the section in view (FACE_FOR).
 *   2. The green ring around her is page progress, her eye colour.
 *   3. Tap her and she meows (a real cat, one of four recordings).
 *
 * Her comments on each section live in the page margins now (MarginNote),
 * so she only speaks up here when petted.
 */
export default function FloconCompanion() {
  const active = useActiveSection(SECTION_IDS);
  const reduce = useReduceMotion();
  const { t } = useVoice();
  const [visible, setVisible] = useState(false);
  const [meowing, setMeowing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const dash = useTransform(progress, (v) => RING * (1 - v));

  // Arrive a beat after load so the hero gets the first look.
  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 1400);
    return () => {
      clearTimeout(show);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const pet = () => {
    meow();
    setMeowing(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMeowing(false), 2200);
  };

  const face = meowing ? "shocked" : FACE_FOR[active] ?? "neutral";

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          aria-label="Flocon"
          className="fixed bottom-3 right-3 z-40 flex items-center gap-3 sm:bottom-6 sm:right-6"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <AnimatePresence>
            {meowing && (
              <motion.p
                key="meow"
                role="status"
                className="rounded-full bg-content px-4 py-2 text-sm font-medium text-ink shadow-lg"
                initial={reduce ? false : { opacity: 0, x: 10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 6, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                style={{ transformOrigin: "100% 50%" }}
              >
                {t("Meow.", "Meow. Obviously.")}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="button"
            onPointerEnter={warmMeows}
            onFocus={warmMeows}
            onClick={pet}
            aria-label="Pet Flocon (she meows)"
            className="group relative h-12 w-12 shrink-0 rounded-full sm:h-16 sm:w-16"
          >
            <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
              <circle cx="32" cy="32" r="30" fill="none" className="stroke-line2" strokeWidth="2.5" />
              <motion.circle
                cx="32"
                cy="32"
                r="30"
                fill="none"
                stroke="rgb(var(--eye-rgb))"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={RING}
                style={{ strokeDashoffset: dash }}
              />
            </svg>
            <span className="absolute inset-[5px] block overflow-hidden rounded-full shadow-lg transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
              {/* expressions crossfade; the photo itself never moves */}
              <Face face={face} className="h-full w-full" sizes="64px" />
            </span>
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
