"use client";

import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import gsap from "gsap";
import Image from "next/image";
import EditableText from "@/components/ui/EditableText";
import { useSiteContent } from "@/context/SiteContext";

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]; // expo-like

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.2 } },
};
const itemUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};
const taglineContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 1.0 } },
};
const wordVariant = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

export default function Hero() {
  const { content, isEditing } = useSiteContent();
  const containerRef = useRef<HTMLDivElement>(null);
  const firstNameRef = useRef<HTMLSpanElement>(null);
  const lastNameRef  = useRef<HTMLSpanElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const bgY      = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);
  const opacity  = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  const handleScroll = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  // GSAP: "Abdullah" char-by-char + "Mohamed" whole-line clip reveal
  useEffect(() => {
    const first = firstNameRef.current;
    const last  = lastNameRef.current;
    if (!first || !last) return;

    // Split "Abdullah" into individual characters
    const rawText = first.textContent ?? "";
    first.innerHTML = rawText
      .split("")
      .map(
        (ch) =>
          `<span style="display:inline-block;overflow:hidden;vertical-align:bottom;"><span class="c" style="display:inline-block;">${ch === " " ? "&nbsp;" : ch}</span></span>`
      )
      .join("");

    const chars = first.querySelectorAll<HTMLElement>(".c");

    const tl = gsap.timeline({ delay: 0.3 });

    tl.from(chars, { y: "105%", duration: 0.7, stagger: 0.032, ease: "power4.out" });
    tl.fromTo(
      last,
      { clipPath: "inset(0 0 100% 0)", y: 10 },
      { clipPath: "inset(0 0 0% 0)", y: 0, duration: 0.75, ease: "power4.out" },
      "-=0.4"
    );

    return () => { tl.kill(); };
  }, [content.hero.firstName, content.hero.lastName]);

  const taglineLines = content.hero.tagline;

  return (
    <section
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden flex items-start md:items-center"
    >
      {/* ── No global overlay — VANTA clouds show through everywhere ── */}
      <div className="absolute inset-0 z-0">

        {/* Text readability: very gradual fade, no visible edge */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to right, rgba(3,13,24,0.94) 0%, rgba(3,13,24,0.85) 28%, rgba(3,13,24,0.4) 52%, rgba(3,13,24,0.1) 72%, transparent 90%)",
          }}
        />

        {/* Desktop: figure floats on the VANTA clouds */}
        <motion.div
          className="hidden md:flex absolute right-0 top-0 w-[62%] h-full items-end justify-center pointer-events-none"
          style={{ y: bgY }}
        >
          {/* Teal glow beneath feet — grounds the figure */}
          <div
            className="absolute bottom-0 left-0 right-0 h-72"
            style={{ background: "radial-gradient(ellipse at 55% 100%, rgba(80,232,244,0.18) 0%, transparent 65%)" }}
          />
          {/* Bottom fade into next section */}
          <div
            className="absolute bottom-0 left-0 right-0 h-32"
            style={{ background: "linear-gradient(to top, rgba(3,13,24,0.9) 0%, transparent 100%)" }}
          />
          <Image
            src="/images/AM.png"
            alt="Abdullah Mohamed"
            fill
            priority
            quality={95}
            className="object-contain object-bottom"
            sizes="62vw"
          />
        </motion.div>

        {/* Mobile: figure at bottom, gradient keeps text readable */}
        <div className="md:hidden absolute inset-0 pointer-events-none">
          {/* AM.png — large, bottom-anchored */}
          <div className="absolute bottom-0 left-0 right-0 h-[100vh]">
            <Image
              src="/images/AM.png"
              alt="Abdullah Mohamed"
              fill
              priority
              quality={95}
              className="object-contain object-bottom scale-[1.22] origin-bottom"
              sizes="100vw"
            />
            {/* Soft top fade — blends head into text area */}
            <div
              className="absolute top-0 left-0 right-0 h-28"
              style={{ background: "linear-gradient(to bottom, rgba(3,13,24,1) 0%, transparent 100%)" }}
            />
          </div>
          {/* Top overlay — keeps text area dark */}
          <div
            className="absolute inset-x-0 top-0 h-[50vh]"
            style={{ background: "linear-gradient(to bottom, rgba(3,13,24,0.96) 0%, rgba(3,13,24,0.85) 60%, transparent 100%)" }}
          />
        </div>
      </div>

      {/* ── Content ── */}
      <motion.div
        className="relative z-20 max-w-7xl mx-auto px-6 md:px-12 w-full pt-24 md:pt-0"
        style={{ y: contentY, opacity }}
      >
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-xl">

          {/* Label */}
          <motion.div variants={itemUp} className="flex items-center gap-3 mb-8">
            <div className="w-8 h-px bg-gold" />
            <EditableText path="hero.label" className="text-gold text-xs tracking-[0.3em] uppercase font-mono" />
          </motion.div>

          {/* Name — GSAP controlled, wrapped in motion.div for initial opacity */}
          <motion.h1
            className="font-title leading-[0.92] mb-8"
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }}
          >
            {isEditing ? (
              <>
                <EditableText path="hero.firstName" tag="span" className="block text-5xl md:text-7xl lg:text-[5.5rem] text-white tracking-tight" />
                <EditableText path="hero.lastName"  tag="span" className="block text-5xl md:text-7xl lg:text-[5.5rem] text-gold-gradient gold-glow-text tracking-tight" />
              </>
            ) : (
              <>
                <span ref={firstNameRef} className="block text-5xl md:text-7xl lg:text-[5.5rem] text-white tracking-tight">
                  {content.hero.firstName}
                </span>
                <span ref={lastNameRef} className="block text-5xl md:text-7xl lg:text-[5.5rem] tracking-tight text-gold-gradient gold-glow-text">
                  {content.hero.lastName}
                </span>
              </>
            )}
          </motion.h1>

          {/* Tagline */}
          {isEditing ? (
            <div className="mb-4 space-y-1">
              <EditableText path="hero.tagline.0" tag="div" className="text-xl md:text-2xl text-white/80 font-light" />
              <EditableText path="hero.tagline.1" tag="div" className="text-xl md:text-2xl text-white/80 font-light" />
            </div>
          ) : (
            <motion.div variants={taglineContainer} initial="hidden" animate="visible" className="mb-4">
              {taglineLines.map((line, li) => (
                <div key={li} className="flex flex-wrap gap-x-2 overflow-hidden mb-1">
                  {line.split(" ").map((word, wi) => (
                    <motion.span key={wi} variants={wordVariant} className="text-xl md:text-2xl text-white/72 font-light tracking-wide">
                      {word}
                    </motion.span>
                  ))}
                </div>
              ))}
            </motion.div>
          )}

          {/* Subtext */}
          <motion.p variants={itemUp} className="text-sm md:text-base text-white/65 max-w-md mb-10 leading-relaxed">
            <EditableText path="hero.subtext" />{" "}
            <EditableText path="hero.subtextHighlight" className="text-white/60" />
          </motion.p>

        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4, duration: 0.6 }}
      >
        <span className="text-white/25 text-xs tracking-widest uppercase font-mono">Scroll</span>
        <motion.div
          className="w-px h-10 bg-gradient-to-b from-gold/60 to-transparent"
          animate={{ scaleY: [0.3, 1, 0.3], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "top" }}
        />
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 z-10 pointer-events-none" style={{ background: "linear-gradient(to top, #001619 0%, transparent 100%)" }} />
    </section>
  );
}
