"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";

const CARD_ROWS = [
  { label: "NAME", value: "Abdullah Mohamed" },
  { label: "FOCUS", value: "Frontend → Fullstack" },
  { label: "CURRENT", value: "Next.js · WordPress · PHP" },
  { label: "LEARNING", value: "Systems architecture · Clean code" },
  { label: "BASED", value: "Mauritius" },
  { label: "STATUS", value: "Available, actively looking" },
];

function getLastUpdated() {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default function TheArcher() {
  const prefersReduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const narrativeRef = useRef<HTMLDivElement>(null);
  const cardInView = useInView(cardRef, { once: true, amount: 0.25 });
  const narrativeInView = useInView(narrativeRef, { once: true, amount: 0.25 });

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.12 },
    },
  };

  const rowVariants = {
    hidden: prefersReduced
      ? { opacity: 0 }
      : { opacity: 0, x: -8 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <section
      id="the-archer"
      data-snap="true"
      className="relative flex items-center justify-center px-6 md:px-16"
      style={{
        minHeight: "100svh",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 py-24">
        {/* LEFT — Calibration Card + Dev Photo */}
        <div className="flex flex-col gap-6">
          <motion.div
            ref={cardRef}
            variants={containerVariants}
            initial="hidden"
            animate={cardInView ? "visible" : "hidden"}
            className="rounded-none"
            style={{
              border: "1px solid var(--color-line)",
              backgroundColor: "var(--color-surface)",
              padding: "2rem",
            }}
          >
            <span
              className="font-mono text-xs tracking-widest block mb-6"
              style={{ color: "var(--color-muted)" }}
            >
              CALIBRATION CARD
            </span>

            <div className="flex flex-col gap-4">
              {CARD_ROWS.map((row) => (
                <motion.div
                  key={row.label}
                  variants={rowVariants}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="flex gap-4 items-baseline"
                >
                  <span
                    className="font-mono text-xs w-24 shrink-0 tracking-widest"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {row.label}
                  </span>
                  <span
                    className="font-mono text-sm"
                    style={{ color: "var(--color-text)" }}
                  >
                    {row.value}
                  </span>
                </motion.div>
              ))}

              {/* Last Updated row — dynamic */}
              <motion.div
                variants={rowVariants}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex gap-4 items-baseline"
              >
                <span
                  className="font-mono text-xs w-24 shrink-0 tracking-widest"
                  style={{ color: "var(--color-muted)" }}
                >
                  LAST UPDATED
                </span>
                <span
                  className="font-mono text-sm"
                  style={{ color: "var(--color-text)" }}
                >
                  {getLastUpdated()}
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Dev photo */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={cardInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
            className="relative w-full overflow-hidden"
            style={{
              aspectRatio: "4/3",
              border: "1px solid var(--color-line)",
            }}
          >
            <Image
              src="/images/dev-photo.jpg"
              alt="Abdullah at work — coding"
              fill
              className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <span
              className="absolute bottom-0 left-0 font-mono text-xs tracking-widest px-3 py-2"
              style={{
                color: "var(--color-muted)",
                backgroundColor: "rgba(10,10,10,0.7)",
              }}
            >
              IN THE FIELD
            </span>
          </motion.div>
        </div>

        {/* RIGHT — Narrative */}
        <motion.div
          ref={narrativeRef}
          initial={{ opacity: 0 }}
          animate={narrativeInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex items-center"
        >
          <div
            className="font-serif text-base md:text-lg"
            style={{
              color: "var(--color-text)",
              lineHeight: 1.8,
            }}
          >
            <p className="mb-6">
              I started building things because I wanted to understand
              how they worked, not just use them.
            </p>
            <p className="mb-6">That impulse is still what drives me.</p>
            <p className="mb-6">
              I&apos;m a junior developer, and I mean that honestly, not
              apologetically. I know what I don&apos;t know. I&apos;m
              methodical about closing that gap. I approach problems the way
              I approach archery: understand the variables, control what you
              can, release with intention, and adjust based on where it lands.
            </p>
            <p>
              I&apos;m not looking for a stage. I&apos;m looking for a room
              where good thinking is valued, and where I can keep getting
              sharper.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
