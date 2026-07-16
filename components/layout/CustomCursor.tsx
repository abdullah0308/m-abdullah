"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue } from "framer-motion";

export default function CustomCursor() {
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMouse, setIsMouse] = useState(false);

  useEffect(() => {
    const noTouch = navigator.maxTouchPoints === 0;
    if (!noTouch) return;

    setIsMouse(true);
    document.documentElement.classList.add("has-custom-cursor");

    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 16);
      mouseY.set(e.clientY - 16);
      setIsVisible(true);
    };

    const onEnter = () => setIsPointer(true);
    const onLeave = () => setIsPointer(false);

    window.addEventListener("mousemove", onMove);

    const interactives = document.querySelectorAll(
      "a, button, [role='button'], input, textarea, select"
    );
    interactives.forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    return () => {
      window.removeEventListener("mousemove", onMove);
      interactives.forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, [mouseX, mouseY]);

  if (!isMouse) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 z-[9999] pointer-events-none"
      style={{ x: mouseX, y: mouseY }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ opacity: { duration: 0.15 } }}
    >
      <motion.svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        animate={{ scale: isPointer ? 1.5 : 1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        {/* Crosshair lines */}
        <line x1="0" y1="16" x2="32" y2="16" stroke="#50E8F4" strokeWidth="0.8" opacity="0.7" />
        <line x1="16" y1="0" x2="16" y2="32" stroke="#50E8F4" strokeWidth="0.8" opacity="0.7" />
        {/* Center dot */}
        <circle cx="16" cy="16" r="1.2" fill="#C7F8FE" />
        {/* Inner ring */}
        <circle
          cx="16" cy="16" r="5"
          fill="none"
          stroke="#50E8F4"
          strokeWidth={isPointer ? "1.2" : "0.8"}
          opacity="0.9"
        />
        {/* Outer ring */}
        <circle
          cx="16" cy="16" r="10"
          fill="none"
          stroke="#50E8F4"
          strokeWidth="0.4"
          opacity="0.3"
        />
        {/* Corner ticks */}
        <line x1="5"  y1="5"  x2="8"  y2="5"  stroke="#50E8F4" strokeWidth="0.8" opacity="0.5" />
        <line x1="5"  y1="5"  x2="5"  y2="8"  stroke="#50E8F4" strokeWidth="0.8" opacity="0.5" />
        <line x1="27" y1="5"  x2="24" y2="5"  stroke="#50E8F4" strokeWidth="0.8" opacity="0.5" />
        <line x1="27" y1="5"  x2="27" y2="8"  stroke="#50E8F4" strokeWidth="0.8" opacity="0.5" />
        <line x1="5"  y1="27" x2="8"  y2="27" stroke="#50E8F4" strokeWidth="0.8" opacity="0.5" />
        <line x1="5"  y1="27" x2="5"  y2="24" stroke="#50E8F4" strokeWidth="0.8" opacity="0.5" />
        <line x1="27" y1="27" x2="24" y2="27" stroke="#50E8F4" strokeWidth="0.8" opacity="0.5" />
        <line x1="27" y1="27" x2="27" y2="24" stroke="#50E8F4" strokeWidth="0.8" opacity="0.5" />
      </motion.svg>
    </motion.div>
  );
}
