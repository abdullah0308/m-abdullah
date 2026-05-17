"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const [isPointer, setIsPointer] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMouse, setIsMouse] = useState(false);

  const springX = useSpring(mouseX, { stiffness: 500, damping: 40, mass: 0.5 });
  const springY = useSpring(mouseY, { stiffness: 500, damping: 40, mass: 0.5 });

  useEffect(() => {
    // maxTouchPoints === 0 is the most reliable cross-browser way to rule out touch devices
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
      style={{ x: springX, y: springY }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ opacity: { duration: 0.2 } }}
    >
      <motion.svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        animate={{ scale: isPointer ? 1.5 : 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <line x1="0" y1="16" x2="32" y2="16" stroke="#00A7E1" strokeWidth="1" />
        <line x1="16" y1="0" x2="16" y2="32" stroke="#00A7E1" strokeWidth="1" />
        <circle cx="16" cy="16" r="1.5" fill="#00A7E1" />
        <circle
          cx="16"
          cy="16"
          r="5"
          fill="none"
          stroke="#00A7E1"
          strokeWidth={isPointer ? "1.2" : "0.8"}
          opacity="0.9"
        />
        <circle cx="16" cy="16" r="9" fill="none" stroke="#00A7E1" strokeWidth="0.5" opacity="0.4" />
      </motion.svg>
    </motion.div>
  );
}
