"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowsHorizontal } from "@phosphor-icons/react/dist/ssr";
import { useSiteContent } from "@/context/SiteContext";
import { useVoice } from "@/context/VoiceContext";
import EditableText from "@/components/ui/EditableText";
import Face from "@/components/ui/Face";
import MarginNote from "@/components/ui/MarginNote";
import Reveal from "@/components/ui/Reveal";
import RevealText from "@/components/ui/RevealText";
import { FLOCON_POSES, FLOCON_SWATCHES, type FloconFace, type FloconPose } from "@/components/flocon/assets";

const VIEWS: FloconPose[] = ["front", "q34", "side", "back"];
const DRAG_STEP = 70;

/**
 * Meet Flocon: her character sheet, laid out like a specimen page.
 *
 * Left, the facts. Centre, the turnaround in front of a target: drag
 * sideways, use the tabs, or the arrow keys to switch between the sheet's
 * four views. Right, her six expressions as a list; pointing at one changes
 * the portrait. Flocon herself never moves: views and expressions crossfade.
 */
export default function MeetFlocon() {
  const { content } = useSiteContent();
  const { flocon } = content;
  const { t } = useVoice();

  const [view, setView] = useState(0);
  const [mood, setMood] = useState(0);
  const drag = useRef<{ x: number; start: number } | null>(null);

  const go = (i: number) => setView(((i % VIEWS.length) + VIEWS.length) % VIEWS.length);
  const pose = FLOCON_POSES[VIEWS[view]];
  const current = flocon.moods[mood] ?? flocon.moods[0];

  const specs: [string, string][] = [
    ["Breed", flocon.breed],
    ["Build", flocon.build],
    ["Coat", flocon.coat],
    ["Eyes", flocon.eyes],
    ["Role", flocon.role],
  ];

  return (
    <section id="flocon" className="px-4 py-24 sm:px-8 lg:px-12 lg:py-36">
      <div className="mx-auto max-w-[1760px]">
        <h2 className="mega text-m1">
          <RevealText path="flocon.heading" className="block" />
        </h2>
        <Reveal className="mt-6 grid gap-4 lg:grid-cols-12 lg:gap-8">
          <p className="font-display text-[clamp(1.4rem,2.4vw,2.1rem)] font-semibold leading-tight ink-accent lg:col-span-5">
            <EditableText path="flocon.headingHighlight" />
          </p>
          <p className="max-w-[54ch] text-base leading-relaxed text-muted sm:text-lg lg:col-span-6 lg:col-start-7">
            <EditableText path="flocon.body" />
          </p>
        </Reveal>

        <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-12 lg:gap-8">
          {/* The facts */}
          <Reveal className="order-2 lg:order-1 lg:col-span-3 lg:self-end">
            <div className="font-display text-4xl font-bold uppercase">{flocon.name}</div>
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 font-mono text-[0.8rem] uppercase">
              {specs.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-7 flex gap-2" aria-label="Flocon's palette">
              {FLOCON_SWATCHES.map((s) => (
                <li
                  key={s.hex}
                  title={s.name}
                  className="h-8 w-8 rounded-full border border-line2"
                  style={{ background: s.hex }}
                >
                  <span className="sr-only">{s.name}</span>
                </li>
              ))}
            </ul>
            <p className="mt-7 max-w-[34ch] text-sm leading-relaxed text-muted">
              <EditableText path="flocon.note" />
            </p>
          </Reveal>

          {/* The turnaround */}
          <div className="order-1 lg:order-2 lg:col-span-6">
            <div
              role="group"
              aria-roledescription="turnaround"
              aria-label={`Flocon, ${pose.label} view. Use arrow keys to switch views.`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") go(view + 1);
                if (e.key === "ArrowLeft") go(view - 1);
              }}
              onPointerDown={(e) => {
                drag.current = { x: e.clientX, start: view };
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!drag.current) return;
                const next = drag.current.start - Math.round((e.clientX - drag.current.x) / DRAG_STEP);
                if (((next % 4) + 4) % 4 !== view) go(next);
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
              className="relative h-[21rem] touch-pan-y select-none sm:h-[28rem] lg:h-[34rem]"
            >
              {/* the target she sits in front of */}
              <div aria-hidden className="absolute bottom-10 left-1/2 aspect-square h-[calc(100%-2.5rem)] -translate-x-1/2">
                <div className="absolute inset-0 rounded-full border border-line2" />
                <div className="absolute inset-[16%] rounded-full border border-line2" />
                <div className="absolute inset-[32%] rounded-full bg-accent/15" />
              </div>
              {/* floor line */}
              <div aria-hidden className="absolute inset-x-0 bottom-10 h-px bg-line2" />

              <AnimatePresence initial={false}>
                <motion.div
                  key={view}
                  className="absolute inset-x-0 bottom-10 top-0 flex items-end justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <Image
                    src={pose.src}
                    alt=""
                    width={pose.w}
                    height={pose.h}
                    draggable={false}
                    className="h-[94%] w-auto max-w-[92%] object-contain object-bottom"
                  />
                </motion.div>
              </AnimatePresence>

              <p className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 text-xs text-muted">
                <ArrowsHorizontal size={14} weight="bold" aria-hidden />
                <EditableText path="flocon.turnaroundHint" />
              </p>
            </div>

            <div role="tablist" aria-label="Turnaround views" className="mt-4 grid grid-cols-4 gap-2">
              {VIEWS.map((v, i) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === i}
                  onClick={() => go(i)}
                  className={`relative rounded-full py-2.5 font-mono text-[0.7rem] uppercase tracking-wider transition-colors sm:text-xs ${
                    view === i ? "text-onAccent" : "text-muted hover:text-content"
                  }`}
                >
                  {view === i && (
                    <motion.span
                      layoutId="turn-tab"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative">{FLOCON_POSES[v].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* The expressions */}
          <Reveal delay={0.1} className="order-3 lg:col-span-3">
            <div className="flex items-end gap-5 lg:block">
              <Face
                face={current.face as FloconFace}
                className="h-28 w-28 sm:h-36 sm:w-36 lg:h-auto lg:w-full lg:max-w-[15rem] lg:aspect-square"
                sizes="(max-width: 1024px) 144px, 240px"
              />
              <p className="pb-1 text-sm text-muted lg:mt-4 lg:pb-0" aria-live="polite">
                <span className="sr-only">Flocon, </span>
                {t("Six expressions. Pick one.", "My six expressions. Pick one.")}
              </p>
            </div>
            <ul className="mt-5">
              {flocon.moods.map((m, i) => (
                <li key={m.face} className="border-t border-line">
                  <button
                    type="button"
                    onMouseEnter={() => setMood(i)}
                    onFocus={() => setMood(i)}
                    onClick={() => setMood(i)}
                    aria-pressed={mood === i}
                    className={`flex w-full items-center justify-between gap-3 py-3 text-left transition-colors ${
                      mood === i ? "text-content" : "text-muted hover:text-content"
                    }`}
                  >
                    <span className="font-display text-lg font-semibold sm:text-xl">
                      <EditableText path={`flocon.moods.${i}.label`} />
                    </span>
                    <span
                      aria-hidden
                      className={`h-2 w-2 shrink-0 rounded-full transition-colors ${mood === i ? "bg-accent" : "bg-line2"}`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <MarginNote section="flocon" face="curious" className="mt-14" />
      </div>
    </section>
  );
}
