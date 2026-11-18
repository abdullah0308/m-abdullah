"use client";

import { useEffect, useRef } from "react";
import { useReduceMotion } from "@/lib/useReduceMotion";

const SIZE = 14; // glyph size, px
const GAP = 30; // column spacing, px
const GLYPHS = "01{}<>/=;()[]$#&*+-abcdefABCDEF";
const NAME = "FLOCON";

interface Column {
  y: number;
  /** rows still to wait before this column starts falling */
  wait: number;
  /** index into NAME while this run is spelling it, otherwise -1 */
  spell: number;
}

/**
 * Thin columns of code falling down the wallpaper, as on a terminal left
 * running overnight. Most of it is noise. Now and then one column, on its
 * way down, spells F L O C O N in the green of her eyes and carries on as
 * if nothing happened.
 *
 * A canvas, ticked about fourteen times a second and paused whenever the tab
 * is hidden. It draws nothing at all under reduced motion.
 */
export default function CodeRain({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReduceMotion();

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g || reduce) return;

    let w = 0;
    let h = 0;
    let cols: Column[] = [];
    const fresh = (): Column => ({ y: 0, wait: Math.floor(Math.random() * 60), spell: -1 });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.font = `${SIZE}px ui-monospace, "Geist Mono", monospace`;
      g.textBaseline = "top";
      cols = Array.from({ length: Math.ceil(w / GAP) }, fresh);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || now - last < 70) return;
      last = now;

      // fade what is there, so each glyph leaves a short tail
      g.globalCompositeOperation = "destination-out";
      g.fillStyle = "rgba(0,0,0,0.16)";
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = "source-over";

      cols.forEach((c, i) => {
        if (c.wait > 0) {
          c.wait--;
          return;
        }
        if (c.y === 0) c.spell = Math.random() < 0.12 ? -2 - Math.floor(Math.random() * 14) : -1;

        let ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        let color = "rgba(238,240,232,0.34)";
        // a spelling run counts up through negative numbers, then through NAME
        if (c.spell < -1) c.spell = c.spell === -2 ? 0 : c.spell + 1;
        else if (c.spell >= 0 && c.spell < NAME.length) {
          ch = NAME[c.spell];
          color = "rgba(186,204,108,0.95)";
          c.spell++;
        }
        g.fillStyle = color;
        g.fillText(ch, i * GAP + 8, c.y);

        c.y += SIZE + 4;
        if (c.y > h) Object.assign(c, fresh(), { wait: 8 + Math.floor(Math.random() * 90) });
      });
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduce]);

  return <canvas ref={ref} aria-hidden className={`pointer-events-none ${className}`} />;
}
