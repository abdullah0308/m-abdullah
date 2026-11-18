"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useScroll, useTransform } from "framer-motion";
import { useSiteContent } from "@/context/SiteContext";
import { useCopy } from "@/lib/useCopy";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { ramp } from "@/lib/ramp";
import EditableImage from "@/components/ui/EditableImage";
import EditableText from "@/components/ui/EditableText";
import MarginNote from "@/components/ui/MarginNote";
import Reveal from "@/components/ui/Reveal";
import RevealText from "@/components/ui/RevealText";
import { FLOCON_POSES } from "@/components/flocon/assets";

// The backdrop photograph: its shape, and where the archer's face is in it.
const PHOTO_ASPECT = 1732 / 2310;
const FACE = { x: 0.31, y: 0.56 };
const START_SCALE = 1.35;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (p: number) => p * p * (3 - 2 * p);

/**
 * Beyond the screen. The section opens on one giant word with a round
 * window in place of its letter O, and the archer's face in the window. As
 * you scroll the window opens until the photograph fills the screen, and the
 * words about the sport arrive on top of it: the sight picture widening
 * into the shot.
 *
 * The frame is pinned for that stretch (the section is taller than the
 * screen). The window is a clip-path circle whose centre and starting radius
 * are measured from the letter's placeholder; the photograph is cropped so
 * the face has a sensible place in the final frame, then nudged so it starts
 * out centred in the window. Without motion, or in the editor, the
 * photograph is simply shown full-bleed with the copy over it.
 */
export default function Archery() {
  const { content, isEditing } = useSiteContent();
  const { archery } = content;
  const reduce = useReduceMotion();
  const word = useCopy("archery.word");
  const flat = reduce || isEditing;

  const track = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const hole = useRef<HTMLSpanElement>(null);
  // Window start (cx, cy, r0), full radius, and the photo's starting nudge.
  const geo = useRef({ cx: 0, cy: 0, r0: 0, max: 2000, dx: 0, dy: 0 });
  // Bumped after each measurement so the values recompute without a scroll.
  const measured = useMotionValue(0);
  const [crop, setCrop] = useState("28% 60%");

  const measure = useCallback(() => {
    const f = frame.current?.getBoundingClientRect();
    if (!f) return;
    const W = f.width;
    const H = f.height;

    // Crop: a wide frame slides the photo vertically so the face sits at 40%
    // of the height; a tall one slides it sideways so the face sits at 45%.
    let fx: number;
    let fy: number;
    let ox = 0.5;
    let oy = 0.5;
    if (W / H > PHOTO_ASPECT) {
      const dh = W / PHOTO_ASPECT;
      const over = dh - H;
      oy = clamp01((FACE.y * dh - 0.4 * H) / over);
      fx = FACE.x * W;
      fy = FACE.y * dh - over * oy;
    } else {
      const dw = H * PHOTO_ASPECT;
      const over = dw - W;
      ox = over > 0 ? clamp01((FACE.x * dw - 0.45 * W) / over) : 0.5;
      fx = FACE.x * dw - over * ox;
      fy = FACE.y * H;
    }
    setCrop(`${(ox * 100).toFixed(1)}% ${(oy * 100).toFixed(1)}%`);

    const h = hole.current?.getBoundingClientRect();
    const cx = h ? h.left - f.left + h.width / 2 : W / 2;
    const cy = h ? h.top - f.top + h.height / 2 : H * 0.42;
    const r0 = h ? h.width / 2 : Math.min(W, H) * 0.12;
    // far enough to reach the furthest corner from the centre
    const max = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 2;
    // the photo scales about the frame centre; this puts the face in the window
    const dx = cx - W / 2 - (fx - W / 2) * START_SCALE;
    const dy = cy - H / 2 - (fy - H / 2) * START_SCALE;
    geo.current = { cx, cy, r0, max, dx, dy };
    measured.set(measured.get() + 1);
  }, [measured]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (frame.current) ro.observe(frame.current);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [measure, word, flat]);

  const { scrollYProgress } = useScroll({ target: track, offset: ["start start", "end end"] });
  // 0 while the window is the letter, 1 once it has opened completely.
  const open = useTransform([scrollYProgress, measured], ([v]: number[]) => smooth(clamp01((v - 0.04) / 0.62)));
  const clip = useTransform(open, (e) => {
    const { cx, cy, r0, max } = geo.current;
    return `circle(${r0 + (max - r0) * e}px at ${cx}px ${cy}px)`;
  });
  const photoScale = useTransform(open, (e) => 1 + (START_SCALE - 1) * (1 - e));
  const photoX = useTransform(open, (e) => geo.current.dx * (1 - e));
  const photoY = useTransform(open, (e) => geo.current.dy * (1 - e));
  const copyOpacity = useTransform(scrollYProgress, ramp(0.6, 0.78, 0, 1));
  const copyY = useTransform(scrollYProgress, ramp(0.6, 0.78, 40, 0));

  // The word, with the first O swapped for the window's placeholder.
  const at = word.search(/o/i);

  return (
    <section id="archery" className="stage relative">
      <div ref={track} className={flat ? "relative" : "relative h-[250vh]"}>
        <div
          ref={frame}
          className={`${flat ? "relative min-h-[42rem]" : "sticky top-0 h-[100dvh]"} flex flex-col overflow-hidden`}
        >
          {/* the word, on the dark, behind the window */}
          {!flat && (
            <div aria-hidden className="absolute inset-0 grid place-items-center px-4">
              <span className="mega whitespace-nowrap text-[clamp(5.5rem,31vw,34rem)]">
                {at < 0 ? (
                  word
                ) : (
                  <>
                    {word.slice(0, at)}
                    <span
                      ref={hole}
                      className="face-o !bg-transparent shadow-[0_0_0_0.028em_rgb(var(--accent-rgb))]"
                    />
                    {word.slice(at + 1)}
                  </>
                )}
              </span>
            </div>
          )}

          {/* the range, seen through the window */}
          {/* keyed on flat: a remount, so no scroll-driven inline style is left behind */}
          <motion.div key={flat ? "flat" : "live"} className="absolute inset-0" style={flat ? undefined : { clipPath: clip }}>
            <motion.div
              className="absolute inset-0"
              style={flat ? undefined : { scale: photoScale, x: photoX, y: photoY }}
            >
              <EditableImage
                path="archery.backdrop"
                alt="Abdullah at full draw with a recurve bow, at night"
                fill
                sizes="100vw"
                className="object-cover"
                style={{ objectPosition: crop }}
              />
            </motion.div>
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgb(10 11 13 / 0.94) 0%, rgb(10 11 13 / 0.62) 30%, transparent 58%)",
              }}
            />
          </motion.div>

          {/* the words that arrive once the window is open */}
          <motion.div
            key={flat ? "flat-copy" : "live-copy"}
            className="relative mt-auto px-4 pb-10 pt-40 sm:px-8 lg:px-12 lg:pb-14"
            style={flat ? undefined : { opacity: copyOpacity, y: copyY }}
          >
            <div className="mx-auto grid max-w-[1760px] gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                <h2 className="mega text-m3">
                  {flat ? <EditableText path="archery.heading" /> : <RevealText path="archery.heading" />}
                </h2>
                <p className="mt-4 max-w-[36ch] font-display text-xl font-semibold leading-snug sm:text-2xl">
                  &ldquo;
                  <EditableText path="archery.quote" />
                  &rdquo;
                </p>
              </div>

              <dl className="grid grid-cols-3 gap-6 pr-16 sm:pr-24 lg:col-span-5">
                {archery.stats.map((s, i) => (
                  <div key={s.label}>
                    <dt className="sr-only">{s.label}</dt>
                    <dd className="mega text-[clamp(1.9rem,3.3vw,3.1rem)]">
                      <EditableText path={`archery.stats.${i}.value`} />
                    </dd>
                    <dd className="mt-2 text-sm text-white/75">
                      <EditableText path={`archery.stats.${i}.label`} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </motion.div>
        </div>
      </div>

      {/* two more frames from the range, the long version, and the margin */}
      <div className="px-4 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="mx-auto grid max-w-[1760px] gap-8 sm:grid-cols-12 sm:items-end">
          <Reveal className="relative aspect-[3/4] overflow-hidden bg-surface sm:col-span-4">
            <EditableImage
              path="archery.imageRight"
              alt="Looking down the arrow at the targets across the field"
              fill
              sizes="(max-width: 640px) 100vw, 32vw"
              className="object-cover"
            />
          </Reveal>
          <Reveal delay={0.1} className="relative aspect-[3/4] overflow-hidden bg-surface sm:col-span-3 sm:mb-20">
            <EditableImage
              path="archery.imageThird"
              alt="Abdullah standing on the shooting line at night, bow in hand"
              fill
              sizes="(max-width: 640px) 100vw, 25vw"
              className="object-cover"
            />
          </Reveal>
          <Reveal delay={0.15} className="sm:col-span-4 sm:col-start-9">
            <p className="max-w-[40ch] text-lg leading-relaxed text-white/80">
              <EditableText path="archery.quoteBody" />
            </p>
            <div className="mt-10 flex items-end gap-5">
              <Image
                src={FLOCON_POSES.back.src}
                alt=""
                width={FLOCON_POSES.back.w}
                height={FLOCON_POSES.back.h}
                className="h-28 w-auto shrink-0"
              />
              <MarginNote section="archery" face="profile" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
