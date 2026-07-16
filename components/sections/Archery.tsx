"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import SectionWrapper from "@/components/ui/SectionWrapper";
import RevealText from "@/components/ui/RevealText";
import Image from "next/image";
import EditableText from "@/components/ui/EditableText";
import EditableImage from "@/components/ui/EditableImage";

export default function Archery() {
  const imgLeftRef  = useRef<HTMLDivElement>(null);
  const imgRightRef = useRef<HTMLDivElement>(null);
  const leftInView  = useInView(imgLeftRef,  { once: true, amount: 0.3 });
  const rightInView = useInView(imgRightRef, { once: true, amount: 0.3 });

  return (
    <SectionWrapper id="archery" className="bg-charcoal-mid/50 backdrop-blur-md overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <RevealText variant="label" delay={0}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-gold" />
              <EditableText path="archery.label" className="text-gold text-xs tracking-[0.3em] uppercase font-mono" />
            </div>
          </RevealText>
          <RevealText variant="heading">
            <h2 className="font-title text-3xl md:text-4xl lg:text-5xl text-white max-w-2xl">
              <EditableText path="archery.heading" />
            </h2>
          </RevealText>
        </div>

        {/* Asymmetric image grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4 items-start">
          {/* Left image */}
          <div ref={imgLeftRef} className="lg:col-span-7">
            <motion.div
              className="relative aspect-[3/4] lg:aspect-auto lg:h-[600px] overflow-hidden group"
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={leftInView ? { clipPath: "inset(0 0% 0 0)" } : {}}
              transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Image
                src="/images/hero-bg.jpeg"
                alt="Abdullah Mohamed — Full draw at night"
                fill
                quality={85}
                className="object-cover object-center grayscale group-hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-deep/70 via-transparent to-transparent" />
              <div
                className="absolute left-0 top-0 bottom-0 w-px"
                style={{ background: "linear-gradient(to bottom, transparent, #50E8F4, transparent)" }}
              />
            </motion.div>
          </div>

          {/* Right column */}
          <div ref={imgRightRef} className="lg:col-span-5 flex flex-col gap-6 lg:pl-8">
            <motion.div
              className="relative aspect-square overflow-hidden group"
              initial={{ x: 40, opacity: 0 }}
              animate={rightInView ? { x: 0, opacity: 1 } : {}}
              transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
            >
              <EditableImage
                path="archery.imageRight"
                alt="Abdullah Mohamed — Aiming at targets"
                fill
                quality={85}
                className="object-cover object-center grayscale group-hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-charcoal-deep/15" />
            </motion.div>

            {/* Quote block */}
            <motion.div
              className="relative p-8"
              style={{ border: "1px solid rgba(80,232,244,0.08)", background: "rgba(0,22,25,0.6)" }}
              initial={{ opacity: 0, y: 24 }}
              animate={rightInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.45 }}
            >
              <span className="font-title text-6xl leading-none absolute -top-3 left-6" style={{ color: "rgba(80,232,244,0.15)" }}>
                &ldquo;
              </span>
              <RevealText variant="heading" delay={0.5}>
                <EditableText path="archery.quote" tag="p" className="font-title text-xl md:text-2xl text-white/85 leading-relaxed pt-4" />
              </RevealText>
              <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(80,232,244,0.07)" }}>
                <RevealText variant="body" delay={0.65}>
                  <EditableText path="archery.quoteBody" tag="p" className="text-white/68 text-sm leading-relaxed" />
                </RevealText>
              </div>
              <span className="font-title text-6xl leading-none absolute -bottom-6 right-6" style={{ color: "rgba(80,232,244,0.15)" }}>
                &rdquo;
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
