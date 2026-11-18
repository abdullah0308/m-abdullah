"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

export interface FireworksHandle {
  /** A single burst at (x, y), in CSS px relative to the canvas. */
  burst: (x: number, y: number, size?: number) => void;
  /** A short show: rockets climb from below and explode across the canvas. */
  show: (rockets?: number) => void;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; color: string; size: number;
  rocket?: { targetY: number; size: number };
}

const COLORS = ["#f2c230", "#ea9140", "#fff3dc", "#d9412f", "#a6b852", "#ffd9a8"];

/** A soft glowing dot per colour (white-hot core, coloured halo), drawn once. */
const glowCache = new Map<string, HTMLCanvasElement>();
function glow(color: string) {
  let c = glowCache.get(color);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = 32;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.18, color);
    grad.addColorStop(0.45, color + "66");
    grad.addColorStop(1, color + "00");
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    glowCache.set(color, c);
  }
  return c;
}

/**
 * Canvas fireworks for the footer game. The loop only runs while something
 * is in the air, so an idle footer costs nothing. Callers skip it entirely
 * under reduced motion.
 */
const Fireworks = forwardRef<FireworksHandle, { className?: string; onExplode?: (size: number) => void }>(function Fireworks(
  { className = "", onExplode },
  ref
) {
  const onExplodeRef = useRef(onExplode);
  onExplodeRef.current = onExplode;
  const canvas = useRef<HTMLCanvasElement>(null);
  const parts = useRef<Particle[]>([]);
  const raf = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const loop = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Fade the previous frame instead of clearing it: sparks leave trails.
    g.globalCompositeOperation = "destination-out";
    g.globalAlpha = 1;
    g.fillStyle = "rgba(0,0,0,0.22)";
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";

    const next: Particle[] = [];
    for (const p of parts.current) {
      p.life++;
      if (p.rocket) {
        p.y += p.vy;
        p.x += p.vx;
        g.globalAlpha = 0.9;
        g.drawImage(glow("#ffe6be"), p.x - 6, p.y - 6, 12, 12);
        if (p.y <= p.rocket.targetY) explode(p.x, p.y, p.rocket.size, next);
        else next.push(p);
        continue;
      }
      p.vx *= 0.972;
      p.vy = p.vy * 0.972 + 0.05; // drag and gravity
      p.x += p.vx;
      p.y += p.vy;
      const a = 1 - p.life / p.max;
      if (a <= 0) continue;
      // late in life the sparks crackle: they flicker as they die
      const flicker = a < 0.35 ? (Math.random() < 0.5 ? 0.25 : 1) : 1;
      const r = p.size * (1.6 + a * 2.2);
      g.globalAlpha = a * flicker;
      g.drawImage(glow(p.color), p.x - r, p.y - r, r * 2, r * 2);
      next.push(p);
    }
    g.globalAlpha = 1;
    parts.current = next;
    raf.current = next.length ? requestAnimationFrame(loop) : 0;
    if (!next.length) g.clearRect(0, 0, w, h);
  }, []);

  const start = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(loop);
  }, [loop]);

  function explode(x: number, y: number, size: number, into: Particle[]) {
    onExplodeRef.current?.(size);
    const n = Math.round(78 * size);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const alt = COLORS[Math.floor(Math.random() * COLORS.length)];
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.2;
      // two shells: a fast outer ring and a slower inner bloom
      const sp = (i % 3 === 0 ? 1.2 + Math.random() * 1.6 : 2.8 + Math.random() * 2.6) * size;
      into.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0,
        max: 58 + Math.random() * 36,
        color: Math.random() < 0.7 ? color : alt,
        size: 1.5 + Math.random() * 1.5,
      });
    }
  }

  useImperativeHandle(ref, () => ({
    burst(x, y, size = 0.8) {
      explode(x, y, size, parts.current);
      start();
    },
    show(rockets = 7) {
      const c = canvas.current;
      if (!c) return;
      const w = c.clientWidth, h = c.clientHeight;
      for (let i = 0; i < rockets; i++) {
        timers.current.push(
          setTimeout(() => {
            parts.current.push({
              x: w * (0.15 + Math.random() * 0.7),
              y: h + 10,
              vx: (Math.random() - 0.5) * 1.2,
              vy: -(7 + Math.random() * 3),
              life: 0, max: 999, color: "#fff", size: 2,
              rocket: { targetY: h * (0.12 + Math.random() * 0.35), size: 0.9 + Math.random() * 0.6 },
            });
            start();
          }, i * 260 + Math.random() * 120)
        );
      }
    },
  }), [start]);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    timers.current.forEach(clearTimeout);
  }, []);

  return <canvas ref={canvas} aria-hidden className={`pointer-events-none ${className}`} />;
});

export default Fireworks;
