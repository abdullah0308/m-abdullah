"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { useSiteContent } from "@/context/SiteContext";
import { useVoice } from "@/context/VoiceContext";
import { useReduceMotion } from "@/lib/useReduceMotion";
import EditableText from "@/components/ui/EditableText";
import MarginNote from "@/components/ui/MarginNote";
import Reveal from "@/components/ui/Reveal";
import RevealText from "@/components/ui/RevealText";
import { FLOCON_POSES } from "@/components/flocon/assets";

/** WA target face, outermost first, for the small target at the far end. */
const TARGET = ["#F3F1EC", "#1B1D21", "#2F6FB6", "#D9412F", "#F2C230"];

/**
 * How the work gets thought through, as a walk down the range.
 *
 * The five steps scroll past on the right. On the left a panel stays put and
 * keeps score: the distance climbs from 0 to 70 metres as you read, and an
 * arrow travels a short range line from Flocon (sitting at the start, back
 * to us, watching) to the target. On phones the panel is a slim bar that
 * sticks under the header.
 *
 * It is one ordered list at every size and in every motion setting; the
 * scroll only drives the counter, the arrow, and which step is lit.
 */
export default function Process() {
  const { content, isEditing } = useSiteContent();
  const steps = content.process.steps;
  const { t } = useVoice();
  const reduce = useReduceMotion();

  const list = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: list, offset: ["start 0.52", "end 0.52"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });
  const metres = useTransform(smooth, (v) => String(Math.round(Math.min(1, Math.max(0, v)) * 70)).padStart(2, "0"));
  const arrowX = useTransform(smooth, [0, 1], ["0%", "100%"]);

  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(steps.length - 1, Math.max(0, Math.floor(v * steps.length)));
    setActive((prev) => (prev === next ? prev : next));
  });

  const lit = (i: number) => reduce || isEditing || i === active;

  return (
    <section id="process" className="px-4 py-24 sm:px-8 lg:px-12 lg:py-36">
      <div className="mx-auto max-w-[1760px]">
        <h2 className="mega text-m1 [text-wrap:balance]">
          <RevealText path="process.heading" className="block" />
        </h2>
        <Reveal>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-muted">
            <EditableText path="process.subheading" />
          </p>
        </Reveal>

        <div className="mt-14 lg:mt-24 lg:grid lg:grid-cols-12 lg:gap-8">
          {/* The scorekeeper */}
          <div className="sticky top-[4.25rem] z-10 -mx-4 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur-md sm:-mx-8 sm:px-8 lg:top-28 lg:col-span-5 lg:mx-0 lg:self-start lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="flex items-end justify-between gap-6 lg:block">
              <p className="mega flex items-end gap-[0.06em] text-[3.4rem] leading-[0.8] lg:text-[clamp(9rem,17vw,17rem)]" aria-hidden>
                {reduce ? <span className="tabular-nums">70</span> : <motion.span className="tabular-nums">{metres}</motion.span>}
                <span className="pb-[0.05em] text-[0.34em] text-accentInk">m</span>
              </p>
              <p className="pb-1 text-right text-sm text-muted lg:mt-4 lg:pb-0 lg:text-left lg:text-base">
                <span className="block font-display text-lg font-semibold text-content lg:text-2xl">
                  {steps[reduce ? steps.length - 1 : active]?.phase}
                </span>
                {t("of 70 m to the target", "of 70 m. I counted.")}
              </p>
            </div>

            {/* the range: Flocon at the line, the target at 70 m */}
            <div className="relative mt-3 lg:mt-12 lg:max-w-[30rem]">
              <div className="flex items-end gap-3">
                <Image
                  src={FLOCON_POSES.back.src}
                  alt=""
                  width={FLOCON_POSES.back.w}
                  height={FLOCON_POSES.back.h}
                  className="hidden h-24 w-auto shrink-0 lg:block"
                />
                <div className="relative mb-3 h-px flex-1 bg-line2 lg:mb-6">
                  {/* five marks, one per step */}
                  {steps.map((s, i) => (
                    <span
                      key={s.step}
                      aria-hidden
                      className={`absolute top-1/2 h-2 w-px -translate-y-1/2 transition-colors duration-500 ${
                        i <= active || reduce ? "bg-accent" : "bg-line2"
                      }`}
                      style={{ left: `${((i + 1) / steps.length) * 100}%` }}
                    />
                  ))}
                  {/* the arrow: a shaft that grows, with its point leading */}
                  <motion.span
                    aria-hidden
                    className="absolute inset-y-0 left-0 block h-px w-full origin-left bg-accent"
                    style={{ scaleX: reduce ? 1 : smooth }}
                  />
                  {/* clipped: the carrier slides a full line-width to the right */}
                  <span aria-hidden className="absolute -inset-y-2 inset-x-0 block overflow-hidden">
                    <motion.span
                      aria-hidden
                      className="absolute inset-y-0 left-0 block w-full"
                      style={{ x: reduce ? "100%" : arrowX }}
                    >
                      <span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-full -translate-y-1/2 rotate-45 border-r border-t border-accent" />
                    </motion.span>
                  </span>
                </div>
                <span aria-hidden className="relative mb-0 block h-7 w-7 shrink-0 lg:mb-2 lg:h-10 lg:w-10">
                  {TARGET.map((c, i) => (
                    <span
                      key={c}
                      className="absolute rounded-full"
                      style={{ inset: `${i * 10}%`, background: c, boxShadow: "0 0 0 1px rgb(0 0 0 / 0.25)" }}
                    />
                  ))}
                </span>
              </div>
            </div>

            <MarginNote section="process" face="lookup" className="mt-10 hidden lg:flex" />
          </div>

          {/* The steps */}
          <ol ref={list} className="lg:col-span-6 lg:col-start-7">
            {steps.map((s, i) => (
              <li
                key={s.step}
                className={`flex min-h-[46vh] flex-col justify-center border-b border-line py-12 transition-opacity duration-500 last:border-b-0 lg:min-h-[58vh] ${
                  lit(i) ? "opacity-100" : "opacity-35"
                }`}
              >
                <p className="font-mono text-sm text-muted">
                  <EditableText path={`process.steps.${i}.distance`} />
                </p>
                <h3 className="mega mt-3 text-m2">
                  <EditableText path={`process.steps.${i}.phase`} />
                </h3>
                <p className="mt-5 max-w-[44ch] text-lg leading-relaxed text-muted">
                  <EditableText path={`process.steps.${i}.description`} />
                </p>
              </li>
            ))}
          </ol>
        </div>

        <MarginNote section="process" face="lookup" className="mt-10 lg:hidden" />
      </div>
    </section>
  );
}
