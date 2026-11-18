"use client";

import { useEffect, useRef } from "react";
import { useReduceMotion } from "@/lib/useReduceMotion";

interface Mote {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  alpha: number;
}

/**
 * The living background behind the home screen: soft motes of light rising
 * slowly through the dark, and two faint ribbons of light flowing along the
 * bottom, all in the current player's colour. It sits over the tile's art
 * and under everything else.
 *
 * One canvas, about thirty frames a second, paused when the tab is hidden.
 * Nothing at all under reduced motion.
 */
export default function Ambient({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReduceMotion();

  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g || reduce) return;

    let w = 0;
    let h = 0;
    let motes: Mote[] = [];
    const spawn = (anywhere: boolean): Mote => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.8 + Math.random() * 2.4,
      speed: 6 + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.12 + Math.random() * 0.4,
    });
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = c.clientWidth;
      h = c.clientHeight;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      motes = Array.from({ length: Math.round((w * h) / 26000) }, () => spawn(true));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(c);

    let accent = "234,145,64";
    let accentAt = 0;
    let raf = 0;
    let last = performance.now();
    let t = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden || now - last < 32) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;
      if (now - accentAt > 800) {
        accent = getComputedStyle(c).getPropertyValue("--accent-rgb").trim().replace(/\s+/g, ",") || accent;
        accentAt = now;
      }

      g.clearRect(0, 0, w, h);

      // ribbons of light along the bottom
      for (let k = 0; k < 2; k++) {
        const base = h * (0.8 + k * 0.07);
        const grad = g.createLinearGradient(0, base - 60, 0, base + 60);
        grad.addColorStop(0, `rgba(${accent},0)`);
        grad.addColorStop(0.5, `rgba(${accent},${k ? 0.05 : 0.08})`);
        grad.addColorStop(1, `rgba(${accent},0)`);
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(0, h);
        for (let x = 0; x <= w + 20; x += 20) {
          const y =
            base +
            Math.sin(x * 0.004 + t * (0.35 + k * 0.15) + k * 2) * 26 +
            Math.sin(x * 0.0017 - t * 0.22 + k) * 34;
          g.lineTo(x, y);
        }
        g.lineTo(w, h);
        g.closePath();
        g.fill();
      }

      // motes
      for (const m of motes) {
        m.y -= m.speed * dt;
        m.x += Math.sin(t * 0.6 + m.phase) * 6 * dt;
        if (m.y < -10) Object.assign(m, spawn(false));
        const twinkle = 0.65 + 0.35 * Math.sin(t * 1.4 + m.phase);
        const glow = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
        glow.addColorStop(0, `rgba(255,255,255,${m.alpha * twinkle})`);
        glow.addColorStop(0.35, `rgba(${accent},${m.alpha * 0.6 * twinkle})`);
        glow.addColorStop(1, `rgba(${accent},0)`);
        g.fillStyle = glow;
        g.fillRect(m.x - m.r * 4, m.y - m.r * 4, m.r * 8, m.r * 8);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      // leave nothing behind (reduced motion switches this off after mount)
      g.clearRect(0, 0, c.width, c.height);
    };
  }, [reduce]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none ${className}`} />;
}
