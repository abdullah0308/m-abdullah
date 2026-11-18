"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { useSiteContent } from "@/context/SiteContext";
import { useVoice } from "@/context/VoiceContext";
import { useReduceMotion } from "@/lib/useReduceMotion";
import EditableImage from "@/components/ui/EditableImage";
import EditableText from "@/components/ui/EditableText";
import Face from "@/components/ui/Face";
import MarginNote from "@/components/ui/MarginNote";
import Reveal, { EASE } from "@/components/ui/Reveal";
import RevealText from "@/components/ui/RevealText";

/**
 * The work, as an index. Four project names in the poster type; choosing one
 * opens it in place (picture, what it was, what it taught, Flocon's review).
 * With a mouse, a preview of each closed project follows the pointer down
 * the list, so the pictures can be skimmed without opening anything.
 *
 * Every panel is in the HTML whether open or not; closed ones are inert.
 */
export default function Work() {
  const { content, isEditing } = useSiteContent();
  const shots = content.work.shots;
  const { t } = useVoice();
  const reduce = useReduceMotion();

  const [open, setOpen] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // The preview trails the pointer on a spring rather than sticking to it.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 28, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 28, mass: 0.6 });

  const previewing = fine && !isEditing && hover !== null && hover !== open;

  return (
    <section id="work" className="px-4 py-24 sm:px-8 lg:px-12 lg:py-36">
      <div className="mx-auto max-w-[1760px]">
        <h2 className="mega text-m1 [text-wrap:balance]">
          <RevealText path="work.heading" className="block" />
        </h2>
        <Reveal>
          <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-muted">
            <EditableText path="work.subheading" />
          </p>
        </Reveal>

        <ul
          className="mt-14 lg:mt-20"
          onPointerMove={(e) => {
            // beside the pointer, but never off the right edge
            x.set(Math.min(e.clientX + 28, window.innerWidth - 368));
            y.set(e.clientY - 120);
          }}
          onPointerLeave={() => setHover(null)}
        >
          {shots.map((shot, i) => {
            const isOpen = isEditing || open === i;
            const title = (
              <>
                <span className="mega min-w-0 flex-1 text-m2 transition-[font-stretch,color] duration-500 ease-expo group-hover:text-accentInk group-hover:[font-stretch:74%] motion-reduce:transition-none">
                  <EditableText path={`work.shots.${i}.name`} />
                </span>
                <span className="hidden w-52 shrink-0 text-sm text-muted md:block">
                  <EditableText path={`work.shots.${i}.type`} />
                </span>
              </>
            );

            return (
              <li key={shot.number} className="border-t border-line2 last:border-b">
                <h3>
                  {isEditing ? (
                    <div className="flex items-center gap-6 py-6 lg:py-8">{title}</div>
                  ) : (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`work-panel-${i}`}
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      onPointerEnter={() => setHover(i)}
                      className="group flex w-full items-center gap-4 py-6 text-left sm:gap-6 lg:py-8"
                    >
                      {title}
                      <span
                        aria-hidden
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-[transform,background-color,color,border-color] duration-500 ease-expo ${
                          isOpen ? "rotate-45 border-accent bg-accent text-onAccent" : "border-line2 text-content"
                        }`}
                      >
                        <Plus size={18} weight="bold" />
                      </span>
                    </button>
                  )}
                </h3>

                <div
                  id={`work-panel-${i}`}
                  inert={!isOpen}
                  className={`grid transition-[grid-template-rows] duration-700 ease-expo motion-reduce:transition-none ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="grid gap-8 pb-10 lg:grid-cols-12 lg:gap-8 lg:pb-14">
                      <div className="relative aspect-[16/10] overflow-hidden bg-surface lg:col-span-6">
                        <EditableImage
                          path={`work.shots.${i}.image`}
                          alt={`${shot.name}, representative screen`}
                          fill
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          className="object-cover"
                        />
                      </div>

                      <div className="lg:col-span-5 lg:col-start-8">
                        <p className="text-sm text-muted md:hidden">
                          <EditableText path={`work.shots.${i}.type`} />
                        </p>
                        <p className="mt-3 text-lg leading-relaxed md:mt-0">
                          <EditableText path={`work.shots.${i}.description`} />
                        </p>

                        <p className="mt-7 font-display text-lg font-semibold">
                          {t("What it taught me", "What it taught him")}
                        </p>
                        <p className="mt-2 leading-relaxed text-muted">
                          <EditableText path={`work.shots.${i}.adjustment`} />
                        </p>

                        <ul className="mt-6 flex flex-wrap gap-2">
                          {shot.tags.map((tag) => (
                            <li key={tag} className="rounded-full border border-line2 px-3 py-1 text-sm text-muted">
                              {tag}
                            </li>
                          ))}
                        </ul>

                        {/* Flocon's review: no box, no border, just her and the line */}
                        <div className="mt-8 flex items-start gap-3">
                          <Face face="neutral" className="h-11 w-11" sizes="44px" />
                          <p className="text-[0.95rem] leading-snug">
                            <span className="mb-0.5 block font-mono text-[0.7rem] text-eye">
                              {t("Flocon's review", "My review")}
                            </span>
                            <EditableText path={`work.shots.${i}.review`} />
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <MarginNote section="work" face="grumpy" className="mt-12" />
      </div>

      {/* the preview that follows the pointer (mouse only) */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-30 hidden w-[22rem] lg:block"
        style={{ x: sx, y: sy }}
      >
        <AnimatePresence>
          {previewing && hover !== null && (
            <motion.div
              key="preview"
              className="relative aspect-[16/10] overflow-hidden bg-surface shadow-2xl"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.86, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <AnimatePresence initial={false}>
                <motion.div
                  key={hover}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <Image src={shots[hover].image} alt="" fill sizes="352px" className="object-cover" />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
