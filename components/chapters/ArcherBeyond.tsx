"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";

export default function ArcherBeyond() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const prefersReduced = useReducedMotion();

  return (
    <section
      ref={ref}
      id="archer-beyond"
      data-snap="true"
      className="relative flex items-center justify-center overflow-hidden"
      style={{ minHeight: "100svh", backgroundColor: "#060606" }}
    >
      {/* Background image with dark overlay */}
      <div className="absolute inset-0">
        <Image
          src="/images/archery-full.jpeg"
          alt=""
          fill
          className="object-cover object-center"
          style={{ opacity: 0.3 }}
          priority={false}
          aria-hidden="true"
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(6,6,6,0.6) 0%, rgba(6,6,6,0.5) 50%, rgba(6,6,6,0.8) 100%)",
          }}
          aria-hidden="true"
        />
      </div>

      {/* Text block */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : { opacity: 0 }}
        transition={{
          duration: prefersReduced ? 0.3 : 1.2,
          ease: "easeInOut",
        }}
        className="relative z-10 text-center px-6"
        style={{ maxWidth: "600px" }}
      >
        <p
          className="font-serif text-lg md:text-xl"
          style={{ color: "var(--color-text)", lineHeight: 1.9 }}
        >
          &ldquo;Archery taught me something that code is still teaching me:
        </p>
        <p
          className="font-serif text-lg md:text-xl mt-6"
          style={{ color: "var(--color-text)", lineHeight: 1.9 }}
        >
          You can practice the same shot a thousand times
          <br />
          and still find room to improve it.
        </p>
        <p
          className="font-serif text-lg md:text-xl mt-6"
          style={{ color: "var(--color-text)", lineHeight: 1.9 }}
        >
          Not because you&apos;re failing,
          <br />
          but because precision is not a destination.
          <br />
          It&apos;s a practice.
        </p>
        <p
          className="font-serif text-lg md:text-xl mt-6"
          style={{ color: "var(--color-text)", lineHeight: 1.9 }}
        >
          That&apos;s how I approach building.
          <br />
          Not to be done. To be better.&rdquo;
        </p>
      </motion.div>
    </section>
  );
}
