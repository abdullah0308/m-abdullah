"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

const MARKERS = [
  {
    distance: "10m",
    line1: "Wrote my first real component. It worked.",
    line2: "I didn't fully understand why. That bothered me enough to dig deeper.",
    center: 0.1,
  },
  {
    distance: "20m",
    line1: "Built something someone else actually used.",
    line2: '"Works on my machine" is not a standard.',
    center: 0.3,
  },
  {
    distance: "30m",
    line1: "Broke a production build.",
    line2: "Best lesson I've had. Taught me to read errors, not fear them.",
    center: 0.5,
  },
  {
    distance: "40m",
    line1: "Understood that clean code is a form of communication.",
    line2: "You're writing for the next person, often future you.",
    center: 0.7,
  },
  {
    distance: "50m",
    line1: "Started thinking about systems, not just features.",
    line2: "This is where I am now.",
    center: 0.88,
  },
];

function DistanceMarker({
  marker,
  index,
  sectionProgress,
  prefersReduced,
}: {
  marker: (typeof MARKERS)[0];
  index: number;
  sectionProgress: ReturnType<typeof useScroll>["scrollYProgress"];
  prefersReduced: boolean | null;
}) {
  // Slightly different parallax window per marker (offset by 0.05)
  const halfWindow = 0.08 + index * 0.01;
  const c = marker.center;

  const y = useTransform(
    sectionProgress,
    [c - halfWindow, c, c + halfWindow],
    prefersReduced ? [0, 0, 0] : [60, 0, -60]
  );
  const opacity = useTransform(
    sectionProgress,
    [c - halfWindow, c, c + halfWindow],
    [0, 1, 0]
  );

  return (
    <motion.div
      style={{ y, opacity, position: "absolute", inset: 0 }}
      className="flex flex-col items-center justify-center text-center px-6"
      aria-hidden="true"
    >
      <span
        className="font-mono text-6xl md:text-8xl font-bold"
        style={{ color: "var(--color-accent)" }}
      >
        {marker.distance}
      </span>
      <p
        className="font-serif text-lg md:text-xl mt-4"
        style={{ color: "var(--color-text)", maxWidth: "520px" }}
      >
        {marker.line1}
      </p>
      <p
        className="font-serif text-base mt-2"
        style={{ color: "var(--color-muted)", maxWidth: "520px" }}
      >
        {marker.line2}
      </p>
    </motion.div>
  );
}

function FinalMarker({
  sectionProgress,
}: {
  sectionProgress: ReturnType<typeof useScroll>["scrollYProgress"];
}) {
  const opacity = useTransform(sectionProgress, [0.9, 0.97, 1], [0, 1, 1]);

  return (
    <motion.div
      style={{ opacity, position: "absolute", inset: 0 }}
      className="flex flex-col items-center justify-center text-center px-6"
    >
      <p
        className="font-mono text-base md:text-xl"
        style={{ color: "var(--color-text)" }}
      >
        →&nbsp;&nbsp;Target: unknown distance.
      </p>
      <p
        className="font-mono text-sm mt-3"
        style={{ color: "var(--color-muted)" }}
      >
        That&apos;s the point.
      </p>
    </motion.div>
  );
}

export default function DistanceTraveled() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      ref={sectionRef}
      id="distance-traveled"
      data-snap="true"
      style={{
        height: "300vh",
        backgroundColor: "var(--color-bg)",
        position: "relative",
      }}
    >
      {/* Sticky viewport */}
      <div
        className="sticky top-0 overflow-hidden"
        style={{ height: "100svh" }}
      >
        {/* Section label */}
        <div className="absolute top-8 left-6 md:left-16 z-10">
          <span
            className="font-mono text-xs tracking-widest"
            style={{ color: "var(--color-muted)" }}
          >
            DISTANCE TRAVELED
          </span>
        </div>

        {/* Markers — all stacked, each visible at different scroll positions */}
        <div className="relative w-full" style={{ height: "100%" }}>
          {MARKERS.map((marker, i) => (
            <DistanceMarker
              key={marker.distance}
              marker={marker}
              index={i}
              sectionProgress={scrollYProgress}
              prefersReduced={prefersReduced}
            />
          ))}
          <FinalMarker sectionProgress={scrollYProgress} />
        </div>
      </div>
    </section>
  );
}
