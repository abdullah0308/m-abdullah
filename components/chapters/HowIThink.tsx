"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const PRINCIPLES = [
  {
    number: "01",
    title: "Clarity before speed",
    body: "I've learned to slow down before I build. A clear problem definition is worth more than three fast solutions to the wrong question.",
    annotation: "nock point: where you begin, not where you finish.",
  },
  {
    number: "02",
    title: "Systems over features",
    body: "I'm more interested in how things connect than in any individual piece. Good code doesn't just work. It makes sense when someone else reads it at 11pm on a Tuesday.",
    annotation: "anchor point: repeatable, not just reachable.",
  },
  {
    number: "03",
    title: "Honest iteration",
    body: "I keep track of what didn't work. Not as failures, as data. Every deviation from the target tells you something true about your process.",
    annotation: "follow-through: what you do after the release matters too.",
  },
];

function CrosshairSVG() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        cx="40"
        cy="40"
        r="24"
        stroke="var(--color-text)"
        strokeWidth="1"
      />
      <line
        x1="40"
        y1="10"
        x2="40"
        y2="70"
        stroke="var(--color-text)"
        strokeWidth="1"
      />
      <line
        x1="10"
        y1="40"
        x2="70"
        y2="40"
        stroke="var(--color-text)"
        strokeWidth="1"
      />
    </svg>
  );
}

function Principle({
  principle,
  delay,
}: {
  principle: (typeof PRINCIPLES)[0];
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const prefersReduced = useReducedMotion();

  return (
    <div ref={ref} className="relative">
      {/* Crosshair flash — Phase 1 */}
      {!prefersReduced && (
        <motion.div
          initial={{ opacity: 0, scale: 1.3 }}
          animate={
            inView
              ? { opacity: [0, 0.35, 0], scale: [1.3, 1.0, 1.0] }
              : { opacity: 0, scale: 1.3 }
          }
          transition={{ duration: 0.6, delay }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 1 }}
          aria-hidden="true"
        >
          <CrosshairSVG />
        </motion.div>
      )}

      {/* Text block — Phase 2 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, delay: delay + (prefersReduced ? 0 : 0.3) }}
        style={{ position: "relative", zIndex: 2 }}
      >
        {/* Large faint number */}
        <span
          className="font-mono text-7xl md:text-8xl font-bold select-none"
          style={{ color: "var(--color-line)" }}
          aria-hidden="true"
        >
          {principle.number}
        </span>

        <h3
          className="font-serif text-2xl md:text-3xl mt-2 mb-4"
          style={{ color: "var(--color-text)" }}
        >
          {principle.title}
        </h3>

        <p
          className="font-sans text-base leading-relaxed mb-4"
          style={{ color: "var(--color-text)", maxWidth: "480px" }}
        >
          {principle.body}
        </p>

        <p
          className="font-mono text-xs italic"
          style={{ color: "var(--color-muted)" }}
        >
          {principle.annotation}
        </p>
      </motion.div>
    </div>
  );
}

export default function HowIThink() {
  return (
    <section
      id="how-i-think"
      data-snap="true"
      className="relative flex items-center justify-center px-6 md:px-16 overflow-hidden"
      style={{ minHeight: "100svh", backgroundColor: "var(--color-bg)" }}
    >
      {/* Faint grid overlay — only this chapter */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 39px, var(--color-line) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, var(--color-line) 40px)",
          opacity: 0.03,
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-6xl py-24">
        {/* Section label */}
        <span
          className="font-mono text-xs tracking-widest block mb-16"
          style={{ color: "var(--color-muted)" }}
        >
          HOW I THINK
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {PRINCIPLES.map((p, i) => (
            <Principle key={p.number} principle={p} delay={i * 0.2} />
          ))}
        </div>
      </div>
    </section>
  );
}
