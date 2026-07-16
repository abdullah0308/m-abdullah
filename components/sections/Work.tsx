"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionWrapper from "@/components/ui/SectionWrapper";
import RevealText from "@/components/ui/RevealText";
import RevealButton from "@/components/ui/RevealButton";
import EditableText from "@/components/ui/EditableText";
import { useSiteContent } from "@/context/SiteContext";

gsap.registerPlugin(ScrollTrigger);

function ShotCard({ shotIndex }: { shotIndex: number }) {
  const { content } = useSiteContent();
  const shot    = content.work.shots[shotIndex];
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    gsap.from(card, {
      scrollTrigger: { trigger: card, start: "top 88%", toggleActions: "play none none none" },
      clipPath: "inset(100% 0% 0% 0%)",
      opacity: 0,
      duration: 0.8,
      ease: "power3.out",
      delay: (shotIndex % 2) * 0.1,
    });
  }, [shotIndex]);

  return (
    <div ref={cardRef} style={{ clipPath: "inset(0% 0% 0% 0%)" }}>
      <motion.div
        whileHover={{ y: -4 }}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="group relative flex flex-col gap-6 min-h-[300px] overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(0,21,25,0.95) 0%, rgba(0,15,18,1) 100%)",
          borderTop: "1px solid rgba(80,232,244,0.08)",
        }}
      >
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={hovered
            ? { background: "radial-gradient(circle at 50% 50%, rgba(80,232,244,0.06) 0%, transparent 70%)" }
            : { background: "transparent" }
          }
          transition={{ duration: 0.4 }}
        />

        <div className="relative z-10 flex flex-col gap-5 h-full p-8 md:p-10">
          <div className="flex items-start justify-between">
            <span className="text-white/15 text-xs tracking-widest font-mono">{shot.number}</span>
            <EditableText path={`work.shots.${shotIndex}.type`} className="text-xs text-white/35 tracking-wider border border-white/8 px-2 py-1 font-mono" />
          </div>

          <div className="flex-1">
            <EditableText path={`work.shots.${shotIndex}.name`} tag="h3" className="font-title text-2xl md:text-3xl text-white mb-3 group-hover:text-gold transition-colors duration-300" />
            <EditableText path={`work.shots.${shotIndex}.description`} tag="p" className="text-white/45 text-sm leading-relaxed mb-4" />

            <motion.div
              className="overflow-hidden"
              animate={hovered ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="flex items-start gap-2 pt-1">
                <span className="text-gold/50 text-xs font-mono mt-0.5 shrink-0">→</span>
                <EditableText path={`work.shots.${shotIndex}.adjustment`} tag="p" className="text-gold/65 text-xs leading-relaxed italic" />
              </div>
            </motion.div>
          </div>

          <div className="flex flex-wrap gap-2">
            {shot.tags.map((_, ti) => (
              <EditableText key={ti} path={`work.shots.${shotIndex}.tags.${ti}`} className="text-xs text-white/25 tracking-wide font-mono" />
            ))}
          </div>
        </div>

        <motion.div
          className="absolute bottom-0 left-0 h-px origin-left"
          style={{ background: "linear-gradient(to right, #50E8F4, #C7F8FE)", width: "100%" }}
          initial={{ scaleX: 0 }}
          animate={hovered ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </motion.div>
    </div>
  );
}

export default function Work() {
  const { content } = useSiteContent();

  return (
    <SectionWrapper id="work" className="bg-charcoal-deep/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <RevealText variant="label" delay={0}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-gold" />
              <EditableText path="work.label" className="text-gold text-xs tracking-[0.3em] uppercase font-mono" />
            </div>
          </RevealText>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <RevealText variant="heading">
              <h2 className="font-title text-3xl md:text-4xl lg:text-5xl text-white">
                <EditableText path="work.heading" />
              </h2>
            </RevealText>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: "rgba(80,232,244,0.04)" }}>
          {content.work.shots.map((_, i) => (
            <ShotCard key={i} shotIndex={i} />
          ))}
        </div>

        {/* CTA under work */}
        <div className="mt-12 flex justify-center">
          <RevealButton delay={0.1}>
            <a
              href="https://www.linkedin.com/in/abdullah-mohamed-05426931a/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-7 py-3.5 border border-gold/30 text-white/80 font-display text-sm tracking-wide hover:bg-gold hover:text-charcoal-deep hover:border-gold transition-all duration-200"
            >
              See More on LinkedIn
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </RevealButton>
        </div>
      </div>
    </SectionWrapper>
  );
}
