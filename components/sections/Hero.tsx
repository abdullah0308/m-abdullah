"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import EditableText from "@/components/ui/EditableText";
import EditableImage from "@/components/ui/EditableImage";
import { useSiteContent } from "@/context/SiteContext";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.18, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
};

const taglineContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.9 } },
};
const wordVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
};

export default function Hero() {
  const { content, isEditing } = useSiteContent();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);

  const handleScroll = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const taglineLines = content.hero.tagline;

  return (
    <section
      ref={containerRef}
      className="relative h-screen w-full overflow-hidden flex items-center"
    >
      {/* Background layout */}
      <div className="absolute inset-0 z-0 flex">
        <div className="w-full md:w-1/2 h-full bg-charcoal-deep flex-shrink-0" />
        <div className="hidden md:block relative flex-1 h-full overflow-hidden">
          <motion.div className="absolute inset-0" style={{ y: bgY }}>
            <EditableImage
              path="hero.bgImage"
              alt="Abdullah Mohamed — Archer"
              fill
              priority
              quality={90}
              className="object-cover"
              style={{ objectPosition: "30% center" }}
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-deep via-charcoal-deep/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-deep via-transparent to-transparent" />
        </div>
      </div>

      {/* Mobile image */}
      <div className="md:hidden absolute inset-0 z-0">
        <EditableImage
          path="hero.bgImage"
          alt="Abdullah Mohamed — Archer"
          fill
          priority
          quality={90}
          className="object-cover"
          style={{ objectPosition: "30% center" }}
        />
        <div className="absolute inset-0 bg-charcoal-deep/80" />
      </div>

      {/* Content */}
      <motion.div
        className="relative z-20 max-w-7xl mx-auto px-6 md:px-12 w-full"
        style={{ y: contentY }}
      >
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-xl"
        >
          {/* Pre-label */}
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-8">
            <div className="w-8 h-px bg-gold" />
            <EditableText
              path="hero.label"
              className="text-gold text-xs tracking-[0.3em] uppercase font-mono"
            />
          </motion.div>

          {/* Name */}
          <motion.h1
            variants={itemVariants}
            className="font-display font-bold leading-none mb-8"
          >
            <EditableText
              path="hero.firstName"
              tag="span"
              className="block text-5xl md:text-7xl lg:text-8xl text-white"
            />
            <EditableText
              path="hero.lastName"
              tag="span"
              className="block text-5xl md:text-7xl lg:text-8xl text-gold-gradient gold-glow-text"
            />
          </motion.h1>

          {/* Tagline */}
          {isEditing ? (
            <div className="mb-4 space-y-1">
              <EditableText
                path="hero.tagline.0"
                tag="div"
                className="text-xl md:text-2xl text-white/80 font-light tracking-wide"
              />
              <EditableText
                path="hero.tagline.1"
                tag="div"
                className="text-xl md:text-2xl text-white/80 font-light tracking-wide"
              />
            </div>
          ) : (
            <motion.div
              variants={taglineContainer}
              initial="hidden"
              animate="visible"
              className="mb-4"
            >
              {taglineLines.map((line, li) => (
                <div key={li} className="flex flex-wrap gap-x-2 overflow-hidden mb-1">
                  {line.split(" ").map((word, wi) => (
                    <motion.span
                      key={wi}
                      variants={wordVariant}
                      className="text-xl md:text-2xl text-white/80 font-light tracking-wide"
                    >
                      {word}
                    </motion.span>
                  ))}
                </div>
              ))}
            </motion.div>
          )}

          {/* Subtext */}
          <motion.p
            variants={itemVariants}
            className="text-sm md:text-base text-white/40 max-w-md mb-10 leading-relaxed"
          >
            <EditableText path="hero.subtext" />{" "}
            <EditableText path="hero.subtextHighlight" className="text-white/60" />
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
            <button
              onClick={() => handleScroll("work")}
              className="group flex items-center gap-3 px-7 py-3.5 bg-gold text-charcoal-deep font-display font-semibold text-sm tracking-wide hover:bg-gold-light transition-all duration-200"
            >
              <EditableText path="hero.cta1" />
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => handleScroll("contact")}
              className="px-7 py-3.5 bg-white/10 border border-white/60 text-white font-display font-medium text-sm tracking-wide hover:bg-gold-light hover:border-gold-light hover:text-charcoal-deep transition-all duration-200"
            >
              <EditableText path="hero.cta2" />
            </button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <span className="text-white/30 text-xs tracking-widest uppercase font-mono">Scroll</span>
        <motion.div
          className="w-px h-10 bg-gradient-to-b from-gold/60 to-transparent"
          animate={{ scaleY: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "top" }}
        />
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-charcoal-deep to-transparent z-20 pointer-events-none" />
    </section>
  );
}
