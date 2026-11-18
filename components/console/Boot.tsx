"use client";

import { useEffect, useRef } from "react";
import { haptic } from "./useGamepad";

/** Seconds into the power-on sequence that each moment happens. */
const T = {
  line: 0.45, // the light has stretched into a line; it breaks into particles
  gather: 1.5, // the particles start to find the mark
  mark: 2.75, // the mark is whole: flash, ring, chord
  glow: 3.3, // the room lights up behind it
  done: 4.4, // over to "Who is playing?"
};
export const BOOT_SECONDS = T.done;

interface Mote {
  sx: number;
  sy: number; // on the line of light
  mx: number;
  my: number; // scattered, swirling
  tx: number;
  ty: number; // its place in the mark
  delay: number;
  size: number;
  warm: boolean;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const easeOut = (p: number) => 1 - Math.pow(1 - clamp01(p), 3);
const easeInOut = (p: number) => {
  const x = clamp01(p);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

/**
 * The console switching on, the way a console does: it sits dark with a
 * standby light breathing, and a press powers it up. The light flares,
 * stretches into a line, breaks into a few thousand motes that swirl and
 * gather into the AM mark; the mark lands with a flash and a ring of light,
 * a sheen crosses it, and the room warms up behind it.
 *
 * The idea is borrowed from game consoles; the mark, the light and the chime
 * that goes with it (sound.ts, `sfx.power`) are this site's own.
 *
 * One canvas, drawn only while powering on. The parent decides when that is
 * (`powering`), and is told when it is over (`onDone`); a second press skips.
 */
export default function Boot({ powering, onPress, onDone }: { powering: boolean; onPress: () => void; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!powering) return;
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = c.clientWidth;
    const H = c.clientHeight;
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = W / 2;
    const cy = H / 2;
    const accent = (getComputedStyle(c).getPropertyValue("--accent-rgb").trim() || "234 145 64").replace(/\s+/g, ",");

    // The mark, as a white silhouette, and the points the motes will fill.
    const L = Math.round(Math.min(W, H) * 0.17);
    const mark = document.createElement("canvas");
    mark.width = L;
    mark.height = L;
    const mg = mark.getContext("2d")!;
    let motes: Mote[] = [];
    let ready = false;
    const img = new Image();
    img.onload = () => {
      mg.drawImage(img, 0, 0, L, L);
      mg.globalCompositeOperation = "source-in";
      mg.fillStyle = "#fff";
      mg.fillRect(0, 0, L, L);
      const data = mg.getImageData(0, 0, L, L).data;
      const step = Math.max(2, Math.round(L / 64));
      const pts: [number, number][] = [];
      for (let y = 0; y < L; y += step) for (let x = 0; x < L; x += step) if (data[(y * L + x) * 4 + 3] > 120) pts.push([x, y]);
      const lineW = W * 0.72;
      // the swirl turns, so keep it inside the screen whichever way it faces
      const rx = Math.min(W * 0.34, H * 0.45);
      const ry = Math.min(H * 0.3, W * 0.4);
      motes = pts.map(([x, y]) => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 0.25 + Math.random() * 0.75;
        return {
          sx: cx + (Math.random() - 0.5) * lineW,
          sy: cy + (Math.random() - 0.5) * 3,
          mx: cx + Math.cos(ang) * rad * rx,
          my: cy + Math.sin(ang) * rad * ry,
          tx: cx - L / 2 + x,
          ty: cy - L / 2 + y,
          delay: Math.random() * 0.4,
          size: 1 + Math.random() * 1.4,
          warm: Math.random() < 0.32,
        };
      });
      ready = true;
    };
    img.src = "/images/AM%20Web%20Logo.svg";

    const t0 = performance.now();
    let raf = 0;
    let marked = false;
    let finished = false;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const t = (performance.now() - t0) / 1000;

      // trails while the motes fly; a clean frame once the mark is whole
      g.globalCompositeOperation = "source-over";
      g.fillStyle = t < T.mark ? "rgba(0,0,0,0.32)" : "#000";
      g.fillRect(0, 0, W, H);

      // the room warming up behind the mark
      if (t > T.glow - 0.3) {
        const k = easeOut((t - (T.glow - 0.3)) / 1.1);
        const bg = g.createRadialGradient(cx, H * 1.05, 0, cx, H * 1.05, Math.max(W, H) * 0.9);
        bg.addColorStop(0, `rgba(${accent},${0.32 * k})`);
        bg.addColorStop(0.45, `rgba(${accent},${0.08 * k})`);
        bg.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = bg;
        g.fillRect(0, 0, W, H);
      }

      g.globalCompositeOperation = "lighter";

      // the standby light flares and stretches into a line
      if (t < T.line + 0.25) {
        const p = easeOut(t / T.line);
        const fadeLine = 1 - clamp01((t - T.line) / 0.25);
        const r = 6 + p * 60;
        const flare = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        flare.addColorStop(0, `rgba(255,255,255,${0.95 * fadeLine})`);
        flare.addColorStop(0.3, `rgba(${accent},${0.7 * fadeLine})`);
        flare.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = flare;
        g.fillRect(cx - r, cy - r, r * 2, r * 2);
        const len = W * 0.72 * p;
        const line = g.createLinearGradient(cx - len / 2, 0, cx + len / 2, 0);
        line.addColorStop(0, "rgba(255,255,255,0)");
        line.addColorStop(0.5, `rgba(255,255,255,${fadeLine})`);
        line.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = line;
        g.fillRect(cx - len / 2, cy - 1, len, 2);
        const halo = g.createLinearGradient(cx - len / 2, 0, cx + len / 2, 0);
        halo.addColorStop(0, `rgba(${accent},0)`);
        halo.addColorStop(0.5, `rgba(${accent},${0.35 * fadeLine})`);
        halo.addColorStop(1, `rgba(${accent},0)`);
        g.fillStyle = halo;
        g.fillRect(cx - len / 2, cy - 10, len, 20);
      }

      // the motes: off the line, swirling out, then into the mark
      if (ready && t > T.line && t < T.mark + 0.5) {
        const out = 1 - clamp01((t - T.mark) / 0.4);
        for (const m of motes) {
          let x: number;
          let y: number;
          let a: number;
          if (t < T.gather) {
            const p = easeOut((t - T.line) / (T.gather - T.line));
            x = m.sx + (m.mx - m.sx) * p;
            y = m.sy + (m.my - m.sy) * p;
            a = 0.25 + 0.55 * p;
          } else {
            const q = easeInOut((t - T.gather - m.delay) / (T.mark - T.gather - 0.4));
            // a turn around the centre that unwinds as they arrive
            const turn = (1 - q) * 1.3;
            const ox = m.mx - cx;
            const oy = m.my - cy;
            const rx = cx + ox * Math.cos(turn) - oy * Math.sin(turn);
            const ry = cy + ox * Math.sin(turn) + oy * Math.cos(turn);
            x = rx + (m.tx - rx) * q;
            y = ry + (m.ty - ry) * q;
            a = 0.8 + 0.2 * q;
          }
          g.fillStyle = m.warm ? `rgba(${accent},${a * out})` : `rgba(255,255,255,${a * out})`;
          g.fillRect(x - m.size / 2, y - m.size / 2, m.size, m.size);
        }
      }

      // the mark lands: a flash, a ring going out, the crisp mark, a sheen across it
      if (t >= T.mark) {
        if (!marked) {
          marked = true;
          haptic("milestone");
        }
        const d = t - T.mark;
        const flash = 1 - clamp01(d / 0.6);
        if (flash > 0) {
          const fr = Math.max(W, H) * 0.7;
          const bloom = g.createRadialGradient(cx, cy, 0, cx, cy, fr);
          bloom.addColorStop(0, `rgba(255,255,255,${0.55 * flash})`);
          bloom.addColorStop(0.25, `rgba(${accent},${0.25 * flash})`);
          bloom.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = bloom;
          g.fillRect(0, 0, W, H);
        }
        const ringP = clamp01(d / 1.1);
        if (ringP < 1) {
          g.strokeStyle = `rgba(${accent},${0.85 * (1 - ringP)})`;
          g.lineWidth = 2;
          g.beginPath();
          g.arc(cx, cy, L * 0.6 + easeOut(ringP) * Math.max(W, H) * 0.75, 0, Math.PI * 2);
          g.stroke();
        }

        g.globalCompositeOperation = "source-over";
        g.globalAlpha = easeOut(d / 0.35);
        g.drawImage(mark, cx - L / 2, cy - L / 2);
        g.globalAlpha = 1;

        // the sheen: a soft band of light passing over the mark only
        const s = (d - 0.25) / 0.7;
        if (s > 0 && s < 1) {
          const tmp = document.createElement("canvas");
          tmp.width = L;
          tmp.height = L;
          const tg = tmp.getContext("2d")!;
          tg.drawImage(mark, 0, 0);
          tg.globalCompositeOperation = "source-in";
          const bx = -L + s * L * 3;
          const band = tg.createLinearGradient(bx, 0, bx + L * 0.6, L * 0.6);
          band.addColorStop(0, "rgba(255,255,255,0)");
          band.addColorStop(0.5, `rgba(${accent},0.95)`);
          band.addColorStop(1, "rgba(255,255,255,0)");
          tg.fillStyle = band;
          tg.fillRect(0, 0, L, L);
          g.globalCompositeOperation = "lighter";
          g.drawImage(tmp, cx - L / 2, cy - L / 2);
          g.globalCompositeOperation = "source-over";
        }
      }

      if (t >= T.done && !finished) {
        finished = true;
        cancelAnimationFrame(raf);
        done.current();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [powering]);

  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={powering ? "Skip the start-up" : "Power on the console"}
      className="fixed inset-0 z-50 block h-full w-full overflow-hidden bg-black text-content"
    >
      <canvas ref={canvas} aria-hidden className="absolute inset-0 h-full w-full" />

      {/* standby: the light breathing, waiting for a press */}
      <span
        aria-hidden
        className={`absolute left-1/2 top-1/2 -ml-5 -mt-[2px] block h-1 w-10 rounded-full bg-accent shadow-[0_0_22px_6px_rgb(var(--accent-rgb)/0.55)] transition-opacity duration-150 ${
          powering ? "opacity-0" : "c-standby"
        }`}
      />
      <span
        className={`absolute inset-x-0 top-1/2 mt-10 text-center text-base text-content/70 transition-opacity duration-300 ${
          powering ? "opacity-0" : "c-boot-text"
        }`}
      >
        <span className="hidden lg:inline">Press any button to power on</span>
        <span className="lg:hidden">Tap to power on</span>
      </span>
      <span
        className={`absolute inset-x-0 bottom-8 text-center text-sm text-content/45 transition-opacity duration-300 ${powering ? "opacity-0" : ""}`}
      >
        Sound on. A keyboard, a mouse, or a gamepad will do.
      </span>
    </button>
  );
}
