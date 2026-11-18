/**
 * The island, as data. Everything here is in latitude and longitude, close
 * enough to the real Mauritius to be recognised from the air, then projected
 * into world units at roughly 1:20 (one unit is one metre for the car, so
 * the island is about three kilometres across and a coast-to-coast drive
 * takes a minute or two, not half an hour).
 *
 * World axes: x is east, z is south, y is up. North is -z.
 */

export const LON0 = 57.55;
export const LAT0 = -20.25;
export const KX = 5230; // units per degree of longitude
export const KZ = 5530; // units per degree of latitude

export type V2 = [number, number];

export const ll = (lat: number, lon: number): V2 => [(lon - LON0) * KX, (LAT0 - lat) * KZ];

/* ── Seeded randomness, so the island is the same island every visit ───── */

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x: number, y: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1]. */
export function noise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

export function fbm(x: number, y: number, octaves = 4) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * f, y * f);
    f *= 2.03;
    amp *= 0.5;
  }
  return sum / (1 - Math.pow(0.5, octaves));
}

/* ── Curves ────────────────────────────────────────────────────────────── */

/** Catmull-Rom through the points, `per` samples per segment. */
export function spline(pts: V2[], per: number, closed: boolean): V2[] {
  const out: V2[] = [];
  const n = pts.length;
  const get = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

/** Resample a polyline at an even spacing. */
export function resample(pts: V2[], step: number, closed = false): V2[] {
  const src = closed ? [...pts, pts[0]] : pts;
  const out: V2[] = [src[0]];
  let carry = 0;
  for (let i = 1; i < src.length; i++) {
    const [ax, az] = src[i - 1];
    const [bx, bz] = src[i];
    const len = Math.hypot(bx - ax, bz - az);
    let t = step - carry;
    while (t <= len) {
      out.push([ax + ((bx - ax) * t) / len, az + ((bz - az) * t) / len]);
      t += step;
    }
    carry = len - (t - step);
  }
  if (!closed) {
    const last = src[src.length - 1];
    const tail = out[out.length - 1];
    if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > step * 0.3) out.push(last);
  }
  return out;
}

/** Midpoint displacement, for a coastline that is not a smooth balloon. */
function roughen(pts: V2[], depth: number, amp: number, rand: () => number): V2[] {
  let cur = pts;
  let a = amp;
  for (let d = 0; d < depth; d++) {
    const next: V2[] = [];
    for (let i = 0; i < cur.length; i++) {
      const p = cur[i];
      const q = cur[(i + 1) % cur.length];
      const mx = (p[0] + q[0]) / 2;
      const mz = (p[1] + q[1]) / 2;
      const dx = q[0] - p[0];
      const dz = q[1] - p[1];
      const len = Math.hypot(dx, dz) || 1;
      const off = (rand() - 0.5) * 2 * a * Math.min(1, len / 40);
      next.push(p, [mx + (-dz / len) * off, mz + (dx / len) * off]);
    }
    cur = next;
    a *= 0.55;
  }
  return cur;
}

/* ── The coast, clockwise from Cap Malheureux ──────────────────────────── */

const COAST_LL: [number, number][] = [
  [-19.984, 57.614], [-19.993, 57.64], [-20.004, 57.663], [-20.03, 57.672], [-20.055, 57.69],
  [-20.08, 57.705], [-20.105, 57.722], [-20.13, 57.745], [-20.16, 57.76], [-20.19, 57.772],
  [-20.22, 57.783], [-20.245, 57.79], [-20.275, 57.79], [-20.3, 57.775], [-20.33, 57.762],
  [-20.355, 57.745], [-20.385, 57.727], [-20.402, 57.708], [-20.423, 57.716], [-20.445, 57.719],
  [-20.462, 57.7], [-20.47, 57.67], [-20.485, 57.63], [-20.505, 57.575], [-20.52, 57.54],
  [-20.519, 57.505], [-20.507, 57.46], [-20.501, 57.42], [-20.494, 57.385], [-20.481, 57.356],
  [-20.472, 57.33], [-20.47, 57.309], [-20.452, 57.301], [-20.439, 57.318], [-20.43, 57.34],
  [-20.41, 57.346], [-20.38, 57.352], [-20.35, 57.358], [-20.325, 57.364], [-20.3, 57.362],
  [-20.275, 57.367], [-20.245, 57.38], [-20.215, 57.398], [-20.19, 57.43], [-20.172, 57.468],
  [-20.16, 57.495], [-20.14, 57.504], [-20.115, 57.512], [-20.09, 57.52], [-20.065, 57.526],
  [-20.04, 57.545], [-20.02, 57.566], [-20.01, 57.585], [-19.996, 57.598],
];

const coastBase = spline(COAST_LL.map(([a, b]) => ll(a, b)), 4, true);
export const COAST: V2[] = roughen(coastBase, 3, 22, rng(7));

export const CENTER: V2 = ll(-20.26, 57.555);

/* ── Relief ────────────────────────────────────────────────────────────── */

export interface Mountain {
  name: string;
  at: V2;
  /** footprint radius in units */
  r: number;
  /** height in units (exaggerated: the island is drawn at 1:20 across but about 1:6 up) */
  h: number;
  /** peak: a cone; mesa: steep sides, flat top; ridge: stretched along `angle` */
  kind: "peak" | "mesa" | "ridge";
  angle?: number;
  stretch?: number;
}

export const MOUNTAINS: Mountain[] = [
  { name: "Le Morne Brabant", at: ll(-20.452, 57.318), r: 72, h: 92, kind: "mesa" },
  { name: "Pieter Both", at: ll(-20.193, 57.556), r: 48, h: 76, kind: "peak" },
  { name: "Le Pouce", at: ll(-20.199, 57.528), r: 52, h: 66, kind: "peak" },
  { name: "Moka Range", at: ll(-20.205, 57.51), r: 70, h: 40, kind: "ridge", angle: 0.35, stretch: 2.4 },
  { name: "Signal Mountain", at: ll(-20.17, 57.485), r: 40, h: 26, kind: "peak" },
  { name: "Trois Mamelles", at: ll(-20.3, 57.427), r: 34, h: 54, kind: "peak" },
  { name: "Trois Mamelles", at: ll(-20.296, 57.436), r: 30, h: 48, kind: "peak" },
  { name: "Rempart", at: ll(-20.318, 57.412), r: 40, h: 62, kind: "peak" },
  { name: "Corps de Garde", at: ll(-20.268, 57.445), r: 56, h: 50, kind: "mesa" },
  { name: "Black River Peak", at: ll(-20.404, 57.438), r: 95, h: 88, kind: "peak" },
  { name: "Black River Gorges", at: ll(-20.425, 57.465), r: 90, h: 46, kind: "ridge", angle: -0.6, stretch: 2.2 },
  { name: "Savanne", at: ll(-20.45, 57.43), r: 80, h: 34, kind: "ridge", angle: 0.2, stretch: 2 },
  { name: "Lion Mountain", at: ll(-20.36, 57.722), r: 60, h: 58, kind: "ridge", angle: 1.1, stretch: 2.2 },
  { name: "Bambous Range", at: ll(-20.325, 57.705), r: 70, h: 50, kind: "ridge", angle: 1.0, stretch: 2.5 },
  { name: "Montagne Blanche", at: ll(-20.27, 57.655), r: 45, h: 36, kind: "peak" },
];

/** Forests, as rough polygons. */
export const FORESTS: V2[][] = [
  [[-20.36, 57.395], [-20.355, 57.47], [-20.39, 57.505], [-20.45, 57.5], [-20.475, 57.43], [-20.44, 57.385]],
  [[-20.295, 57.675], [-20.305, 57.735], [-20.39, 57.738], [-20.395, 57.69], [-20.35, 57.665]],
  [[-20.185, 57.5], [-20.18, 57.57], [-20.215, 57.575], [-20.22, 57.505]],
].map((poly) => poly.map(([a, b]) => ll(a, b)));

export interface Lake {
  name: string;
  at: V2;
  r: number;
}

export const LAKES: Lake[] = [
  { name: "Grand Bassin", at: ll(-20.418, 57.493), r: 16 },
  { name: "Mare aux Vacoas", at: ll(-20.372, 57.487), r: 34 },
  { name: "Mare Longue", at: ll(-20.392, 57.457), r: 20 },
];

/* ── Towns ─────────────────────────────────────────────────────────────── */

export interface Town {
  name: string;
  at: V2;
  r: number;
  /** buildings per 1000 square units */
  density: number;
  tall?: number;
  towers?: boolean;
}

export const TOWNS: Town[] = [
  { name: "Port Louis", at: ll(-20.164, 57.505), r: 115, density: 5.5, tall: 24 },
  { name: "Ebène", at: ll(-20.243, 57.489), r: 42, density: 3.2, towers: true },
  { name: "Rose Hill", at: ll(-20.234, 57.468), r: 70, density: 4.2, tall: 12 },
  { name: "Quatre Bornes", at: ll(-20.266, 57.478), r: 66, density: 4.2, tall: 12 },
  { name: "Vacoas", at: ll(-20.298, 57.478), r: 62, density: 3.6, tall: 9 },
  { name: "Phoenix", at: ll(-20.287, 57.503), r: 40, density: 3.4, tall: 10 },
  { name: "Curepipe", at: ll(-20.318, 57.526), r: 78, density: 4.4, tall: 13 },
  { name: "Grand Baie", at: ll(-20.016, 57.583), r: 60, density: 3.8, tall: 11 },
  { name: "Triolet", at: ll(-20.057, 57.548), r: 44, density: 3, tall: 7 },
  { name: "Goodlands", at: ll(-20.037, 57.645), r: 42, density: 3, tall: 8 },
  { name: "Centre de Flacq", at: ll(-20.19, 57.715), r: 44, density: 3, tall: 8 },
  { name: "Mahébourg", at: ll(-20.407, 57.7), r: 50, density: 3.6, tall: 8 },
  { name: "Rose Belle", at: ll(-20.4, 57.598), r: 34, density: 2.6, tall: 7 },
  { name: "Souillac", at: ll(-20.515, 57.517), r: 34, density: 2.8, tall: 7 },
  { name: "Flic en Flac", at: ll(-20.276, 57.378), r: 40, density: 3, tall: 9 },
  { name: "Tamarin", at: ll(-20.326, 57.375), r: 34, density: 2.6, tall: 7 },
  { name: "Bel Ombre", at: ll(-20.5, 57.41), r: 24, density: 2, tall: 7 },
];

/** Plaisance: a runway you can drive on. */
export const RUNWAY = { at: ll(-20.43, 57.683), angle: -0.62, length: 165, width: 13 };

/* ── Roads ─────────────────────────────────────────────────────────────── */

export type RoadKind = "motorway" | "main" | "coast" | "minor";

export interface RoadDef {
  name: string;
  kind: RoadKind;
  pts: V2[];
}

const R = (name: string, kind: RoadKind, list: [number, number][]): RoadDef => ({
  name,
  kind,
  pts: list.map(([a, b]) => ll(a, b)),
});

/** Inland roads. The coast road is built from the coastline itself. */
const INLAND: RoadDef[] = [
  R("M2", "motorway", [
    [-20.168, 57.508], [-20.14, 57.522], [-20.11, 57.538], [-20.085, 57.552], [-20.058, 57.556],
    [-20.035, 57.568], [-20.018, 57.582],
  ]),
  R("M1", "motorway", [
    [-20.168, 57.508], [-20.2, 57.494], [-20.226, 57.488], [-20.25, 57.492], [-20.276, 57.5],
    [-20.3, 57.512], [-20.322, 57.53], [-20.35, 57.56], [-20.378, 57.585], [-20.4, 57.605],
    [-20.418, 57.64], [-20.428, 57.668], [-20.42, 57.69], [-20.405, 57.703],
  ]),
  R("Flacq Road", "main", [
    [-20.226, 57.488], [-20.232, 57.52], [-20.23, 57.56], [-20.22, 57.6], [-20.212, 57.64],
    [-20.198, 57.69], [-20.19, 57.72], [-20.19, 57.757],
  ]),
  R("North Road", "main", [
    [-20.085, 57.552], [-20.098, 57.58], [-20.08, 57.61], [-20.052, 57.635], [-20.037, 57.648],
    [-20.016, 57.664],
  ]),
  R("West Road", "main", [
    [-20.25, 57.492], [-20.262, 57.475], [-20.272, 57.45], [-20.282, 57.42], [-20.282, 57.395],
    [-20.278, 57.374],
  ]),
  R("Gorges Road", "minor", [
    [-20.322, 57.53], [-20.345, 57.51], [-20.372, 57.506], [-20.4, 57.498], [-20.415, 57.484],
    [-20.425, 57.455], [-20.432, 57.42], [-20.432, 57.392], [-20.44, 57.37], [-20.438, 57.348],
  ]),
  R("South Road", "minor", [
    [-20.4, 57.605], [-20.43, 57.59], [-20.46, 57.57], [-20.49, 57.545], [-20.512, 57.522],
  ]),
  R("Montagne Road", "minor", [
    [-20.23, 57.6], [-20.26, 57.62], [-20.29, 57.64], [-20.33, 57.655], [-20.37, 57.66],
    [-20.4, 57.66], [-20.418, 57.64],
  ]),
];

/** The coast road: the coastline pulled inland, cutting across Le Morne. */
function coastRoad(): RoadDef {
  const skip = new Set([31, 32, 33]);
  const src = COAST_LL.filter((_, i) => !skip.has(i)).map(([a, b]) => ll(a, b));
  const smooth = spline(src, 4, true);
  const inset: V2[] = smooth.map((p, i) => {
    const a = smooth[(i - 1 + smooth.length) % smooth.length];
    const b = smooth[(i + 1) % smooth.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz) || 1;
    // The coast runs clockwise on screen (x east, z south), so inland is to the right of travel.
    const nx = -dz / len;
    const nz = dx / len;
    return [p[0] + nx * 46, p[1] + nz * 46];
  });
  return { name: "Coast Road", kind: "coast", pts: inset };
}

export const ROAD_DEFS: RoadDef[] = [coastRoad(), ...INLAND];

export const ROAD_WIDTH: Record<RoadKind, number> = { motorway: 13, main: 10, coast: 9.5, minor: 8 };

/* ── Places you can drive to ───────────────────────────────────────────── */

export type PoiKind = "about" | "project" | "garage" | "race" | "range" | "contact";

export interface PoiDef {
  id: string;
  kind: PoiKind;
  /** the town or landmark it sits in */
  place: string;
  at: V2;
  /** index into the projects, for `project` */
  project?: number;
}

export const POIS: PoiDef[] = [
  { id: "about", kind: "about", place: "Port Louis", at: ll(-20.172, 57.505) },
  { id: "work-0", kind: "project", place: "Grand Baie", at: ll(-20.024, 57.576), project: 0 },
  { id: "work-1", kind: "project", place: "Ebène", at: ll(-20.24, 57.489), project: 1 },
  { id: "work-2", kind: "project", place: "Côte d'Or", at: ll(-20.232, 57.565), project: 2 },
  { id: "work-3", kind: "project", place: "Plaisance", at: ll(-20.426, 57.664), project: 3 },
  { id: "garage", kind: "garage", place: "Phoenix", at: ll(-20.284, 57.5) },
  { id: "race", kind: "race", place: "Flic en Flac", at: ll(-20.276, 57.395) },
  { id: "range", kind: "range", place: "Belle Mare", at: ll(-20.19, 57.745) },
  { id: "contact", kind: "contact", place: "Curepipe", at: ll(-20.328, 57.54) },
];

/** Ten golden arrows hidden at landmarks. */
export const ARROWS: { name: string; at: V2 }[] = [
  { name: "Cap Malheureux", at: ll(-19.992, 57.618) },
  { name: "Pamplemousses Garden", at: ll(-20.103, 57.58) },
  { name: "Pieter Both", at: ll(-20.208, 57.566) },
  { name: "Trou aux Cerfs", at: ll(-20.313, 57.507) },
  { name: "Grand Bassin", at: ll(-20.41, 57.5) },
  { name: "Chamarel", at: ll(-20.428, 57.382) },
  { name: "Le Morne", at: ll(-20.432, 57.333) },
  { name: "Gris Gris", at: ll(-20.508, 57.532) },
  { name: "Blue Bay", at: ll(-20.44, 57.703) },
  { name: "Poste Lafayette", at: ll(-20.134, 57.733) },
];

export const SPAWN = { at: ll(-20.176, 57.506), heading: Math.PI * 0.95 };

/* ── Geometry helpers ──────────────────────────────────────────────────── */

export function pointInPoly(x: number, z: number, poly: V2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
