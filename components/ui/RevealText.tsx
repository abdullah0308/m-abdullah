"use client";

import { useRef, useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Plays once on entry and never resets or replays. */
const PLAY_ONCE: ScrollTrigger.Vars["toggleActions"] = "play none none none";

interface RevealTextProps {
  children: ReactNode;
  /**
   * heading — masked line-by-line rise (SplitText), staggered
   * body    — elegant float-up with soft blur-out
   * label   — slides from left, tight and quick
   */
  variant?: "heading" | "body" | "label";
  delay?: number;
  className?: string;
}

export default function RevealText({
  children,
  variant = "body",
  delay = 0,
  className,
}: RevealTextProps) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap  = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    const st: ScrollTrigger.Vars = {
      trigger: wrap,
      start: "top 88%",
      toggleActions: PLAY_ONCE,
    };

    let cancelled = false;
    let split: SplitText | null = null;
    let tween: gsap.core.Tween | null = null;

    // Splitting rewrites the DOM — never do it over contenteditable (edit mode)
    const editable = inner.querySelector("[contenteditable]") !== null;

    if (variant === "heading" && !editable) {
      // Wait for fonts so line breaks are measured correctly
      document.fonts.ready.then(() => {
        if (cancelled) return;
        split = SplitText.create(inner, {
          type: "lines",
          mask: "lines",
          linesClass: "rt-line",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 115,
              duration: 0.85,
              stagger: 0.09,
              ease: "power4.out",
              delay,
              scrollTrigger: { ...st },
            }),
        });
        ScrollTrigger.refresh();
      });
    } else if (variant === "heading") {
      // Edit-mode fallback: whole-block clip reveal, DOM untouched
      tween = gsap.fromTo(
        inner,
        { yPercent: 110 },
        { yPercent: 0, duration: 0.8, ease: "power4.out", delay, scrollTrigger: { ...st } }
      );
    } else if (variant === "label") {
      tween = gsap.fromTo(
        inner,
        { x: -24, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.55, ease: "power3.out", delay, scrollTrigger: { ...st } }
      );
    } else {
      tween = gsap.fromTo(
        inner,
        { y: 36, opacity: 0, filter: "blur(6px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.7,
          ease: "power3.out",
          delay,
          scrollTrigger: { ...st },
        }
      );
    }

    return () => {
      cancelled = true;
      tween?.scrollTrigger?.kill();
      tween?.kill();
      split?.revert();
    };
  }, [variant, delay]);

  if (variant === "heading") {
    return (
      <div ref={wrapRef} className={`overflow-hidden ${className ?? ""}`}>
        <div ref={innerRef}>{children}</div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={className}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
