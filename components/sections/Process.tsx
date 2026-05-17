"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import SectionWrapper from "@/components/ui/SectionWrapper";
import { fadeUp, staggerContainer } from "@/lib/animations";
import EditableText from "@/components/ui/EditableText";
import { useSiteContent } from "@/context/SiteContext";

export default function Process() {
  const { content } = useSiteContent();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const steps = content.process.steps;

  return (
    <SectionWrapper id="process" className="bg-charcoal-deep overflow-hidden">
      <div className="max-w-7xl mx-auto" ref={ref}>
        {/* Header */}
        <motion.div variants={staggerContainer} className="mb-20">
          <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-gold" />
            <EditableText
              path="process.label"
              className="text-gold text-xs tracking-[0.3em] uppercase font-mono"
            />
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className="font-display font-bold text-3xl md:text-4xl lg:text-5xl text-white max-w-xl"
          >
            <EditableText path="process.heading" />
          </motion.h2>
          <motion.p variants={fadeUp} className="text-white/40 text-base mt-4 max-w-lg">
            <EditableText path="process.subheading" />
          </motion.p>
        </motion.div>

        {/* Desktop timeline */}
        <div className="hidden lg:block">
          <div className="relative h-px w-full bg-white/5 mb-10">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-gold/80 via-gold to-gold/40"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
              transition={{
                duration: 1.4,
                ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
                delay: 0.3,
              }}
              style={{ transformOrigin: "left", width: "100%" }}
            />
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 1.7, duration: 0.3 }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M0 5h8M5 1l4 4-4 4" stroke="#00A7E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          </div>

          <div className="grid grid-cols-5 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.phase}
                className="flex flex-col items-center text-center gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.5 + index * 0.15 }}
              >
                <motion.div
                  className="w-3 h-3 rounded-full border-2 border-gold bg-charcoal-deep flex-shrink-0 -mt-[22px] mb-2"
                  initial={{ scale: 0 }}
                  animate={isInView ? { scale: 1 } : { scale: 0 }}
                  transition={{ delay: 0.3 + index * 0.28, duration: 0.3, type: "spring", stiffness: 300 }}
                />
                <span className="text-white/30 text-xs tracking-widest font-mono">{step.step}</span>
                <EditableText
                  path={`process.steps.${index}.phase`}
                  tag="h3"
                  className="font-display font-bold text-white text-base"
                />
                <EditableText
                  path={`process.steps.${index}.description`}
                  tag="p"
                  className="text-white/40 text-xs leading-relaxed"
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile timeline */}
        <div className="lg:hidden relative pl-8">
          <div className="absolute left-3 top-0 bottom-0 w-px bg-white/5">
            <motion.div
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-gold/80 to-gold/20"
              initial={{ scaleY: 0 }}
              animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 1.4, ease: "easeInOut", delay: 0.3 }}
              style={{ transformOrigin: "top", height: "100%" }}
            />
          </div>

          <div className="flex flex-col gap-10">
            {steps.map((step, index) => (
              <motion.div
                key={step.phase}
                className="relative flex gap-6 items-start"
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.5 + index * 0.12 }}
              >
                <div className="absolute -left-8 top-1 w-3 h-3 rounded-full border-2 border-gold bg-charcoal-deep flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gold/60 text-xs tracking-widest font-mono">{step.step}</span>
                    <EditableText
                      path={`process.steps.${index}.phase`}
                      tag="h3"
                      className="font-display font-bold text-white text-lg"
                    />
                  </div>
                  <EditableText
                    path={`process.steps.${index}.description`}
                    tag="p"
                    className="text-white/50 text-sm leading-relaxed"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
