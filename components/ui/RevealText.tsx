"use client";

import { useRef, useEffect, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface RevealTextProps {
  children: ReactNode;
  /**
   * heading — rises from clip mask, powerful punch
   * body    — elegant float-up, stagger if multiple items stacked
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
      toggleActions: "play none none none",
    };

    let t: gsap.core.Tween;

    if (variant === "heading") {
      gsap.set(inner, { y: "100%" });
      t = gsap.to(inner, {
        y: "0%",
        duration: 0.72,
        ease: "power4.out",
        delay,
        scrollTrigger: st,
      });
    } else if (variant === "label") {
      gsap.set(inner, { x: -20, opacity: 0 });
      t = gsap.to(inner, {
        x: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power3.out",
        delay,
        scrollTrigger: st,
      });
    } else {
      // body — snappy float up, no blur, clean
      gsap.set(inner, { y: 32, opacity: 0 });
      t = gsap.to(inner, {
        y: 0,
        opacity: 1,
        duration: 0.65,
        ease: "power3.out",
        delay,
        scrollTrigger: st,
      });
    }

    return () => {
      t?.kill();
      ScrollTrigger.getAll().forEach((st) => {
        if (st.vars.trigger === wrap) st.kill();
      });
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
