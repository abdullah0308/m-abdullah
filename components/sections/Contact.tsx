"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import EditableText from "@/components/ui/EditableText";
import EditableImage from "@/components/ui/EditableImage";

const LINKEDIN = "https://www.linkedin.com/in/abdullah-mohamed-05426931a/";

export default function Contact() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      ref={ref}
      id="contact"
      className="relative bg-black overflow-hidden"
      style={{ minHeight: "90vh", borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* RIGHT — full-height photo, desktop only */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1, delay: 0.2 }}
        className="absolute inset-y-0 right-0 w-full md:w-1/2 hidden md:block"
      >
        <EditableImage
          path="contact.photo"
          alt="Abdullah Mohamed — developer at MetaBox Technology"
          fill
          className="object-cover object-right"
          sizes="50vw"
          priority
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #000000 0%, rgba(0,0,0,0.4) 35%, transparent 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 40%)" }} />
        <div className="absolute bottom-16 left-8 border-l-2 border-gold pl-4 z-30">
          <EditableText path="contact.captionName" className="font-mono text-xs tracking-[0.25em] uppercase text-white/90 block" />
          <EditableText path="contact.captionRole" className="font-mono text-xs tracking-widest text-gold/80 mt-1 block" />
        </div>
      </motion.div>

      {/* LEFT — CTA copy */}
      <div className="relative z-10 flex flex-col justify-center min-h-[90vh] w-full md:w-1/2 px-8 md:px-16 lg:px-24 py-24 pb-28 md:pb-24">

        {/* Label */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-10"
        >
          <div className="w-8 h-px bg-gold" />
          <EditableText
            path="contact.label"
            className="font-mono text-xs tracking-[0.3em] uppercase text-gold"
          />
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display font-bold text-4xl md:text-5xl lg:text-6xl text-white leading-tight mb-6"
        >
          <EditableText path="contact.heading" />
          <br />
          <EditableText path="contact.headingHighlight" className="text-gold-gradient" />
        </motion.h2>

        {/* Body */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-white/50 text-lg leading-relaxed max-w-md mb-12"
        >
          <EditableText path="contact.body" />
        </motion.p>

        {/* LinkedIn CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <a
            href={LINKEDIN}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-4 px-7 py-4 border border-gold/40 hover:bg-gold hover:border-gold transition-all duration-300"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-gold group-hover:text-black transition-colors duration-300 shrink-0">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            <div>
              <p className="font-mono text-xs tracking-widest uppercase text-white/40 group-hover:text-black/60 transition-colors duration-300 mb-0.5">
                Connect on
              </p>
              <EditableText
                path="contact.ctaLabel"
                tag="p"
                className="font-display font-semibold text-sm text-white group-hover:text-black transition-colors duration-300"
              />
            </div>
            <svg className="w-4 h-4 text-gold group-hover:text-black group-hover:translate-x-1 transition-all duration-300 ml-2" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </motion.div>

        {/* Mobile-only photo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.4 }}
          className="md:hidden relative mt-12 -mx-8 h-72"
        >
          <EditableImage
            path="contact.photo"
            alt="Abdullah Mohamed — developer at MetaBox Technology"
            fill
            className="object-cover object-top"
            sizes="100vw"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)" }} />
          <div className="absolute bottom-4 left-6 border-l-2 border-gold pl-3">
            <EditableText path="contact.captionName" className="font-mono text-xs tracking-[0.25em] uppercase text-white block" />
            <EditableText path="contact.captionRole" className="font-mono text-xs tracking-widest text-gold mt-1 block" />
          </div>
        </motion.div>
      </div>

      {/* Footer bar */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 border-t px-8 md:px-16 py-5 flex items-center justify-center md:justify-between"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <p className="font-mono text-xs text-white/20 tracking-wide text-center md:text-left">
          © 2026 Abdullah Mohamed.{" "}
          <span className="block sm:inline">All Rights Reserved</span>
        </p>
      </div>
    </section>
  );
}
