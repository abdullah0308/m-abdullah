/**
 * Builds the island's data once per visit: where the land is, how high it
 * is, where the roads run, where the buildings and trees stand, and the road
 * graph the GPS routes over. No three.js here; scene.ts turns this into
 * meshes. Generation yields between steps so the loading bar is real.
 */

import {
  ARROWS,
  CENTER,
  COAST,
  FORESTS,
  LAKES,
  MOUNTAINS,
  POIS,
  ROAD_DEFS,
  ROAD_WIDTH,
  RUNWAY,
  TOWNS,
  fbm,
  hash2,
  noise,
  resample,
  rng,
  spline,
  type PoiDef,
  type RoadKind,
  type V2,
} from "./geo";

export const X0 = -1750;
export const Z0 = -1900;
export const SPAN_X = 3500;
export const SPAN_Z = 3800;

/** Fine grid for distances (land/sea, roads). */
export const FC = 4;
export const FNX = SPAN_X / FC + 1;
export const FNZ = SPAN_Z / FC + 1;

/** Height grid, one vertex per cell corner of the terrain mesh. */
export const HC = 10;
export const HNX = SPAN_X / HC + 1;
export const HNZ = SPAN_Z / HC + 1;

export interface Road {
  name: string;
  kind: RoadKind;
  width: number;
  closed: boolean;
  pts: V2[];
}

export interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rot: number;
  color: number;
  glass: boolean;
}

export interface Graph {
  x: Float32Array;
  z: Float32Array;
  adj: number[][];
}

export interface Poi extends PoiDef {
  x: number;
  z: number;
  /** road heading at the marker, so the car can face along the road */
  heading: number;
}

export interface World {
  sdf: Float32Array;
  roadDist: Float32Array;
  heights: Float32Array;
  roads: Road[];
  buildings: Building[];
  palms: Float32Array; // x, z, scale, rot
  trees: Float32Array; // x, z, scale, rot
  lakes: { x: number; z: number; r: number; level: number }[];
  graph: Graph;
  pois: Poi[];
  arrows: { name: string; x: number; z: number }[];
  checkpoints: { x: number; z: number; heading: number }[];
  forestMask: Uint8Array;
  townMask: Uint8Array;
}

/* ── Sampling ──────────────────────────────────────────────────────────── */

function sampleFine(grid: Float32Array, x: number, z: number, outside: number) {
  const gx = (x - X0) / FC;
  const gz = (z - Z0) / FC;
  if (gx < 0 || gz < 0 || gx >= FNX - 1 || gz >= FNZ - 1) return outside;
  const ix = gx | 0;
  const iz = gz | 0;
  const fx = gx - ix;
  const fz = gz - iz;
  const i = iz * FNX + ix;
  const a = grid[i];
  const b = grid[i + 1];
  const c = grid[i + FNX];
  const d = grid[i + FNX + 1];
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

export const sdfAt = (w: Pick<World, "sdf">, x: number, z: number) => sampleFine(w.sdf, x, z, -400);
export const roadAt = (w: Pick<World, "roadDist">, x: number, z: number) => sampleFine(w.roadDist, x, z, 999);

export function heightAt(w: Pick<World, "heights">, x: number, z: number) {
  const gx = (x - X0) / HC;
  const gz = (z - Z0) / HC;
  if (gx < 0 || gz < 0 || gx >= HNX - 1 || gz >= HNZ - 1) return -12;
  const ix = gx | 0;
  const iz = gz | 0;
  const fx = gx - ix;
  const fz = gz - iz;
  const i = iz * HNX + ix;
  const h = w.heights;
  // Same split as the mesh: each quad is two triangles along the a-d diagonal.
  if (fx + fz <= 1) {
    const a = h[i];
    return a + (h[i + 1] - a) * fx + (h[i + HNX] - a) * fz;
  }
  const d = h[i + HNX + 1];
  return d + (h[i + HNX] - d) * (1 - fx) + (h[i + 1] - d) * (1 - fz);
}

/* ── Distance transform (Felzenszwalb and Huttenlocher) ────────────────── */

function edt(mask: Uint8Array, nx: number, nz: number): Float32Array {
  const INF = 1e20;
  const n = Math.max(nx, nz);
  const f = new Float64Array(n);
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const zz = new Float64Array(n + 1);
  const grid = new Float64Array(nx * nz);
  for (let i = 0; i < nx * nz; i++) grid[i] = mask[i] ? 0 : INF;

  const pass = (len: number) => {
    let k = 0;
    v[0] = 0;
    zz[0] = -INF;
    zz[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= zz[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      zz[k] = s;
      zz[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) {
      while (zz[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
  };

  for (let x = 0; x < nx; x++) {
    for (let z = 0; z < nz; z++) f[z] = grid[z * nx + x];
    pass(nz);
    for (let z = 0; z < nz; z++) grid[z * nx + x] = d[z];
  }
  for (let z = 0; z < nz; z++) {
    for (let x = 0; x < nx; x++) f[x] = grid[z * nx + x];
    pass(nx);
    for (let x = 0; x < nx; x++) grid[z * nx + x] = d[x];
  }
  const out = new Float32Array(nx * nz);
  for (let i = 0; i < nx * nz; i++) out[i] = Math.sqrt(grid[i]);
  return out;
}

/* ── Rasterising onto the fine grid ────────────────────────────────────── */

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.setTransform(1 / FC, 0, 0, 1 / FC, -X0 / FC, -Z0 / FC);
  return { c, ctx };
}

function readMask(ctx: CanvasRenderingContext2D, channel = 3, threshold = 127) {
  const data = ctx.getImageData(0, 0, FNX, FNZ).data;
  const out = new Uint8Array(FNX * FNZ);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + channel] > threshold ? 1 : 0;
  return out;
}

function readChannel(ctx: CanvasRenderingContext2D, channel: number) {
  const data = ctx.getImageData(0, 0, FNX, FNZ).data;
  const out = new Uint8Array(FNX * FNZ);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + channel];
  return out;
}

const path = (ctx: CanvasRenderingContext2D, pts: V2[], close: boolean) => {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
};

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ── Generation ────────────────────────────────────────────────────────── */

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export async function generate(progress: (p: number, label: string) => void): Promise<World> {
  progress(0.02, "Charting the coast");
  await tick();

  // Land and sea.
  const land = canvas(FNX, FNZ);
  land.ctx.fillStyle = "#fff";
  path(land.ctx, COAST, true);
  land.ctx.fill();
  const landMask = readMask(land.ctx);
  const seaMask = new Uint8Array(landMask.length);
  for (let i = 0; i < landMask.length; i++) seaMask[i] = landMask[i] ? 0 : 1;
  const toLand = edt(landMask, FNX, FNZ);
  const toSea = edt(seaMask, FNX, FNZ);
  const sdf = new Float32Array(landMask.length);
  for (let i = 0; i < sdf.length; i++) sdf[i] = landMask[i] ? (toSea[i] - 0.5) * FC : -(toLand[i] - 0.5) * FC;

  progress(0.14, "Laying the roads");
  await tick();

  // Roads: smooth, evenly spaced, and kept off the beach.
  const roads: Road[] = ROAD_DEFS.map((def) => {
    const closed = def.kind === "coast";
    const smooth = closed ? resample(def.pts, 4, true) : resample(spline(def.pts, 8, false), 4);
    return { name: def.name, kind: def.kind, width: ROAD_WIDTH[def.kind], closed, pts: smooth };
  });
  const s = { sdf };
  for (const road of roads) {
    for (let pass = 0; pass < 3; pass++) {
      road.pts = road.pts.map(([x, z]) => {
        let px = x;
        let pz = z;
        for (let k = 0; k < 40 && sdfAt(s, px, pz) < 20; k++) {
          const gx = sdfAt(s, px + 3, pz) - sdfAt(s, px - 3, pz);
          const gz = sdfAt(s, px, pz + 3) - sdfAt(s, px, pz - 3);
          const len = Math.hypot(gx, gz) || 1;
          px += (gx / len) * 2;
          pz += (gz / len) * 2;
        }
        return [px, pz] as V2;
      });
      // Relax the kinks the push leaves behind.
      const n = road.pts.length;
      road.pts = road.pts.map((p, i) => {
        if (!road.closed && (i === 0 || i === n - 1)) return p;
        const a = road.pts[(i - 1 + n) % n];
        const b = road.pts[(i + 1) % n];
        return [(a[0] + p[0] * 2 + b[0]) / 4, (a[1] + p[1] * 2 + b[1]) / 4] as V2;
      });
    }
    road.pts = resample(road.pts, 4, road.closed);
  }
  // A road that runs past the one it meets would double back to join it, and
  // a strip that doubles back draws as spikes. End each road where it comes
  // closest to another, near its ends.
  const nearestOther = (road: Road, x: number, z: number) => {
    let best = Infinity;
    for (const other of roads) {
      if (other === road) continue;
      for (let i = 0; i < other.pts.length; i += 2) {
        const d = Math.hypot(other.pts[i][0] - x, other.pts[i][1] - z);
        if (d < best) best = d;
      }
    }
    return best;
  };
  for (const road of roads) {
    if (road.closed) continue;
    for (const end of [0, 1]) {
      const pts = end === 0 ? road.pts : [...road.pts].reverse();
      let cut = -1;
      let cutD = 16;
      const reach = Math.min(60, Math.floor(pts.length / 3));
      for (let i = 0; i < reach; i++) {
        const d = nearestOther(road, pts[i][0], pts[i][1]);
        if (d < cutD) {
          cutD = d;
          cut = i;
        }
      }
      if (cut > 0) pts.splice(0, cut);
      road.pts = end === 0 ? pts : pts.reverse();
    }
  }
  // Join every loose end to the nearest other road, so nothing stops short.
  for (const road of roads) {
    if (road.closed) continue;
    for (const end of [0, 1]) {
      const p = end === 0 ? road.pts[0] : road.pts[road.pts.length - 1];
      let best: V2 | null = null;
      let bestD = 90;
      for (const other of roads) {
        if (other === road) continue;
        for (const q of other.pts) {
          const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
          if (d < bestD) {
            bestD = d;
            best = q;
          }
        }
      }
      if (best && bestD > 1.5) {
        const join = resample([p, best], 4).slice(1);
        if (end === 0) road.pts = [...join.reverse(), ...road.pts];
        else road.pts = [...road.pts, ...join];
      }
    }
  }

  const roadCanvas = canvas(FNX, FNZ);
  roadCanvas.ctx.strokeStyle = "#fff";
  roadCanvas.ctx.lineCap = "round";
  roadCanvas.ctx.lineJoin = "round";
  for (const road of roads) {
    roadCanvas.ctx.lineWidth = road.width;
    path(roadCanvas.ctx, road.pts, road.closed);
    roadCanvas.ctx.stroke();
  }
  const [rx, rz] = RUNWAY.at;
  roadCanvas.ctx.save();
  roadCanvas.ctx.translate(rx, rz);
  roadCanvas.ctx.rotate(RUNWAY.angle);
  roadCanvas.ctx.fillStyle = "#fff";
  roadCanvas.ctx.fillRect(-RUNWAY.length / 2, -RUNWAY.width / 2, RUNWAY.length, RUNWAY.width);
  roadCanvas.ctx.restore();
  const roadDist = edt(readMask(roadCanvas.ctx), FNX, FNZ);
  for (let i = 0; i < roadDist.length; i++) roadDist[i] *= FC;

  progress(0.26, "Raising the mountains");
  await tick();

  // Forests and towns, as masks.
  const masks = canvas(FNX, FNZ);
  masks.ctx.fillStyle = "rgb(255,0,0)";
  for (const poly of FORESTS) {
    path(masks.ctx, spline(poly, 6, true), true);
    masks.ctx.fill();
  }
  masks.ctx.globalCompositeOperation = "lighter";
  for (const t of TOWNS) {
    const g = masks.ctx.createRadialGradient(t.at[0], t.at[1], 0, t.at[0], t.at[1], t.r * 1.25);
    g.addColorStop(0, "rgba(0,255,0,1)");
    g.addColorStop(0.6, "rgba(0,200,0,1)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    masks.ctx.fillStyle = g;
    masks.ctx.beginPath();
    masks.ctx.arc(t.at[0], t.at[1], t.r * 1.25, 0, Math.PI * 2);
    masks.ctx.fill();
  }
  const forestMask = readChannel(masks.ctx, 0);
  const townMask = readChannel(masks.ctx, 1);

  // Heights.
  const heights = new Float32Array(HNX * HNZ);
  const [px, pz] = [CENTER[0] - 120, CENTER[1] + 280];
  const lakes = LAKES.map((l) => ({ x: l.at[0], z: l.at[1], r: l.r, level: 0 }));
  const groundAt = (x: number, z: number, d: number) => {
    const inland = Math.max(0, d);
    let base = 0.3 + 1.1 * smoothstep(0, 24, inland) + 24 * Math.pow(smoothstep(18, 1000, inland), 0.85);
    base += 15 * Math.exp(-((x - px) ** 2 + (z - pz) ** 2) / (720 * 720));
    const hills = (fbm(x / 240 + 11, z / 240 + 3, 3) - 0.45) * 15 * smoothstep(30, 240, inland);
    return base + Math.max(hills, -4);
  };
  const mountainAt = (x: number, z: number) => {
    let m = 0;
    for (const mt of MOUNTAINS) {
      const dx = x - mt.at[0];
      const dz = z - mt.at[1];
      const reach = mt.r * (mt.stretch ?? 1) * 1.7;
      if (Math.abs(dx) > reach || Math.abs(dz) > reach) continue;
      const wobble = 1 + 0.28 * (noise(x / 38 + mt.r, z / 38) - 0.5);
      let q: number;
      if (mt.kind === "ridge") {
        const a = mt.angle ?? 0;
        const u = dx * Math.cos(a) + dz * Math.sin(a);
        const v = -dx * Math.sin(a) + dz * Math.cos(a);
        q = Math.hypot(u / (mt.r * (mt.stretch ?? 2)), v / mt.r) * wobble;
        m = Math.max(m, mt.h * Math.exp(-q * q * 2.4) * (0.7 + 0.6 * noise(u / 60, mt.r)));
      } else if (mt.kind === "mesa") {
        q = (Math.hypot(dx, dz) / mt.r) * wobble;
        m = Math.max(m, mt.h * Math.pow(smoothstep(1, 0.55, q), 0.8) * (0.92 + 0.08 * noise(x / 20, z / 20)));
      } else {
        q = (Math.hypot(dx, dz) / mt.r) * wobble;
        m = Math.max(m, mt.h * Math.exp(-q * q * 2.6));
      }
    }
    if (m > 0) m *= 0.82 + 0.36 * fbm(x / 26, z / 26, 3);
    return m;
  };

  for (let iz = 0; iz < HNZ; iz++) {
    const z = Z0 + iz * HC;
    for (let ix = 0; ix < HNX; ix++) {
      const x = X0 + ix * HC;
      const d = sdfAt(s, x, z);
      let h: number;
      if (d < 0) {
        h = -1.2 - Math.min(-d, 320) * 0.05;
      } else {
        const ground = groundAt(x, z, d);
        h = ground + mountainAt(x, z) * smoothstep(10, 120, d);
        const road = sampleFine(roadDist, x, z, 999);
        const flat = 1 - smoothstep(8, 34, road);
        h = h + (ground - h) * flat;
        if (d < 30) h = Math.min(h, 0.25 + d * 0.07);
      }
      heights[iz * HNX + ix] = h;
    }
    if (iz % 60 === 0) {
      progress(0.26 + (iz / HNZ) * 0.3, "Raising the mountains");
      await tick();
    }
  }

  // Lakes sit in a hollow a little below the ground around them.
  for (const lake of lakes) {
    lake.level = groundAt(lake.x, lake.z, sdfAt(s, lake.x, lake.z)) - 1.2;
    const reach = lake.r * 2;
    for (let iz = Math.floor((lake.z - reach - Z0) / HC); iz <= Math.ceil((lake.z + reach - Z0) / HC); iz++) {
      for (let ix = Math.floor((lake.x - reach - X0) / HC); ix <= Math.ceil((lake.x + reach - X0) / HC); ix++) {
        if (ix < 0 || iz < 0 || ix >= HNX || iz >= HNZ) continue;
        const x = X0 + ix * HC;
        const z = Z0 + iz * HC;
        const q = Math.hypot(x - lake.x, z - lake.z) / lake.r;
        const i = iz * HNX + ix;
        if (q < 1) heights[i] = lake.level - 0.6 - 3 * (1 - q);
        else if (q < 2) heights[i] = Math.max(heights[i] * smoothstep(1, 2, q) + (lake.level + 0.5) * (1 - smoothstep(1, 2, q)), lake.level + 0.3);
      }
    }
  }

  progress(0.6, "Building the towns");
  await tick();

  const world: World = {
    sdf,
    roadDist,
    heights,
    roads,
    buildings: [],
    palms: new Float32Array(0),
    trees: new Float32Array(0),
    lakes,
    graph: { x: new Float32Array(0), z: new Float32Array(0), adj: [] },
    pois: [],
    arrows: [],
    checkpoints: [],
    forestMask,
    townMask,
  };

  world.buildings = placeBuildings(world);

  progress(0.7, "Planting the palms");
  await tick();
  const { palms, trees } = placeTrees(world);
  world.palms = palms;
  world.trees = trees;

  progress(0.78, "Mapping the routes");
  await tick();
  world.graph = buildGraph(roads);
  world.pois = POIS.map((p) => snapPoi(world, p));
  world.arrows = ARROWS.map((a) => {
    let [x, z] = a.at;
    for (let k = 0; k < 60 && sdfAt(world, x, z) < 26; k++) {
      x += (CENTER[0] - x) * 0.02;
      z += (CENTER[1] - z) * 0.02;
    }
    return { name: a.name, x, z };
  });
  world.checkpoints = raceCheckpoints(world);
  return world;
}

/* ── Towns ─────────────────────────────────────────────────────────────── */

const ROOFS = [0xe9e2d6, 0xd9cdb8, 0xc87f5a, 0xb9b2a6, 0xe6d1a8, 0xd6a36f, 0xa9b4b8, 0xf0ede6, 0xc9b79c, 0x9e8f7e];

function placeBuildings(w: World): Building[] {
  const out: Building[] = [];
  const rand = rng(42);
  const cell = 24;
  const grid = new Map<number, number[]>();
  const key = (x: number, z: number) => Math.floor(x / cell) * 10007 + Math.floor(z / cell);
  const overlaps = (b: Building) => {
    const r = Math.max(b.w, b.d) * 0.75 + 2.5;
    for (let gx = -1; gx <= 1; gx++)
      for (let gz = -1; gz <= 1; gz++) {
        const list = grid.get(key(b.x + gx * cell, b.z + gz * cell));
        if (!list) continue;
        for (const j of list) {
          const o = out[j];
          if (Math.hypot(o.x - b.x, o.z - b.z) < r + Math.max(o.w, o.d) * 0.75) return true;
        }
      }
    return false;
  };

  for (const t of TOWNS) {
    const count = Math.round((Math.PI * t.r * t.r * t.density) / 1000);
    const angle = rand() * Math.PI;
    let placed = 0;
    for (let k = 0; k < count * 4 && count > 0; k++) {
      const a = rand() * Math.PI * 2;
      const rr = t.r * Math.sqrt(rand()) * (0.25 + 0.75 * rand() + 0.2);
      const x = t.at[0] + Math.cos(a) * rr;
      const z = t.at[1] + Math.sin(a) * rr;
      const core = 1 - Math.min(1, rr / t.r);
      let bw: number;
      let bd: number;
      let bh: number;
      let glass = false;
      if (t.towers && core > 0.15) {
        bw = 10 + rand() * 8;
        bd = 10 + rand() * 8;
        bh = 22 + rand() * 38 * core;
        glass = true;
      } else {
        bw = 6 + rand() * 9;
        bd = 6 + rand() * 9;
        bh = 3.5 + rand() * 4 + (t.tall ?? 8) * core * core * rand();
        if (t.name === "Port Louis" && core > 0.55 && rand() > 0.6) {
          bh = 16 + rand() * 22;
          glass = rand() > 0.4;
        }
      }
      const d = sdfAt(w, x, z);
      if (d < 18) continue;
      const road = roadAt(w, x, z);
      if (road < Math.max(bw, bd) * 0.72 + 6) continue;
      const h0 = heightAt(w, x - bw / 2, z - bd / 2);
      const h1 = heightAt(w, x + bw / 2, z + bd / 2);
      if (Math.abs(h0 - h1) > 4) continue;
      const b: Building = {
        x,
        z,
        w: bw,
        d: bd,
        h: bh,
        rot: angle + (rand() > 0.85 ? rand() * 0.6 : 0),
        color: glass ? (rand() > 0.5 ? 0x8fb2c4 : 0x6f8fa6) : ROOFS[(rand() * ROOFS.length) | 0],
        glass,
      };
      if (overlaps(b)) continue;
      const i = out.push(b) - 1;
      const kk = key(x, z);
      (grid.get(kk) ?? grid.set(kk, []).get(kk)!).push(i);
      if (++placed >= count) break;
    }
  }
  return out;
}

/* ── Palms and trees ───────────────────────────────────────────────────── */

function placeTrees(w: World) {
  const rand = rng(99);
  const palms: number[] = [];
  const trees: number[] = [];
  const near = (list: number[], x: number, z: number, r: number) => {
    for (let i = Math.max(0, list.length - 160); i < list.length; i += 4) if (Math.hypot(list[i] - x, list[i + 1] - z) < r) return true;
    return false;
  };
  for (let k = 0; k < 90000 && palms.length < 2600 * 4; k++) {
    const x = X0 + rand() * SPAN_X;
    const z = Z0 + rand() * SPAN_Z;
    const d = sdfAt(w, x, z);
    if (d < 6 || d > 70) continue;
    if (roadAt(w, x, z) < 9) continue;
    if (fbm(x / 90, z / 90, 2) < 0.42) continue;
    if (near(palms, x, z, 5)) continue;
    palms.push(x, z, 0.75 + rand() * 0.55, rand() * Math.PI * 2);
  }
  for (let k = 0; k < 160000 && trees.length < 5200 * 4; k++) {
    const x = X0 + rand() * SPAN_X;
    const z = Z0 + rand() * SPAN_Z;
    const d = sdfAt(w, x, z);
    if (d < 40) continue;
    if (roadAt(w, x, z) < 10) continue;
    const gx = Math.round((x - X0) / FC);
    const gz = Math.round((z - Z0) / FC);
    const forest = w.forestMask[gz * FNX + gx] > 127;
    const town = w.townMask[gz * FNX + gx] > 60;
    const h = heightAt(w, x, z);
    const slope = Math.abs(heightAt(w, x + 4, z) - heightAt(w, x - 4, z)) + Math.abs(heightAt(w, x, z + 4) - heightAt(w, x, z - 4));
    const mountain = h > 42 && slope < 9;
    const scatter = !town && hash2(Math.floor(x / 70), Math.floor(z / 70)) > 0.86;
    if (!forest && !mountain && !scatter) continue;
    if (town) continue;
    trees.push(x, z, 0.8 + rand() * 0.8, rand() * Math.PI * 2);
  }
  return { palms: new Float32Array(palms), trees: new Float32Array(trees) };
}

/* ── The road graph ────────────────────────────────────────────────────── */

function buildGraph(roads: Road[]): Graph {
  const xs: number[] = [];
  const zs: number[] = [];
  const adj: number[][] = [];
  const owner: number[] = [];
  const link = (a: number, b: number) => {
    if (a === b || adj[a].includes(b)) return;
    adj[a].push(b);
    adj[b].push(a);
  };
  roads.forEach((road, r) => {
    const pts = resample(road.pts, 8, road.closed);
    const first = xs.length;
    pts.forEach(([x, z], i) => {
      xs.push(x);
      zs.push(z);
      adj.push([]);
      owner.push(r);
      if (i > 0) link(first + i - 1, first + i);
    });
    if (road.closed) link(first, xs.length - 1);
  });
  // Junctions: nodes of different roads that touch.
  const cell = 12;
  const grid = new Map<number, number[]>();
  const key = (x: number, z: number) => Math.floor(x / cell) * 10007 + Math.floor(z / cell);
  xs.forEach((x, i) => {
    const k = key(x, zs[i]);
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(i);
  });
  xs.forEach((x, i) => {
    for (let gx = -1; gx <= 1; gx++)
      for (let gz = -1; gz <= 1; gz++) {
        const list = grid.get(key(x + gx * cell, zs[i] + gz * cell));
        if (!list) continue;
        for (const j of list) if (owner[j] !== owner[i] && Math.hypot(xs[j] - x, zs[j] - zs[i]) < 9) link(i, j);
      }
  });
  return { x: new Float32Array(xs), z: new Float32Array(zs), adj };
}

export function nearestNode(g: Graph, x: number, z: number) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < g.x.length; i++) {
    const d = (g.x[i] - x) ** 2 + (g.z[i] - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** A* over the road graph. Returns node indices from start to goal. */
export function route(g: Graph, start: number, goal: number): number[] {
  const n = g.x.length;
  const cost = new Float32Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap: [number, number][] = [];
  const push = (f: number, i: number) => {
    heap.push([f, i]);
    let c = heap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (heap[p][0] <= heap[c][0]) break;
      [heap[p], heap[c]] = [heap[c], heap[p]];
      c = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        const r = l + 1;
        let m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };
  const hx = g.x[goal];
  const hz = g.z[goal];
  cost[start] = 0;
  push(0, start);
  while (heap.length) {
    const [, i] = pop();
    if (i === goal) break;
    for (const j of g.adj[i]) {
      const c = cost[i] + Math.hypot(g.x[j] - g.x[i], g.z[j] - g.z[i]);
      if (c < cost[j]) {
        cost[j] = c;
        prev[j] = i;
        push(c + Math.hypot(hx - g.x[j], hz - g.z[j]), j);
      }
    }
  }
  if (prev[goal] === -1 && goal !== start) return [];
  const out: number[] = [];
  for (let i = goal; i !== -1; i = prev[i]) out.push(i);
  return out.reverse();
}

function snapPoi(w: World, p: PoiDef): Poi {
  // Sit beside the nearest road, so the GPS can bring you to the door.
  const i = nearestNode(w.graph, p.at[0], p.at[1]);
  const j = w.graph.adj[i][0] ?? i;
  const heading = Math.atan2(w.graph.x[j] - w.graph.x[i], w.graph.z[j] - w.graph.z[i]);
  return { ...p, x: w.graph.x[i], z: w.graph.z[i], heading };
}

/** Five checkpoints along the west coast, Flic en Flac to Le Morne. */
function raceCheckpoints(w: World) {
  const coast = w.roads.find((r) => r.kind === "coast")!;
  const start = w.pois.find((p) => p.kind === "race")!;
  const near = (x: number, z: number) => {
    let best = 0;
    let bestD = Infinity;
    coast.pts.forEach(([px, pz], i) => {
      const d = Math.hypot(px - x, pz - z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  };
  const a = near(start.x, start.z);
  const [lx, lz] = [-1080, 1010]; // the base of Le Morne
  const b = near(lx, lz);
  const n = coast.pts.length;
  // Walk whichever way round is shorter.
  const forward = (b - a + n) % n;
  const backward = (a - b + n) % n;
  const dir = forward < backward ? 1 : -1;
  const steps = Math.min(forward, backward);
  const out: { x: number; z: number; heading: number }[] = [];
  for (let k = 1; k <= 5; k++) {
    const i = (a + dir * Math.round((steps * k) / 5) + n * 4) % n;
    const j = (i + dir + n) % n;
    const [x, z] = coast.pts[i];
    out.push({ x, z, heading: Math.atan2(coast.pts[j][0] - x, coast.pts[j][1] - z) });
  }
  return out;
}
