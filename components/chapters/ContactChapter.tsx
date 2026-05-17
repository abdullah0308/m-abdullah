"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

function ContactLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      target={href.startsWith("mailto") ? undefined : "_blank"}
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-2 font-mono text-sm transition-colors duration-200"
      style={{ color: hovered ? "var(--color-accent)" : "var(--color-muted)" }}
    >
      <span style={{ color: "var(--color-accent)" }}>→</span>
      <span>{label}</span>
    </a>
  );
}

export default function ContactChapter() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const prefersReduced = useReducedMotion();
  const eventFired = useRef(false);

  // Signal the BackgroundTarget to pulse when this section enters view
  useEffect(() => {
    if (inView && !eventFired.current) {
      eventFired.current = true;
      window.dispatchEvent(new CustomEvent("contact-in-view"));
    }
  }, [inView]);

  return (
    <section
      ref={ref}
      id="contact"
      data-snap="true"
      className="relative flex flex-col items-center justify-center px-6 md:px-16"
      style={{ minHeight: "100svh", backgroundColor: "var(--color-bg)" }}
    >
      <div className="w-full max-w-2xl py-24">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.3 : 0.7 }}
          className="font-serif text-4xl md:text-5xl mb-8"
          style={{ color: "var(--color-text)" }}
        >
          The next shot.
        </motion.h2>

        {/* Body */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.3 : 0.7, delay: 0.2 }}
        >
          <p
            className="font-sans text-base leading-loose mb-3"
            style={{ color: "var(--color-muted)" }}
          >
            I&apos;m currently open to junior developer roles,
            <br />
            especially in teams that value clean thinking,
            <br />
            WordPress or PHP environments, and the kind of work
            <br />
            where you actually understand the systems you&apos;re building.
          </p>
          <p
            className="font-sans text-base leading-loose"
            style={{ color: "var(--color-muted)" }}
          >
            If that sounds like where you are, I&apos;d like to talk.
          </p>
        </motion.div>

        {/* Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.3 : 0.6, delay: 0.4 }}
          className="flex flex-col gap-4 mt-10"
        >
          <ContactLink
            href="mailto:abdullahm@email.com"
            label="abdullahm@email.com"
          />
          <ContactLink
            href="https://linkedin.com/in/abdullah-mohamed"
            label="linkedin.com/in/abdullah-mohamed"
          />
        </motion.div>

        {/* Divider + Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: prefersReduced ? 0.3 : 0.6, delay: 0.6 }}
          className="mt-16"
        >
          <div
            className="w-full h-px mb-8"
            style={{ backgroundColor: "var(--color-line)" }}
          />
          <p
            className="font-mono text-xs text-center tracking-widest"
            style={{ color: "var(--color-muted)" }}
          >
            Abdullah Mohamed, always calibrating.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
