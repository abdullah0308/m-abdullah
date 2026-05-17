"use client";

import { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  AnimatePresence,
  useReducedMotion,
} from "framer-motion";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = "#00A7E1";
const TEXT = "#FFFFFF";
const MUTED = "#5B7FA6";
const BG = "#000000";
const LINE_COLOR = "rgba(255,255,255,0.06)";

const STAGES = [
  {
    label: "TARGET",
    title: "Target",
    body: "At MetaBox Technology, the focus is clear. Build things that actually work.",
    sub: "Real systems, real constraints, real codebases. WordPress, PHP, Next.js.",
  },
  {
    label: "AIM",
    title: "Aim",
    body: "Understanding comes before output.",
    sub: "Reading code, breaking things down, seeing how each piece fits.",
  },
  {
    label: "DRAW",
    title: "Draw",
    body: "Progress takes control and consistency.",
    sub: "Refining structure, improving logic, thinking more precisely.",
  },
  {
    label: "RELEASE",
    title: "Release",
    body: "Code is shipped with intent.",
    sub: "Clean, functional, reliable.",
  },
  {
    label: "HIT",
    title: "Hit",
    body: "Still early, still learning. Moving forward with purpose.",
    sub: "Every iteration gets sharper.",
  },
];

// ---------------------------------------------------------------------------
// Archery target SVG
// ---------------------------------------------------------------------------

function ArcheryTarget({ progress }: { progress: number }) {
  // Line rotates from -150deg (left) to 0deg (right) across full scroll
  const rotation = -150 + progress * 150;

  const rings = [120, 96, 72, 48, 28, 12];
  const ringColors = [
    "rgba(12,97,112,0.04)",
    "rgba(12,97,112,0.06)",
    "rgba(12,97,112,0.08)",
    "rgba(12,97,112,0.10)",
    "rgba(12,97,112,0.14)",
    "rgba(12,97,112,0.22)",
  ];
  const ringStrokes = [
    "rgba(12,97,112,0.08)",
    "rgba(12,97,112,0.10)",
    "rgba(12,97,112,0.12)",
    "rgba(12,97,112,0.16)",
    "rgba(12,97,112,0.22)",
    "rgba(12,97,112,0.35)",
  ];

  return (
    <svg
      width="320"
      height="320"
      viewBox="0 0 320 320"
      fill="none"
      aria-hidden="true"
    >
      {/* Rings */}
      {rings.map((r, i) => (
        <circle
          key={r}
          cx={160}
          cy={160}
          r={r}
          fill={ringColors[i]}
          stroke={ringStrokes[i]}
          strokeWidth="1"
        />
      ))}

      {/* Crosshair lines */}
      <line x1="160" y1="30" x2="160" y2="290" stroke={LINE_COLOR} strokeWidth="1" />
      <line x1="30" y1="160" x2="290" y2="160" stroke={LINE_COLOR} strokeWidth="1" />

      {/* Rotating aim line */}
      <g
        style={{
          transformOrigin: "160px 160px",
          transform: `rotate(${rotation}deg)`,
          transition: "transform 0.05s linear",
        }}
      >
        <line
          x1="160"
          y1="160"
          x2="285"
          y2="160"
          stroke={ACCENT}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Small filled circle at tip */}
        <circle cx="285" cy="160" r="3" fill={ACCENT} />
      </g>

      {/* Center dot */}
      <circle cx="160" cy="160" r="4" fill={ACCENT} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Stage text block
// ---------------------------------------------------------------------------

function StageText({ stage, isLast }: { stage: typeof STAGES[0]; isLast: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18, transition: { duration: 0.18, ease: "easeIn" } }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <motion.p
        className="text-xs tracking-[0.3em] uppercase font-mono mb-5"
        style={{ color: ACCENT }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.35 }}
      >
        {stage.label}
      </motion.p>

      <h2
        className="font-serif leading-none mb-7"
        style={{
          color: TEXT,
          fontSize: "clamp(3.2rem, 7vw, 5.5rem)",
          fontWeight: 400,
        }}
      >
        {stage.title}
      </h2>

      <p className="text-lg md:text-xl leading-relaxed mb-3" style={{ color: TEXT }}>
        {stage.body}
      </p>
      <p className="text-base md:text-lg leading-relaxed" style={{ color: MUTED }}>
        {stage.sub}
      </p>

      {isLast && (
        <motion.div
          className="mt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.45 }}
        >
          <a
            href="https://www.linkedin.com/in/abdullah-mohamed-05426931a/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono transition-colors duration-200"
            style={{ color: MUTED }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = ACCENT)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = MUTED)}
          >
            Reach me on LinkedIn.
          </a>
        </motion.div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Reduced motion fallback
// ---------------------------------------------------------------------------

function StaticFallback() {
  return (
    <section id="contact" style={{ backgroundColor: BG, color: TEXT }} className="py-24 px-6 md:px-12">
      <div className="max-w-2xl mx-auto space-y-16">
        {STAGES.map((stage) => (
          <div key={stage.label}>
            <p className="text-xs tracking-[0.3em] uppercase font-mono mb-4" style={{ color: ACCENT }}>
              {stage.label}
            </p>
            <h2 className="font-serif text-5xl leading-none mb-6" style={{ color: TEXT, fontWeight: 400 }}>
              {stage.title}
            </h2>
            <p className="text-lg leading-relaxed mb-2" style={{ color: TEXT }}>{stage.body}</p>
            <p className="text-base leading-relaxed" style={{ color: MUTED }}>{stage.sub}</p>
          </div>
        ))}
        <a
          href="https://www.linkedin.com/in/abdullah-mohamed-05426931a/"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs font-mono"
          style={{ color: MUTED }}
        >
          Reach me on LinkedIn.
        </a>
        <p className="text-xs font-mono pt-6" style={{ color: "rgba(122,118,112,0.35)" }}>
          2026 Abdullah Mohamed - All Rights Reserved
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function TheShot() {
  const outerRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const [activeStage, setActiveStage] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const prevStage = useRef(0);

  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  // Rotate target line: -150deg at 0, 0deg at 1
  const lineRotation = useTransform(scrollYProgress, [0, 1], [-150, 0]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setScrollProgress(v);
    const next = Math.min(4, Math.floor(v / 0.2));
    if (next !== prevStage.current) {
      prevStage.current = next;
      setActiveStage(next);
    }
  });

  if (prefersReduced) return <StaticFallback />;

  return (
    <div
      ref={outerRef}
      id="contact"
      style={{ height: "500vh", position: "relative", backgroundColor: BG }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          backgroundColor: BG,
          display: "flex",
          alignItems: "center",
        }}
      >
        {/* Stage indicator dots - top right */}
        <div className="absolute top-8 right-8 z-20 flex gap-2.5">
          {STAGES.map((_, i) => (
            <motion.div
              key={i}
              className="rounded-full"
              animate={{
                scale: i === activeStage ? 1.3 : 1,
                backgroundColor: i === activeStage ? ACCENT : "rgba(232,228,220,0.12)",
              }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              style={{ width: 6, height: 6 }}
            />
          ))}
        </div>

        {/* Main layout */}
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-12 md:gap-20">
          {/* Left: text */}
          <div className="flex-1 max-w-lg">
            <AnimatePresence mode="wait">
              <StageText
                key={activeStage}
                stage={STAGES[activeStage]}
                isLast={activeStage === 4}
              />
            </AnimatePresence>
          </div>

          {/* Right: target - hidden on small mobile */}
          <div className="hidden sm:flex items-center justify-center flex-shrink-0">
            <motion.div
              style={{ rotate: lineRotation }}
              className="hidden"
              aria-hidden="true"
            />
            <ArcheryTarget progress={scrollProgress} />
          </div>
        </div>

        {/* Footer */}
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-center py-5"
          style={{ borderTop: `1px solid rgba(232,228,220,0.05)` }}
        >
          <p className="text-xs font-mono" style={{ color: "rgba(122,118,112,0.35)" }}>
            2026 Abdullah Mohamed - All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
