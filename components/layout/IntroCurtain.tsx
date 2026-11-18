"use client";

import { useEffect, useRef, useState } from "react";
import { INTRO_SEEN_KEY } from "@/context/ThemeContext";

const COUNT_MS = 1500;
const HOLD_MS = 220;

/**
 * The intro: a walk to the 70 metre line. A counter climbs from 00 to 70
 * while an arrow-thin line draws across, then the whole curtain lifts and
 * the hero rises underneath it. About two seconds, once per tab.
 *
 * It is in the server HTML so the page never flashes before it. CSS removes
 * it for returning visitors, for reduced motion, and after a failsafe delay
 * (see #intro in globals.css); this component only drives the count and the
 * lift, writing straight to the DOM so nothing re-renders per frame.
 */
export default function IntroCurtain({ onLift }: { onLift: () => void }) {
  const [phase, setPhase] = useState<"count" | "lift" | "gone">("count");
  const root = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const line = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || getComputedStyle(el).display === "none") {
      setPhase("gone");
      onLift();
      return;
    }
    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      /* storage blocked: the intro simply plays on every load */
    }

    let raf = 0;
    let hold: ReturnType<typeof setTimeout> | undefined;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / COUNT_MS);
      const eased = 1 - Math.pow(1 - p, 3);
      if (num.current) num.current.textContent = String(Math.round(eased * 70)).padStart(2, "0");
      if (line.current) line.current.style.transform = `scaleX(${eased})`;
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        hold = setTimeout(() => {
          setPhase("lift");
          onLift();
        }, HOLD_MS);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (hold) clearTimeout(hold);
    };
  }, [onLift]);

  if (phase === "gone") return null;

  return (
    <div
      id="intro"
      ref={root}
      aria-hidden
      onTransitionEnd={(e) => {
        if (e.target === root.current && phase === "lift") setPhase("gone");
      }}
      className={`fixed inset-0 z-[90] flex flex-col justify-between bg-ink px-4 pb-4 pt-6 text-content transition-transform duration-[850ms] ease-expo sm:px-8 sm:pb-6 lg:px-12 ${
        phase === "lift" ? "-translate-y-full" : ""
      }`}
    >
      <div className="flex items-start justify-between font-mono text-xs uppercase tracking-wider text-muted">
        <span>Walking to the line</span>
        <span>70 m</span>
      </div>

      <div>
        <span className="block h-px w-full bg-line2">
          <span ref={line} className="block h-px w-full origin-left scale-x-0 bg-accent" />
        </span>
        <div className="mega mt-4 flex items-end gap-[0.08em] text-[clamp(8rem,36vw,30rem)] leading-[0.8]">
          <span ref={num} className="tabular-nums">
            00
          </span>
          <span className="pb-[0.06em] text-[0.32em] text-accentInk">m</span>
        </div>
      </div>
    </div>
  );
}
