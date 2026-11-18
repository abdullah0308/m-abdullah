"use client";

import { useRef } from "react";
import Image from "next/image";
import { METABOX_LOGO } from "@/lib/defaultContent";
import { motion, useInView, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useSiteContent } from "@/context/SiteContext";
import { useVoice } from "@/context/VoiceContext";
import { useCopy } from "@/lib/useCopy";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { ramp } from "@/lib/ramp";
import EditableImage from "@/components/ui/EditableImage";
import EditableText from "@/components/ui/EditableText";
import MarginNote from "@/components/ui/MarginNote";
import Reveal, { EASE } from "@/components/ui/Reveal";

/** One word of the statement: it brightens as the reader's scroll reaches it. */
function Word({
  children,
  progress,
  from,
  to,
  still,
}: {
  children: string;
  progress: MotionValue<number>;
  from: number;
  to: number;
  still: boolean;
}) {
  const opacity = useTransform(progress, ramp(from, to, 0.16, 1));
  // an explicit 1 when still: dropping the style would leave the last dim value behind
  return <motion.span style={{ opacity: still ? 1 : opacity }}>{children} </motion.span>;
}

/**
 * About, as one long statement read at scroll speed: the words start dim and
 * light up in order as the paragraph crosses the viewport, so the page sets
 * the reading pace. Under it, the desk where the work happens, the company,
 * and the three verbs.
 */
export default function About() {
  const { content, isEditing } = useSiteContent();
  const { meta, about } = content;
  const { t } = useVoice();
  const reduce = useReduceMotion();

  const heading = useCopy("about.heading");
  const highlight = useCopy("about.headingHighlight");
  const body = useCopy("about.body1");

  const statement = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({ target: statement, offset: ["start 0.88", "end 0.55"] });

  const photo = useRef<HTMLDivElement>(null);
  const { scrollYProgress: photoProgress } = useScroll({ target: photo, offset: ["start end", "end start"] });
  const photoScale = useTransform(photoProgress, [0, 1], [1.16, 1]);
  // Watched on the wrapper: an element clipped to nothing never counts as in view.
  const photoInView = useInView(photo, { amount: 0.25 });

  const parts = [
    { text: heading, accent: false },
    { text: highlight, accent: true },
    { text: body, accent: false },
  ];
  const total = parts.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
  let seen = 0;

  return (
    <section id="about" className="px-4 pb-24 pt-28 sm:px-8 lg:px-12 lg:pb-36 lg:pt-44">
      <div className="mx-auto max-w-[1760px]">
        {isEditing ? (
          <h2 className="font-display text-[clamp(1.75rem,4.3vw,4.1rem)] font-semibold leading-[1.08]">
            <EditableText path="about.heading" /> <EditableText path="about.headingHighlight" className="ink-accent" />{" "}
            <EditableText path="about.body1" />
          </h2>
        ) : (
          <h2
            ref={statement}
            className="font-display text-[clamp(1.75rem,4.3vw,4.1rem)] font-semibold leading-[1.08] lg:max-w-[92%]"
          >
            {parts.map((part) => (
              <span key={part.text} className={part.accent ? "ink-accent" : undefined}>
                {part.text
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((w) => {
                    const i = seen++;
                    return (
                      <Word
                        key={`${w}-${i}`}
                        progress={scrollYProgress}
                        from={i / total}
                        to={Math.min(1, (i + 3) / total)}
                        still={reduce}
                      >
                        {w}
                      </Word>
                    );
                  })}
              </span>
            ))}
          </h2>
        )}

        <div className="mt-16 grid gap-10 lg:mt-28 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div ref={photo} className="lg:col-span-7">
            <motion.div
              className="relative aspect-[16/10] overflow-hidden bg-surface sm:aspect-[16/9]"
              initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
              animate={{ clipPath: reduce || photoInView ? "inset(0% 0% 0% 0%)" : "inset(100% 0% 0% 0%)" }}
              transition={{ duration: reduce ? 0 : 1.1, ease: EASE }}
            >
              <motion.div className="absolute inset-0" style={{ scale: reduce ? 1 : photoScale }}>
                <EditableImage
                  path="about.photo"
                  alt="Abdullah at his desk at MetaBox Technology, working across two monitors"
                  fill
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="object-cover"
                />
              </motion.div>
            </motion.div>
          </div>

          <Reveal className="lg:col-span-4 lg:col-start-9">
            <p className="text-lg leading-relaxed text-muted">
              <EditableText path="about.body2" />
            </p>

            <div className="mt-8">
              <p className="text-sm text-muted">{t("Currently building at", "He currently works at")}</p>
              {/* MetaBox's own logo: the white version on dark, the coloured one on light */}
              <Image src={METABOX_LOGO.white} alt={meta.company} width={678} height={178} className="only-dark mt-3 h-11 w-auto" />
              <Image src={METABOX_LOGO.colour} alt={meta.company} width={678} height={178} className="only-light mt-3 h-11 w-auto" />
            </div>

            <ul className="mt-8 flex flex-wrap gap-2">
              {about.values.map((v, i) => (
                <li key={v} className="rounded-full border border-line2 bg-transparent px-4 py-2 text-sm">
                  <EditableText path={`about.values.${i}`} />
                </li>
              ))}
            </ul>

            <MarginNote section="about" face="profile" className="mt-10" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
