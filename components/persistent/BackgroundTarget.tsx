"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function BackgroundTarget() {
  const { scrollYProgress } = useScroll();
  const [pulseContact, setPulseContact] = useState(false);

  // Scale from 1 to 2.2 as user scrolls. On mobile cap at 1.6.
  const scaleDesktop = useTransform(scrollYProgress, [0, 1], [1, 2.2]);
  const scaleMobile = useTransform(scrollYProgress, [0, 1], [1, 1.6]);

  // Listen for contact-in-view event
  useEffect(() => {
    const handler = () => {
      setPulseContact(true);
      setTimeout(() => setPulseContact(false), 2000);
    };
    window.addEventListener("contact-in-view", handler);
    return () => window.removeEventListener("contact-in-view", handler);
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* Desktop target */}
      <div
        className="hidden md:block absolute"
        style={{ top: "50%", left: "57%", transform: "translate(-50%, -50%)" }}
      >
        <motion.div
          style={{ scale: scaleDesktop, opacity: 0.04 }}
          animate={pulseContact ? { scale: [2.2, 2.3, 2.2] } : undefined}
          transition={
            pulseContact ? { duration: 1.6, ease: "easeInOut" } : undefined
          }
        >
          <TargetSVG />
        </motion.div>
      </div>

      {/* Mobile target */}
      <div
        className="md:hidden absolute"
        style={{ top: "50%", left: "57%", transform: "translate(-50%, -50%)" }}
      >
        <motion.div style={{ scale: scaleMobile, opacity: 0.04 }}>
          <TargetSVG />
        </motion.div>
      </div>
    </div>
  );
}

function TargetSVG() {
  return (
    <svg
      width="600"
      height="600"
      viewBox="0 0 600 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="300" cy="300" r="60" stroke="#ffffff" strokeWidth="1" />
      <circle cx="300" cy="300" r="130" stroke="#ffffff" strokeWidth="1" />
      <circle cx="300" cy="300" r="210" stroke="#ffffff" strokeWidth="1" />
      <circle cx="300" cy="300" r="290" stroke="#ffffff" strokeWidth="1" />
    </svg>
  );
}
