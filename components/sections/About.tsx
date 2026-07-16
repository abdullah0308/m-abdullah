"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import SectionWrapper from "@/components/ui/SectionWrapper";
import RevealText from "@/components/ui/RevealText";
import EditableText from "@/components/ui/EditableText";
import { useSiteContent } from "@/context/SiteContext";

export default function About() {
  const { content } = useSiteContent();
  const numRef    = useRef<HTMLSpanElement>(null);
  const numInView = useInView(numRef, { once: true, margin: "-80px" });

  return (
    <SectionWrapper id="about" className="bg-charcoal-deep/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

          {/* Left — large decorative number */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <motion.span
              ref={numRef}
              className="font-title text-[8rem] md:text-[10rem] leading-none font-bold text-gold/8 select-none"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={numInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              01
            </motion.span>
            <RevealText variant="label" delay={0.1}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-px bg-gold" />
                <EditableText path="about.label" className="text-gold text-xs tracking-[0.3em] uppercase font-mono" />
              </div>
            </RevealText>
          </div>

          {/* Right — text */}
          <div className="lg:col-span-9 space-y-6">
            {/* Heading — clip reveal */}
            <RevealText variant="heading">
              <h2 className="font-title text-3xl md:text-4xl lg:text-5xl text-white leading-tight">
                <EditableText path="about.heading" />{" "}
                <span className="text-gold-gradient">
                  <EditableText path="about.headingHighlight" />
                </span>
              </h2>
            </RevealText>

            {/* Body paragraphs — fade reveal */}
            <RevealText variant="body" delay={0.1}>
              <p className="text-white/75 text-lg md:text-xl leading-relaxed max-w-2xl">
                <EditableText path="about.body1" />
              </p>
            </RevealText>

            <RevealText variant="body" delay={0.2}>
              <p className="text-white/68 text-base md:text-lg leading-relaxed max-w-2xl">
                <EditableText path="about.body2" />
              </p>
            </RevealText>

            {/* Values */}
            <RevealText variant="body" delay={0.3}>
              <div className="pt-4 flex flex-wrap gap-6">
                {content.about.values.map((value, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold" />
                    <EditableText
                      path={`about.values.${i}`}
                      className="text-white/65 text-sm tracking-wide font-mono"
                    />
                  </div>
                ))}
              </div>
            </RevealText>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
