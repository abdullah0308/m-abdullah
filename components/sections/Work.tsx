"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import SectionWrapper from "@/components/ui/SectionWrapper";
import { fadeUp, cardReveal, staggerContainer } from "@/lib/animations";
import EditableText from "@/components/ui/EditableText";
import { useSiteContent } from "@/context/SiteContext";

function ShotCard({ shotIndex }: { shotIndex: number }) {
  const { content } = useSiteContent();
  const shot = content.work.shots[shotIndex];
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      variants={cardReveal}
      whileHover={{ y: -4 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`group relative bg-gradient-to-br ${shot.accent} flex flex-col gap-6 min-h-[300px] overflow-hidden`}
    >
      <div className="absolute inset-0 bg-charcoal-deep opacity-60" />

      <div className="relative z-10 flex flex-col gap-5 h-full p-8 md:p-10">
        <div className="flex items-start justify-between">
          <span className="text-white/20 text-xs tracking-widest font-mono">{shot.number}</span>
          <EditableText
            path={`work.shots.${shotIndex}.type`}
            className="text-xs text-white/40 tracking-wider border border-white/10 px-2 py-1 font-mono"
          />
        </div>

        <div className="flex-1">
          <EditableText
            path={`work.shots.${shotIndex}.name`}
            tag="h3"
            className="font-display font-bold text-2xl md:text-3xl text-white mb-3 group-hover:text-gold transition-colors duration-300"
          />
          <EditableText
            path={`work.shots.${shotIndex}.description`}
            tag="p"
            className="text-white/50 text-sm leading-relaxed mb-4"
          />

          {/* Adjustment — revealed on hover */}
          <motion.div
            className="overflow-hidden"
            animate={hovered ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-2 pt-1">
              <span className="text-gold/60 text-xs font-mono mt-0.5 shrink-0">→</span>
              <EditableText
                path={`work.shots.${shotIndex}.adjustment`}
                tag="p"
                className="text-gold/70 text-xs leading-relaxed italic"
              />
            </div>
          </motion.div>
        </div>

        <div className="flex flex-wrap gap-2">
          {shot.tags.map((tag, ti) => (
            <EditableText
              key={ti}
              path={`work.shots.${shotIndex}.tags.${ti}`}
              className="text-xs text-white/30 tracking-wide font-mono"
            />
          ))}
        </div>
      </div>

      <motion.div
        className="absolute bottom-0 left-0 h-px bg-gold origin-left"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ width: "100%" }}
      />
    </motion.div>
  );
}

export default function Work() {
  const { content } = useSiteContent();

  return (
    <SectionWrapper id="work" className="bg-charcoal-mid">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div variants={staggerContainer} className="mb-16">
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-gold" />
            <EditableText
              path="work.label"
              className="text-gold text-xs tracking-[0.3em] uppercase font-mono"
            />
          </motion.div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <motion.h2
              variants={fadeUp}
              className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-white"
            >
              <EditableText path="work.heading" />
            </motion.h2>
          </div>
        </motion.div>

        {/* Shots grid */}
        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5"
        >
          {content.work.shots.map((_, i) => (
            <ShotCard key={i} shotIndex={i} />
          ))}
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
