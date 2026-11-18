"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useSiteContent } from "@/context/SiteContext";
import { useVoice } from "@/context/VoiceContext";
import { useIntro } from "@/context/IntroContext";
import { useCopy } from "@/lib/useCopy";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { emWidth, FACE_O_EXTRA } from "@/lib/typeMetrics";
import { warmMeows } from "@/lib/meow";
import { FLOCON_POSES } from "@/components/flocon/assets";
import ArrowButton from "@/components/ui/ArrowButton";
import EditableImage from "@/components/ui/EditableImage";
import EditableText from "@/components/ui/EditableText";
import Face, { ABDULLAH_FACE } from "@/components/ui/Face";
import { EASE } from "@/components/ui/Reveal";
import { faceSrc } from "@/components/flocon/assets";

const rise = (delay: number) => ({
  hidden: { y: "118%" },
  still: { y: "0%", transition: { duration: 0 } },
  show: { y: "0%", transition: { duration: 1, ease: EASE, delay } },
});

/** One masked unit of the headline: the text rises out of its own line. */
function Unit({
  children,
  delay,
  className = "block",
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
}) {
  return (
    <span className={`-my-[0.08em] overflow-hidden py-[0.08em] ${className}`}>
      <motion.span className="block" variants={rise(delay)}>
        {children}
      </motion.span>
    </span>
  );
}

/**
 * The three poster lines. The last line breaks one word per row on phones
 * and runs as a single line from `sm` up. The first letter O in it is drawn
 * as a portrait of the other narrator.
 */
function Lines({ l1, l2, l3, faceUrl }: { l1: string; l2: string; l3: string; faceUrl: string }) {
  const words = l3.split(/\s+/).filter(Boolean);
  const faceWord = words.findIndex((w) => /o/i.test(w));

  return (
    <>
      <Unit delay={0}>{l1}</Unit>
      <Unit delay={0.09}>{l2}</Unit>
      <span className="block">
        {words.map((w, i) => {
          const at = i === faceWord ? w.search(/o/i) : -1;
          return (
            <span key={`${w}-${i}`}>
              <Unit delay={0.18 + i * 0.07} className="block align-bottom sm:inline-block">
                {at < 0 ? (
                  w
                ) : (
                  <>
                    {w.slice(0, at)}
                    <span className="face-o">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={faceUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    </span>
                    {w.slice(at + 1)}
                  </>
                )}
              </Unit>
              {i < words.length - 1 ? " " : null}
            </span>
          );
        })}
      </span>
    </>
  );
}

/**
 * The opening poster: three lines of condensed capitals sized to fill the
 * page width exactly, with the narrator standing in front of them. Where a
 * line crosses the figure it is redrawn in dark ink, clipped to the figure's
 * silhouette, so the type stays readable on a white shirt or a white coat.
 *
 * It waits for the intro curtain: the lines rise as the curtain lifts.
 */
export default function Hero() {
  const { content, isEditing } = useSiteContent();
  const { isCat, toggle, t } = useVoice();
  const { ready } = useIntro();
  const reduce = useReduceMotion();

  const l1 = useCopy("hero.line1");
  const l2 = useCopy("hero.line2");
  const l3 = useCopy("hero.line3");
  const cta = useCopy("hero.ctaWork");

  // Size the headline from the widths of its lines (see typeMetrics.ts).
  const words = l3.split(/\s+/).filter(Boolean);
  const faceWord = words.findIndex((w) => /o/i.test(w));
  const extra = faceWord >= 0 ? FACE_O_EXTRA : 0;
  const kDesktop = Math.max(emWidth(l1), emWidth(l2), emWidth(l3) + extra) * 1.015;
  const kMobile =
    Math.max(emWidth(l1), emWidth(l2), ...words.map((w, i) => emWidth(w) + (i === faceWord ? extra : 0))) * 1.02;

  const cat = isCat && !isEditing;
  const figure = cat
    ? { src: FLOCON_POSES.front.src, w: FLOCON_POSES.front.w, h: FLOCON_POSES.front.h, scale: 0.8 }
    : { src: content.hero.portrait, w: 834, h: 1400, scale: 1 };
  const faceUrl = cat ? ABDULLAH_FACE : faceSrc("neutral");

  const state = reduce ? "still" : ready ? "show" : "hidden";
  const fade = {
    hidden: { opacity: 0 },
    still: { opacity: 1, transition: { duration: 0 } },
    show: { opacity: 1, transition: { duration: 1.1, ease: EASE, delay: 0.25 } },
  };

  const stageVars = {
    "--k-d": kDesktop.toFixed(3),
    "--k-m": kMobile.toFixed(3),
    "--lines-m": 2 + words.length,
    "--cut": `url("${figure.src}")`,
    "--scale": figure.scale,
    "--ar": (figure.w / figure.h).toFixed(3),
    // Flocon is narrow enough to sit fully on a phone screen; Abdullah bleeds off it.
    "--pr-phone": cat ? "0cqw" : "-9cqw",
  } as CSSProperties;

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="mx-auto max-w-[1760px] px-4 sm:px-8 lg:px-12">
        <div style={{ containerType: "inline-size" }}>
          <motion.div
            className="hero-stage relative flex min-h-[100dvh] flex-col justify-end pb-6"
            style={stageVars}
            initial={reduce ? false : "hidden"}
            animate={state}
          >
            {/* a warm light behind the figure */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-[20%] top-0 h-full w-[85%] sm:-right-[8%] sm:w-[55%]"
              style={{
                background: "radial-gradient(closest-side, rgb(var(--accent-rgb) / 0.17), transparent 72%)",
              }}
            />

            {/* the headline itself */}
            <div className="relative">
              <h1 className="mega hero-lines">
                <span className="sr-only">
                  {content.meta.name}: {l1} {l2} {l3}
                </span>
                {isEditing ? (
                  <span className="block text-[0.5em]">
                    <EditableText path="hero.line1" className="block" />
                    <EditableText path="hero.line2" className="block" />
                    <EditableText path="hero.line3" className="block" />
                  </span>
                ) : (
                  <span aria-hidden>
                    <Lines l1={l1} l2={l2} l3={l3} faceUrl={faceUrl} />
                  </span>
                )}
              </h1>

              <motion.div
                variants={fade}
                className="hero-row relative z-20 flex flex-col justify-end gap-x-10 gap-y-4 sm:flex-row sm:flex-wrap sm:content-end sm:items-end sm:justify-start"
              >
                <p className="max-w-[25rem] text-[0.95rem] leading-relaxed text-muted sm:text-base">
                  <EditableText path="hero.subtext" />{" "}
                  <EditableText path="hero.subtextHighlight" className="text-content" />
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                  <ArrowButton href="#work">{cta}</ArrowButton>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={toggle}
                      onPointerEnter={warmMeows}
                      onFocus={warmMeows}
                      className="group flex items-center gap-2.5 text-left text-sm text-content"
                    >
                      <Face who={isCat ? "abdullah" : "flocon"} className="h-10 w-10" sizes="40px" />
                      <span className="underline decoration-line2 decoration-1 underline-offset-[5px] transition-colors group-hover:decoration-accent">
                        {t("Or let Flocon tell it", "Give it back to Abdullah")}
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            </div>

            {isEditing ? (
              <div className="absolute right-0 top-24 h-56 w-36">
                <EditableImage path="hero.portrait" alt="Abdullah Mohamed" fill sizes="144px" className="object-contain" />
              </div>
            ) : (
              <motion.div aria-hidden={cat} variants={fade} className="pointer-events-none absolute inset-0 z-10">
                <Image
                  key={figure.src}
                  src={figure.src}
                  alt={cat ? "" : "Abdullah Mohamed, in a white polo shirt"}
                  width={figure.w}
                  height={figure.h}
                  priority
                  sizes="(max-width: 640px) 90vw, 40vw"
                  className="hero-portrait"
                />
                {/* the same lines again, in dark ink, only where the figure is */}
                <div aria-hidden className="hero-over absolute inset-0 flex flex-col justify-end pb-6">
                  <div className="mega hero-lines text-[#0e1013]">
                    <Lines l1={l1} l2={l2} l3={l3} faceUrl={faceUrl} />
                  </div>
                  <div className="hero-row" />
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
