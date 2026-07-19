"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { staggerContainer } from "@/lib/animations";

interface Props {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export default function SectionWrapper({ id, children, className }: Props) {
  const ref = useRef(null);
  // No negative margin: only flips to hidden once the section is fully offscreen
  const isInView = useInView(ref, { once: false });

  return (
    <section
      id={id}
      ref={ref}
      className={`py-24 px-6 md:px-12 lg:px-24 ${className ?? ""}`}
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {children}
      </motion.div>
    </section>
  );
}
