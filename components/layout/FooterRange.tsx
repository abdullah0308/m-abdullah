"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowCounterClockwise, Crosshair } from "@phosphor-icons/react/dist/ssr";
import { useSiteContent } from "@/context/SiteContext";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { faceSrc, type FloconFace } from "@/components/flocon/assets";
import Fireworks, { type FireworksHandle } from "./Fireworks";

const QUIVER = 6;
const GOOD = 45; // a finished quiver at or above this earns the fireworks
const FLIGHT_MS = 300;
// Real recordings (BigSoundBank, CC0): a bow release, and arrows into straw.
const RELEASE_SRC = "/sounds/arrow-release.mp3";
const HIT_SRCS = [1, 2, 3].map((n) => `/sounds/arrow-hit-${n}.mp3`);
// A real display (BigSoundBank, CC0): four bursts, bang then crackle.
const BURST_SRCS = [1, 2, 3, 4].map((n) => `/sounds/firework-${n}.mp3`);
const R = 92; // target radius in the 200x200 viewBox

/** WA face, outermost ring first: two rings per colour, ten in all. */
const RINGS = [
  "#F3F1EC", "#F3F1EC",
  "#1B1D21", "#1B1D21",
  "#2F6FB6", "#2F6FB6",
  "#D9412F", "#D9412F",
  "#F2C230", "#F2C230",
];

interface Arrow {
  id: number;
  x: number;
  y: number;
  score: number;
}

const scoreAt = (x: number, y: number) => {
  const r = Math.hypot(x - 100, y - 100) / R;
  return r >= 1 ? 0 : 10 - Math.floor(r * 10);
};

/** A rough Gaussian, for keyboard releases: grouped, but not perfect. */
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.62;

/**
 * The footer's centrepiece: a target the visitor can actually shoot.
 *
 * Click (or tap) anywhere on the face to release an arrow there; keyboard
 * users press the Release button, which groups shots around the centre the
 * way a decent archer would. Six arrows to a quiver, then collect and go
 * again. Flocon judges each one: her expression and line change with the
 * score (a crossfade, never a moving cat).
 */
export default function FooterRange({
  onShot,
}: {
  /** Told about every arrow that lands: its score, the running total, and whether the quiver is now empty. */
  onShot?: (score: number, total: number, full: boolean) => void;
} = {}) {
  const { content } = useSiteContent();
  const f = content.footer;
  const reduce = useReduceMotion();
  const svg = useRef<SVGSVGElement>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const nextId = useRef(0);
  const inFlight = useRef(0);
  const fx = useRef<FireworksHandle>(null);
  const fxBox = useRef<HTMLDivElement>(null);
  const sounds = useRef<{ release: HTMLAudioElement; hits: HTMLAudioElement[]; bursts: HTMLAudioElement[] } | null>(null);

  // Created on first hover, focus or shot, so the sounds cost nothing until
  // someone actually plays.
  const loadSounds = () => {
    if (sounds.current || typeof Audio === "undefined") return;
    const mk = (src: string, vol: number) => {
      const a = new Audio(src);
      a.preload = "auto";
      a.volume = vol;
      return a;
    };
    sounds.current = {
      release: mk(RELEASE_SRC, 0.55),
      hits: HIT_SRCS.map((src) => mk(src, 0.8)),
      bursts: BURST_SRCS.map((src) => mk(src, 0.5)),
    };
  };
  const play = (a?: HTMLAudioElement, gain = 1) => {
    if (!a) return;
    // a fresh copy, so quick shots overlap instead of cutting each other off
    const c = a.cloneNode() as HTMLAudioElement;
    c.volume = Math.min(1, a.volume * gain);
    c.play().catch(() => {
      /* sound blocked: the shot still lands */
    });
  };

  // Fireworks are drawn on a canvas around the target, in its own pixels.
  const toCanvas = (x: number, y: number) => {
    const sv = svg.current?.getBoundingClientRect();
    const cb = fxBox.current?.getBoundingClientRect();
    if (!sv || !cb) return { x: 0, y: 0 };
    return { x: sv.left - cb.left + (x / 200) * sv.width, y: sv.top - cb.top + (y / 200) * sv.height };
  };

  const last = arrows[arrows.length - 1];
  const total = arrows.reduce((s, a) => s + a.score, 0);
  const full = arrows.length >= QUIVER;

  const verdict: { line: string; face: FloconFace } = !last
    ? { line: f.ready, face: "neutral" }
    : full
      ? total === QUIVER * 10
        ? { line: f.perfect, face: "shocked" }
        : total >= GOOD
          ? { line: f.great, face: "curious" }
          : { line: f.done, face: "lookup" }
      : last.score === 10
        ? { line: f.bullseye, face: "shocked" }
        : last.score >= 8
          ? { line: f.close, face: "curious" }
          : last.score >= 5
            ? { line: f.middle, face: "profile" }
            : last.score >= 1
              ? { line: f.wide, face: "grumpy" }
              : { line: f.miss, face: "grumpy" };

  const shoot = useCallback(
    (x: number, y: number) => {
      if (arrows.length + inFlight.current >= QUIVER) return;
      loadSounds();
      play(sounds.current?.release);
      inFlight.current++;
      const score = scoreAt(x, y);
      const land = () => {
        inFlight.current--;
        if (score > 0) play(sounds.current?.hits[Math.floor(Math.random() * HIT_SRCS.length)]);
        setArrows((prev) => {
          if (prev.length >= QUIVER) return prev;
          const next = [...prev, { id: nextId.current++, x, y, score }];
          const running = next.reduce((t, a) => t + a.score, 0);
          // after this render, so a listener may set state of its own
          if (onShot) setTimeout(() => onShot(score, running, next.length === QUIVER), 0);
          if (!reduce) {
            if (score === 10) {
              const pt = toCanvas(x, y);
              fx.current?.burst(pt.x, pt.y, 0.7);
            }
            const sum = next.reduce((t, a) => t + a.score, 0);
            if (next.length === QUIVER && sum >= GOOD) fx.current?.show(sum === QUIVER * 10 ? 12 : 7);
          }
          return next;
        });
      };
      if (reduce) land();
      else setTimeout(land, FLIGHT_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [arrows.length, reduce]
  );

  const onClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svg.current || full) return;
    const r = svg.current.getBoundingClientRect();
    shoot(((e.clientX - r.left) / r.width) * 200, ((e.clientY - r.top) / r.height) * 200);
  };

  const release = () => {
    if (full) return;
    shoot(100 + gauss() * R, 100 + gauss() * R);
  };

  return (
    <div
      ref={fxBox}
      className="relative grid items-center gap-10 sm:grid-cols-[minmax(0,1fr)_15rem]"
      onPointerEnter={loadSounds}
      onFocus={loadSounds}
    >
      {/* fireworks reach past the game; the footer panel clips them */}
      <Fireworks
        ref={fx}
        // each explosion gets a bang: big rockets louder, the bullseye pop softer
        onExplode={(size) => {
          const list = sounds.current?.bursts;
          if (list) play(list[Math.floor(Math.random() * list.length)], size < 0.8 ? 0.55 : 0.75 + Math.random() * 0.25);
        }}
        className="absolute -inset-x-10 -bottom-10 -top-40 z-10 h-[calc(100%+12.5rem)] w-[calc(100%+5rem)]" />
      <div className="relative mx-auto w-full max-w-[24rem]">
        <svg
          ref={svg}
          viewBox="0 0 200 200"
          onClick={onClick}
          role="img"
          aria-label={`Archery target. ${arrows.length} of ${QUIVER} arrows shot, score ${total}.`}
          className={`relative block w-full overflow-visible drop-shadow-[0_24px_40px_rgba(0,0,0,0.5)] ${full ? "" : "cursor-crosshair"}`}
        >
          {RINGS.map((c, i) => (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={R * (1 - i / 10)}
              fill={c}
              stroke={i === 2 || i === 3 ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.22)"}
              strokeWidth="0.6"
            />
          ))}
          <line x1="97" y1="100" x2="103" y2="100" stroke="rgba(0,0,0,0.45)" strokeWidth="0.6" />
          <line x1="100" y1="97" x2="100" y2="103" stroke="rgba(0,0,0,0.45)" strokeWidth="0.6" />

          {/* arrows, nock-on, as seen from the shooting line */}
          {/* misses go in the scorecard as M; nothing floats in mid-air */}
          {arrows.filter((a) => a.score > 0).map((a) => (
            <g key={a.id} transform={`translate(${a.x} ${a.y})`}>
              <motion.g
                initial={reduce ? false : { scale: 3.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 20 }}
              >
                <circle r="5.5" fill="rgba(0,0,0,0.28)" cx="1.2" cy="1.6" />
                {[0, 120, 240].map((deg) => (
                  <path
                    key={deg}
                    d="M0 0 L0 -7.5 Q2.2 -5.5 1.6 -1.4 Z"
                    fill="rgb(var(--accent-rgb))"
                    stroke="rgba(0,0,0,0.35)"
                    strokeWidth="0.4"
                    transform={`rotate(${deg})`}
                  />
                ))}
                <circle r="1.9" fill="#15181d" />
              </motion.g>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex flex-col gap-5">
        {/* scorecard */}
        <div className="flex flex-col gap-3 font-mono">
          <div>
            <div className="text-[0.7rem] uppercase tracking-wider text-muted">Score</div>
            <div className="text-4xl tabular-nums" aria-live="polite">
              {total}
              <span className="text-muted">/{QUIVER * 10}</span>
            </div>
          </div>
          <ol className="flex gap-1" aria-label="Arrows">
            {Array.from({ length: QUIVER }).map((_, i) => {
              const a = arrows[i];
              return (
                <li
                  key={i}
                  className={`grid h-7 w-7 place-items-center rounded-full border text-[0.7rem] tabular-nums ${
                    a ? (a.score >= 9 ? "border-accent bg-accent text-onAccent" : "border-line2 text-content") : "border-line text-muted/50"
                  }`}
                >
                  {a ? (a.score === 0 ? "M" : a.score) : ""}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Flocon judges */}
        <div className="flex items-center gap-3">
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-eye/60 bg-[#15181d]">
            <AnimatePresence initial={false}>
              <motion.span
                key={verdict.face}
                className="absolute inset-0"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Image src={faceSrc(verdict.face)} alt="" fill sizes="48px" className="object-cover" />
              </motion.span>
            </AnimatePresence>
          </span>
          <p className="text-sm leading-snug" aria-live="polite">
            <span className="block font-mono text-[0.68rem] text-eye">Flocon</span>
            {verdict.line}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={release}
            disabled={full}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-medium text-onAccent transition-opacity active:scale-[0.98] disabled:opacity-40"
          >
            <Crosshair size={16} weight="bold" />
            {f.releaseLabel}
          </button>
          <button
            type="button"
            onClick={() => setArrows([])}
            disabled={!arrows.length}
            aria-label={f.collectLabel}
            title={f.collectLabel}
            className="grid h-[2.85rem] w-[2.85rem] place-items-center rounded-full border border-line2 text-content transition-colors hover:bg-content/5 disabled:opacity-40"
          >
            <ArrowCounterClockwise size={16} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
