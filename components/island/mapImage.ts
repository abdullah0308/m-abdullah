/**
 * The island as a paper-and-ink map: drawn once, used by the minimap in the
 * corner and the full map. Hill shading comes from the same heights the 3D
 * ground uses, so the mountains are where you see them.
 */

import { TOWNS } from "./geo";
import { HC, HNX, HNZ, SPAN_X, SPAN_Z, X0, Z0, heightAt, sdfAt, type World } from "./world";

export const MAP_SCALE = 0.4; // pixels per unit

export function paintMap(w: World): HTMLCanvasElement {
  const W = Math.round(SPAN_X * MAP_SCALE);
  const H = Math.round(SPAN_Z * MAP_SCALE);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const step = 1 / MAP_SCALE;
  for (let py = 0; py < H; py++) {
    const z = Z0 + py * step;
    for (let px = 0; px < W; px++) {
      const x = X0 + px * step;
      const o = (py * W + px) * 4;
      const s = sdfAt(w, x, z);
      let r: number;
      let g: number;
      let b: number;
      if (s < 0) {
        const off = -s;
        const t1 = Math.min(1, off / 24);
        const t2 = Math.min(1, Math.max(0, (off - 60) / 120));
        r = 64 - t1 * 34 - t2 * 18;
        g = 186 - t1 * 46 - t2 * 82;
        b = 186 - t1 * 20 - t2 * 64;
        if (Math.abs(off - 68) < 2.2) {
          r += 60;
          g += 50;
          b += 40;
        }
      } else {
        const h = heightAt(w, x, z);
        const hx = heightAt(w, x + 6, z) - heightAt(w, x - 6, z);
        const hz = heightAt(w, x, z + 6) - heightAt(w, x, z - 6);
        const shade = Math.max(-0.6, Math.min(0.6, (-hx - hz) * 0.05));
        const k = Math.min(1, h / 90);
        r = 74 + k * 40;
        g = 104 + k * 10;
        b = 70 + k * 14;
        if (s < 9) {
          r = 214;
          g = 196;
          b = 150;
        }
        r *= 1 + shade;
        g *= 1 + shade;
        b *= 1 + shade;
      }
      d[o] = r;
      d[o + 1] = g;
      d[o + 2] = b;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Town patches.
  ctx.save();
  ctx.scale(MAP_SCALE, MAP_SCALE);
  ctx.translate(-X0, -Z0);
  for (const t of TOWNS) {
    const gr = ctx.createRadialGradient(t.at[0], t.at[1], 0, t.at[0], t.at[1], t.r * 1.15);
    gr.addColorStop(0, "rgba(190,184,172,0.75)");
    gr.addColorStop(1, "rgba(190,184,172,0)");
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(t.at[0], t.at[1], t.r * 1.15, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const l of w.lakes) {
    ctx.fillStyle = "#3b8fa0";
    ctx.beginPath();
    ctx.arc(l.x, l.z, l.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Roads: a dark casing, then the colour.
  const draw = (color: string, extra: number) => {
    for (const r of w.roads) {
      ctx.strokeStyle = color === "fill" ? (r.kind === "motorway" ? "#f1a35a" : r.kind === "minor" ? "#d9d2c2" : "#f4efe4") : color;
      ctx.lineWidth = (r.kind === "motorway" ? 15 : r.kind === "minor" ? 8 : 11) + extra;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      r.pts.forEach(([x, z], i) => (i ? ctx.lineTo(x, z) : ctx.moveTo(x, z)));
      if (r.closed) ctx.closePath();
      ctx.stroke();
    }
  };
  draw("rgba(20,22,28,0.55)", 7);
  draw("fill", 0);
  ctx.restore();
  return c;
}

/** World to map pixels. */
export const toMap = (x: number, z: number): [number, number] => [(x - X0) * MAP_SCALE, (z - Z0) * MAP_SCALE];
export const fromMap = (px: number, py: number): [number, number] => [px / MAP_SCALE + X0, py / MAP_SCALE + Z0];

export { HC, HNX, HNZ };
