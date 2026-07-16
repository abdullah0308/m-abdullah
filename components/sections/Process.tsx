"use client";

import { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SectionWrapper from "@/components/ui/SectionWrapper";
import RevealText from "@/components/ui/RevealText";
import EditableText from "@/components/ui/EditableText";
import { useSiteContent } from "@/context/SiteContext";

gsap.registerPlugin(ScrollTrigger);

export default function Process() {
  const { content }  = useSiteContent();
  const sectionRef   = useRef<HTMLDivElement>(null);
  const lineRef      = useRef<HTMLDivElement>(null);
  const isInView     = useInView(sectionRef, { once: true, margin: "-100px" });
  const steps = content.process.steps;

  // Draw the line on scroll
  useEffect(() => {
    const line = lineRef.current;
    if (!line) return;
    const ctx = gsap.context(() => {
      gsap.from(line, {
        scrollTrigger: { trigger: line, start: "top 80%", toggleActions: "play none none none" },
        scaleX: 0,
        duration: 1.4,
        ease: "power2.inOut",
        transformOrigin: "left",
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <SectionWrapper id="process" className="bg-charcoal-mid/50 backdrop-blur-md overflow-hidden">
      <div className="max-w-7xl mx-auto" ref={sectionRef}>

        {/* Header */}
        <div className="mb-20">
          <RevealText variant="label" delay={0}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-gold" />
              <EditableText path="process.label" className="text-gold text-xs tracking-[0.3em] uppercase font-mono" />
            </div>
          </RevealText>
          <RevealText variant="heading">
            <h2 className="font-title text-3xl md:text-4xl lg:text-5xl text-white max-w-xl">
              <EditableText path="process.heading" />
            </h2>
          </RevealText>
          <RevealText variant="body" delay={0.1}>
            <p className="text-white/65 text-base mt-4 max-w-lg">
              <EditableText path="process.subheading" />
            </p>
          </RevealText>
        </div>

        {/* Desktop timeline */}
        <div className="hidden lg:block">
          {/* Line + Dots container — dots sit directly ON the line */}
          <div className="relative w-full" style={{ height: 32, marginBottom: 32 }}>
            {/* The animated arrow line */}
            <div
              ref={lineRef}
              className="absolute top-1/2 -translate-y-1/2 left-0 right-6 h-px"
              style={{ background: "linear-gradient(to right, rgba(80,232,244,0.7), #50E8F4, rgba(80,232,244,0.4))" }}
            />
            {/* Arrow head */}
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 1.6, duration: 0.3 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M0 6h10M6 1l5 5-5 5" stroke="#50E8F4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>

            {/* Dots ON the line — evenly spaced */}
            {steps.map((step, index) => (
              <motion.div
                key={step.phase}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${(index / (steps.length - 1)) * 94}%` }}
                initial={{ scale: 0, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{ delay: 0.4 + index * 0.22, duration: 0.35, type: "spring", stiffness: 400 }}
              >
                <div
                  className="w-3 h-3 rounded-full border-2 border-gold bg-charcoal-deep"
                  style={{ boxShadow: "0 0 10px rgba(80,232,244,0.5), 0 0 4px rgba(80,232,244,0.3)" }}
                />
              </motion.div>
            ))}
          </div>

          {/* Step labels below */}
          <div className="grid grid-cols-5 gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.phase}
                className="flex flex-col items-center text-center gap-3 px-1"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.55 + index * 0.13 }}
              >
                <span className="text-white/25 text-xs tracking-widest font-mono">{step.step}</span>
                <EditableText path={`process.steps.${index}.phase`} tag="h3" className="font-title text-white text-sm md:text-base" />
                <EditableText path={`process.steps.${index}.description`} tag="p" className="text-white/65 text-xs leading-relaxed" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile timeline */}
        <div className="lg:hidden relative pl-8">
          <div className="absolute left-3 top-0 bottom-0 w-px bg-white/5">
            <motion.div
              className="absolute top-0 left-0 w-full"
              style={{ background: "linear-gradient(to bottom, #50E8F4cc, #50E8F444)", height: "100%" }}
              initial={{ scaleY: 0 }}
              animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{ duration: 1.4, ease: "easeInOut", delay: 0.3 }}
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
                <div
                  className="absolute -left-8 top-1 w-3 h-3 rounded-full border-2 border-gold bg-charcoal-deep flex-shrink-0"
                  style={{ boxShadow: "0 0 8px rgba(80,232,244,0.4)" }}
                />
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-gold/50 text-xs tracking-widest font-mono">{step.step}</span>
                    <EditableText path={`process.steps.${index}.phase`} tag="h3" className="font-title text-white text-lg" />
                  </div>
                  <EditableText path={`process.steps.${index}.description`} tag="p" className="text-white/68 text-sm leading-relaxed" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
