"use client";

import { useRef, useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface RevealButtonProps {
  children: ReactNode;
  /** Stagger delay within a group (e.g. 0, 0.12, 0.24 for consecutive buttons) */
  delay?: number;
  className?: string;
}

/**
 * Buttons reveal with a left-to-right teal sweep, then the button content fades in.
 * The curtain element slides in from the left, pauses, then slides out to the right —
 * as it exits, the button underneath becomes visible. Very cinematic.
 */
export default function RevealButton({ children, delay = 0, className }: RevealButtonProps) {
  const outerRef   = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer   = outerRef.current;
    const content = contentRef.current;
    const curtain = curtainRef.current;
    if (!outer || !content || !curtain) return;

    // Start: content invisible, curtain scaled to 0 from left
    gsap.set(content, { opacity: 0, x: -8 });
    gsap.set(curtain, { scaleX: 0, transformOrigin: "left center" });

    const tl = gsap.timeline({
      delay,
      scrollTrigger: {
        trigger: outer,
        start: "top 90%",
        toggleActions: "play none none none",
      },
    });

    tl
      // Curtain sweeps in from left
      .to(curtain, { scaleX: 1, duration: 0.35, ease: "power2.in" })
      // Curtain sweeps out to right, content fades in simultaneously
      .to(curtain, { scaleX: 0, transformOrigin: "right center", duration: 0.35, ease: "power2.out" }, "+=0.05")
      .to(content, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }, "<0.1");

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, [delay]);

  return (
    <div ref={outerRef} className={`relative inline-block ${className ?? ""}`}>
      {/* Teal curtain overlay */}
      <div
        ref={curtainRef}
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: "#50E8F4" }}
      />
      {/* Actual button content */}
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
