/**
 * Turns the island's data into three.js meshes: terrain with a painted
 * ground texture, a lagoon-and-reef water shader, roads, buildings whose
 * windows light up after dark, palms, forest, the place markers, the golden
 * arrows, race rings, the GPS line and the car. All geometry is made here
 * from primitives; nothing is loaded from disk.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RUNWAY, hash2, noise, rng, type PoiKind } from "./geo";
import {
  FC,
  FNX,
  FNZ,
  HC,
  HNX,
  HNZ,
  SPAN_X,
  SPAN_Z,
  X0,
  Z0,
  heightAt,
  roadAt,
  sdfAt,
  type World,
} from "./world";

export const KIND_COLOR: Record<PoiKind, string> = {
  about: "#f1a35a",
  project: "#ff5c9a",
  garage: "#4fd2ff",
  race: "#ffd84a",
  range: "#86ea66",
  contact: "#b98bff",
};

/* ── Terrain ───────────────────────────────────────────────────────────── */

const TW = 1750;
const TH = 1900;

function paintGround(w: World): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TW;
  c.height = TH;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(TW, TH);
  const px = img.data;

  // Slope per height vertex, sampled nearest.
  const slope = new Float32Array(HNX * HNZ);
  for (let iz = 1; iz < HNZ - 1; iz++)
    for (let ix = 1; ix < HNX - 1; ix++) {
      const i = iz * HNX + ix;
      const gx = (w.heights[i + 1] - w.heights[i - 1]) / (2 * HC);
      const gz = (w.heights[i + HNX] - w.heights[i - HNX]) / (2 * HC);
      slope[i] = Math.hypot(gx, gz);
    }

  // A small tile of noise, looked up instead of computed per texel.
  const NT = 256;
  const tile = new Float32Array(NT * NT);
  for (let y = 0; y < NT; y++) for (let x = 0; x < NT; x++) tile[y * NT + x] = noise(x / 9, y / 9) * 0.6 + noise(x / 3.1, y / 3.1) * 0.4;
  const tn = (x: number, z: number) => tile[((z | 0) & (NT - 1)) * NT + ((x | 0) & (NT - 1))];

  const sx = SPAN_X / TW;
  const sz = SPAN_Z / TH;
  let o = 0;
  for (let ty = 0; ty < TH; ty++) {
    const z = Z0 + (ty + 0.5) * sz;
    const fz = Math.min(FNZ - 1, Math.round((z - Z0) / FC));
    const hz = Math.min(HNZ - 1, Math.round((z - Z0) / HC));
    for (let tx = 0; tx < TW; tx++, o += 4) {
      const x = X0 + (tx + 0.5) * sx;
      const fx = Math.min(FNX - 1, Math.round((x - X0) / FC));
      const fi = fz * FNX + fx;
      const d = sdfAt(w, x, z);
      const n1 = tn(x / 1.6, z / 1.6);
      const n2 = tn(x / 7 + 100, z / 7 + 50);
      let r: number;
      let g: number;
      let b: number;
      if (d < 10 + n2 * 7) {
        // Sand: wet and darker at the waterline.
        const wet = Math.max(0, 1 - Math.max(0, d) / 3.5);
        const k = 0.93 + n1 * 0.12;
        r = (238 - wet * 52) * k;
        g = (220 - wet * 50) * k;
        b = (176 - wet * 44) * k;
      } else {
        const h = heightAt(w, x, z);
        const s = slope[Math.min(HNZ - 1, hz) * HNX + Math.min(HNX - 1, Math.round((x - X0) / HC))];
        const forest = w.forestMask[fi] / 255;
        const town = w.townMask[fi] / 255;
        // Grass.
        r = 104 + n2 * 34;
        g = 140 + n2 * 26;
        b = 58 + n2 * 12;
        // Sugar cane: fields in bent rows, a few already cut.
        const farm = (1 - Math.min(1, town * 1.6)) * (1 - forest) * (s < 0.45 ? 1 : 0) * (h < 44 ? 1 : 0) * (d > 34 ? 1 : 0);
        if (farm > 0) {
          const a = (noise(x / 1300, z / 1300) - 0.5) * 3.4;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const u = x * ca + z * sa;
          const v = -x * sa + z * ca;
          const cu = Math.floor(u / 62);
          const cv = Math.floor(v / 42);
          const fu = u / 62 - cu;
          const fv = v / 42 - cv;
          const kind = hash2(cu + 3, cv + 7);
          let fr: number;
          let fg: number;
          let fb: number;
          if (fu < 0.04 || fv < 0.06) {
            fr = 150;
            fg = 136;
            fb = 98;
          } else if (kind < 0.16) {
            const row = Math.sin(v * 2.4) > 0 ? 1 : 0.9;
            fr = 182 * row;
            fg = 156 * row;
            fb = 104 * row;
          } else if (kind < 0.86) {
            const row = Math.sin(v * 2.6) > 0 ? 1 : 0.86;
            const young = hash2(cu + 11, cv - 4);
            fr = (128 + young * 44) * row;
            fg = (166 + young * 26) * row;
            fb = (62 + young * 30) * row;
          } else {
            fr = 112 + n2 * 20;
            fg = 146 + n2 * 20;
            fb = 66;
          }
          r += (fr - r) * farm;
          g += (fg - g) * farm;
          b += (fb - b) * farm;
        }
        // Forest, mottled.
        const f = Math.min(1, forest * (0.75 + n1 * 0.5));
        if (f > 0) {
          r += (34 + n1 * 26 - r) * f;
          g += (70 + n1 * 34 - g) * f;
          b += (36 + n1 * 14 - b) * f;
        }
        // Mountainsides: dark green, then rock.
        const high = Math.min(1, Math.max(0, (h - 34) / 30));
        if (high > 0) {
          r += (52 - r) * high * 0.7;
          g += (88 - g) * high * 0.7;
          b += (48 - b) * high * 0.7;
        }
        const rock = Math.min(1, Math.max(0, (s - 0.75) / 0.8));
        if (rock > 0) {
          const k = 0.85 + n1 * 0.3;
          r += (112 * k - r) * rock;
          g += (104 * k - g) * rock;
          b += (92 * k - b) * rock;
        }
        // Town ground.
        const t = Math.min(1, town * 1.3) * 0.85;
        if (t > 0) {
          const k = 0.86 + n1 * 0.22;
          r += (118 * k - r) * t;
          g += (116 * k - g) * t;
          b += (112 * k - b) * t;
        }
        // Dusty verges either side of the roads.
        const road = w.roadDist[fi];
        if (road < 9) {
          const v = (1 - road / 9) * 0.75;
          r += (150 - r) * v;
          g += (134 - g) * v;
          b += (104 - b) * v;
        }
      }
      px[o] = r;
      px[o + 1] = g;
      px[o + 2] = b;
      px[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function terrainMesh(w: World, maxAniso: number) {
  const pos = new Float32Array(HNX * HNZ * 3);
  const uv = new Float32Array(HNX * HNZ * 2);
  for (let iz = 0; iz < HNZ; iz++)
    for (let ix = 0; ix < HNX; ix++) {
      const i = iz * HNX + ix;
      pos[i * 3] = X0 + ix * HC;
      pos[i * 3 + 1] = w.heights[i];
      pos[i * 3 + 2] = Z0 + iz * HC;
      uv[i * 2] = ix / (HNX - 1);
      uv[i * 2 + 1] = 1 - iz / (HNZ - 1);
    }
  const idx = new Uint32Array((HNX - 1) * (HNZ - 1) * 6);
  let k = 0;
  for (let iz = 0; iz < HNZ - 1; iz++)
    for (let ix = 0; ix < HNX - 1; ix++) {
      const a = iz * HNX + ix;
      const b = a + 1;
      const c = a + HNX;
      const d = c + 1;
      // Split along b-c, matching heightAt.
      idx[k++] = a;
      idx[k++] = c;
      idx[k++] = b;
      idx[k++] = b;
      idx[k++] = c;
      idx[k++] = d;
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();

  const tex = new THREE.CanvasTexture(paintGround(w));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.93, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWP;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vWP;
float gh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gn(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(gh(i), gh(i+vec2(1,0)), f.x), mix(gh(i+vec2(0,1)), gh(i+vec2(1,1)), f.x), f.y); }`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
diffuseColor.rgb *= 0.84 + 0.2 * gn(vWP.xz * 0.9) + 0.1 * gn(vWP.xz * 0.21);`,
      );
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

/* ── Water ─────────────────────────────────────────────────────────────── */

export interface WaterUniforms {
  time: { value: number };
  sunDir: { value: THREE.Vector3 };
  sunColor: { value: THREE.Color };
  skyColor: { value: THREE.Color };
  horizonColor: { value: THREE.Color };
  fogColor: { value: THREE.Color };
  fogDensity: { value: number };
  light: { value: number };
  night: { value: number };
}

function waterMesh(w: World): { mesh: THREE.Mesh; uniforms: WaterUniforms } {
  // Distance to the coast, packed into a byte texture: 0 is 200 units out to sea, 255 is 55 inland.
  const data = new Uint8Array(FNX * FNZ);
  for (let i = 0; i < data.length; i++) data[i] = Math.max(0, Math.min(255, ((w.sdf[i] + 200) / 255) * 255));
  const sdfTex = new THREE.DataTexture(data, FNX, FNZ, THREE.RedFormat, THREE.UnsignedByteType);
  sdfTex.magFilter = THREE.LinearFilter;
  sdfTex.minFilter = THREE.LinearFilter;
  sdfTex.needsUpdate = true;

  const uniforms: WaterUniforms & Record<string, { value: unknown }> = {
    time: { value: 0 },
    sunDir: { value: new THREE.Vector3(0, 1, 0) },
    sunColor: { value: new THREE.Color(1, 0.8, 0.6) },
    skyColor: { value: new THREE.Color(0.3, 0.5, 0.8) },
    horizonColor: { value: new THREE.Color(1, 0.7, 0.5) },
    fogColor: { value: new THREE.Color(1, 0.7, 0.5) },
    fogDensity: { value: 0.0005 },
    light: { value: 1 },
    night: { value: 0 },
    sdfTex: { value: sdfTex },
    dom: { value: new THREE.Vector4(X0, Z0, SPAN_X, SPAN_Z) },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vW;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vW = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float time, fogDensity, light, night;
      uniform vec3 sunDir, sunColor, skyColor, horizonColor, fogColor;
      uniform sampler2D sdfTex;
      uniform vec4 dom;
      varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      float waves(vec2 p){
        float t = time;
        return n(p*0.09 + vec2(t*0.11, t*0.07)) * 0.5 + n(p*0.23 - vec2(t*0.19, -t*0.13)) * 0.3 + n(p*0.6 + vec2(t*0.4, t*0.31)) * 0.2;
      }
      void main(){
        vec2 uv = (vW.xz - dom.xy) / dom.zw;
        float d = -200.0;
        if (uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0) d = texture2D(sdfTex, uv).r * 255.0 - 200.0;
        float off = -d; // distance out to sea

        vec3 shallow = vec3(0.42, 0.86, 0.78);
        vec3 lagoon = vec3(0.07, 0.6, 0.62);
        vec3 mid = vec3(0.02, 0.32, 0.46);
        vec3 deep = vec3(0.01, 0.12, 0.24);
        vec3 col = mix(shallow, lagoon, smoothstep(0.0, 22.0, off));
        col = mix(col, mid, smoothstep(58.0, 78.0, off));
        col = mix(col, deep, smoothstep(85.0, 190.0, off));

        float e = 0.6;
        float w0 = waves(vW.xz);
        vec3 nrm = normalize(vec3((waves(vW.xz - vec2(e, 0.0)) - w0) * 2.2, 1.0, (waves(vW.xz - vec2(0.0, e)) - w0) * 2.2));
        float calm = smoothstep(80.0, 20.0, off);
        nrm = normalize(mix(nrm, vec3(0.0, 1.0, 0.0), calm * 0.55));

        vec3 V = normalize(cameraPosition - vW);
        float fres = 0.03 + 0.97 * pow(1.0 - max(dot(nrm, V), 0.0), 5.0);
        vec3 R = reflect(-V, nrm);
        vec3 refl = mix(horizonColor, skyColor, smoothstep(0.0, 0.5, R.y));
        float sunUp = smoothstep(-0.08, 0.08, sunDir.y);
        col *= mix(0.12, 1.0, light);
        col = mix(col, refl, fres * (0.55 + 0.35 * smoothstep(60.0, 160.0, off)));
        vec3 H = normalize(sunDir + V);
        float spec = pow(max(dot(nrm, H), 0.0), 420.0) * 9.0 + pow(max(dot(nrm, H), 0.0), 60.0) * 0.25;
        col += sunColor * spec * sunUp;

        // Surf on the reef, and the lap of water on the sand.
        float reef = exp(-pow((off - 68.0) / 5.0, 2.0)) * (0.35 + 0.65 * n(vW.xz * 0.12 + vec2(time * 0.5, 0.0)));
        reef *= 0.55 + 0.45 * sin(time * 1.3 + vW.x * 0.02 + vW.z * 0.015);
        float lap = off - (1.4 + 1.2 * sin(time * 0.9 + n(vW.xz * 0.05) * 6.0));
        float shore = exp(-pow(lap / 1.6, 2.0)) * smoothstep(-6.0, 0.0, off);
        float foam = clamp(reef * 0.8 + shore * 0.75, 0.0, 1.0);
        col = mix(col, vec3(0.95, 0.97, 0.98) * mix(0.15, 1.0, light), foam);

        float fd = length(cameraPosition - vW);
        float fog = 1.0 - exp(-fogDensity * fogDensity * fd * fd);
        col = mix(col, fogColor, fog);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const geo = new THREE.PlaneGeometry(26000, 26000, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0;
  return { mesh, uniforms };
}

/* ── Roads ─────────────────────────────────────────────────────────────── */

function roadTexture(kind: "motorway" | "road" | "runway", maxAniso: number) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = kind === "runway" ? "#3a3b3f" : "#2f3034";
  ctx.fillRect(0, 0, 128, 512);
  const rand = rng(kind.length);
  for (let i = 0; i < 2600; i++) {
    const v = 30 + rand() * 40;
    ctx.fillStyle = `rgba(${v},${v},${v + 4},0.5)`;
    ctx.fillRect(rand() * 128, rand() * 512, 1.5, 1.5);
  }
  const line = (x: number, wdt: number, color: string, dash?: [number, number]) => {
    ctx.fillStyle = color;
    if (!dash) ctx.fillRect(x - wdt / 2, 0, wdt, 512);
    else for (let y = 0; y < 512; y += dash[0] + dash[1]) ctx.fillRect(x - wdt / 2, y, wdt, dash[0]);
  };
  if (kind === "motorway") {
    line(7, 3, "#e9e6dc");
    line(121, 3, "#e9e6dc");
    line(61, 2.5, "#e8b84a");
    line(67, 2.5, "#e8b84a");
    line(34, 2, "#e9e6dc", [70, 58]);
    line(94, 2, "#e9e6dc", [70, 58]);
  } else if (kind === "road") {
    line(8, 3, "#dcd8cc");
    line(120, 3, "#dcd8cc");
    line(64, 3, "#ece8dc", [90, 90]);
  } else {
    line(64, 4, "#f2f0ea", [110, 90]);
    line(6, 3, "#f2f0ea");
    line(122, 3, "#f2f0ea");
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  return tex;
}

/** A strip that follows the ground, three vertices across. */
export function ribbon(
  w: World,
  pts: [number, number][],
  width: number,
  lift: number,
  closed: boolean,
  repeat: number,
): THREE.BufferGeometry {
  const n = pts.length;
  const rows = closed ? n + 1 : n;
  const pos = new Float32Array(rows * 3 * 3);
  const uv = new Float32Array(rows * 3 * 2);
  let along = 0;
  for (let r = 0; r < rows; r++) {
    const i = r % n;
    const p = pts[i];
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    if (r > 0) {
      const q = pts[(r - 1) % n];
      along += Math.hypot(p[0] - q[0], p[1] - q[1]);
    }
    let tx = b[0] - a[0];
    let tz = b[1] - a[1];
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const nx = -tz;
    const nz = tx;
    for (let k = 0; k < 3; k++) {
      const s = (k - 1) * 0.5 * width;
      const x = p[0] + nx * s;
      const z = p[1] + nz * s;
      const o = (r * 3 + k) * 3;
      pos[o] = x;
      pos[o + 1] = Math.max(heightAt(w, x, z), heightAt(w, p[0], p[1]) - 0.4) + lift;
      pos[o + 2] = z;
      uv[(r * 3 + k) * 2] = k / 2;
      uv[(r * 3 + k) * 2 + 1] = along / repeat;
    }
  }
  const idx: number[] = [];
  for (let r = 0; r < rows - 1; r++)
    for (let k = 0; k < 2; k++) {
      const a = r * 3 + k;
      const b = a + 1;
      const c = a + 3;
      const d = c + 1;
      // Vertices run right to left across the road, so this order faces up.
      idx.push(a, b, c, b, d, c);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function roadMeshes(w: World, maxAniso: number) {
  const group = new THREE.Group();
  const texM = roadTexture("motorway", maxAniso);
  const texR = roadTexture("road", maxAniso);
  const mk = (tex: THREE.Texture, offset: number) =>
    new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.82,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2 - offset,
      polygonOffsetUnits: -4 - offset * 2,
    });
  w.roads.forEach((road, i) => {
    const geo = ribbon(w, road.pts, road.width, 0.18 + (i % 3) * 0.02, road.closed, road.kind === "motorway" ? 26 : 22);
    const mesh = new THREE.Mesh(geo, mk(road.kind === "motorway" ? texM : texR, i % 3));
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  // The runway at Plaisance.
  const [rx, rz] = RUNWAY.at;
  const ca = Math.cos(RUNWAY.angle);
  const sa = Math.sin(RUNWAY.angle);
  const pts: [number, number][] = [];
  for (let s = -RUNWAY.length / 2; s <= RUNWAY.length / 2; s += 4) pts.push([rx + ca * s, rz + sa * s]);
  const rmesh = new THREE.Mesh(ribbon(w, pts, RUNWAY.width, 0.16, false, 30), mk(roadTexture("runway", maxAniso), 0));
  rmesh.receiveShadow = true;
  group.add(rmesh);
  return group;
}

/* ── Buildings ─────────────────────────────────────────────────────────── */

export interface NightUniform {
  value: number;
}

function windowShader(mat: THREE.MeshStandardMaterial, night: NightUniform, glass: boolean) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = night;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;\nvarying float vSeed;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
mat4 gwm = modelMatrix * instanceMatrix;
vWP = (gwm * vec4(transformed, 1.0)).xyz;
vWN = normalize(mat3(gwm) * normal);
vSeed = gwm[3][0] * 0.137 + gwm[3][2] * 0.071;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uNight;
varying vec3 vWP;
varying vec3 vWN;
varying float vSeed;
float wh(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float wall = 1.0 - step(0.6, abs(vWN.y));
vec2 tg = normalize(vec2(-vWN.z, vWN.x) + 1e-5);
float along = dot(vWP.xz, tg);
vec2 cell = vec2(along / ${glass ? "2.2" : "3.0"}, vWP.y / ${glass ? "2.6" : "3.3"});
vec2 f = fract(cell);
float win = wall * step(${glass ? "0.08" : "0.24"}, f.x) * step(f.x, ${glass ? "0.92" : "0.76"}) * step(${glass ? "0.12" : "0.3"}, f.y) * step(f.y, ${glass ? "0.88" : "0.76"});
float lit = step(${glass ? "0.42" : "0.5"}, wh(floor(cell) + vSeed));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.025, 0.035, 0.05), win * ${glass ? "0.6" : "0.85"});
if (vWN.y > 0.6) diffuseColor.rgb *= 0.72;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
totalEmissiveRadiance += win * lit * uNight * vec3(1.0, 0.7, 0.4) * ${glass ? "1.5" : "2.1"};`,
      );
  };
}

function buildingMeshes(w: World, night: NightUniform) {
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const plain = w.buildings.filter((b) => !b.glass);
  const glass = w.buildings.filter((b) => b.glass);
  const make = (list: typeof plain, isGlass: boolean) => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: isGlass ? 0.18 : 0.86,
      metalness: isGlass ? 0.55 : 0,
      envMapIntensity: isGlass ? 1.2 : 0.4,
    });
    windowShader(mat, night, isGlass);
    const mesh = new THREE.InstancedMesh(box, mat, list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const color = new THREE.Color();
    list.forEach((b, i) => {
      const corners = [
        heightAt(w, b.x - b.w / 2, b.z - b.d / 2),
        heightAt(w, b.x + b.w / 2, b.z - b.d / 2),
        heightAt(w, b.x - b.w / 2, b.z + b.d / 2),
        heightAt(w, b.x + b.w / 2, b.z + b.d / 2),
      ];
      const lo = Math.min(...corners) - 0.6;
      const hi = Math.max(...corners);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rot);
      m.compose(new THREE.Vector3(b.x, lo, b.z), q, new THREE.Vector3(b.w, b.h + (hi - lo), b.d));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, color.setHex(b.color).convertSRGBToLinear());
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  const group = new THREE.Group();
  group.add(make(plain, false));
  if (glass.length) group.add(make(glass, true));
  return group;
}

/* ── Palms and trees ───────────────────────────────────────────────────── */

function colored(geo: THREE.BufferGeometry, hex: number) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex).convertSRGBToLinear();
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}

function palmGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.2, 0.36, 9, 6, 8);
  const p = trunk.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 4.5;
    p.setX(i, p.getX(i) + Math.pow(y / 9, 2) * 1.3);
    p.setY(i, y);
  }
  trunk.computeVertexNormals();
  parts.push(colored(trunk, 0x8a6a4a));
  for (let k = 0; k < 9; k++) {
    const leaf = new THREE.PlaneGeometry(1.1, 5.2, 1, 5);
    const lp = leaf.attributes.position;
    for (let i = 0; i < lp.count; i++) {
      const t = (lp.getY(i) + 2.6) / 5.2;
      const narrow = 1 - Math.pow(Math.abs(t - 0.45) * 1.8, 2) * 0.6;
      lp.setX(i, lp.getX(i) * Math.max(0.15, narrow));
      lp.setZ(i, -Math.pow(t, 1.8) * 2.4);
      lp.setY(i, t * 5.2);
    }
    leaf.rotateX(-Math.PI / 2 + 0.35);
    leaf.rotateY((k / 9) * Math.PI * 2 + (k % 2) * 0.2);
    leaf.translate(1.3, 8.9, 0);
    leaf.computeVertexNormals();
    parts.push(colored(leaf, k % 2 ? 0x4f8a34 : 0x5f9a3c));
  }
  return mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;
}

function treeGeometry() {
  const trunk = new THREE.CylinderGeometry(0.28, 0.42, 3.6, 5);
  trunk.translate(0, 1.8, 0);
  const crown = new THREE.IcosahedronGeometry(2.7, 0);
  crown.scale(1, 0.9, 1);
  crown.translate(0, 5, 0);
  const top = new THREE.IcosahedronGeometry(1.8, 0);
  top.translate(0.5, 6.8, 0.3);
  return mergeGeometries([colored(trunk, 0x6b5038), colored(crown, 0x3f7a35), colored(top, 0x4b8a3c)], false)!;
}

function vegetation(w: World, count: number, data: Float32Array, geo: THREE.BufferGeometry, seed: number, doubleSide: boolean) {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0,
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    flatShading: !doubleSide,
  });
  const n = Math.min(count, data.length / 4);
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const c = new THREE.Color();
  const rand = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = data[i * 4];
    const z = data[i * 4 + 1];
    const s = data[i * 4 + 2];
    e.set((rand() - 0.5) * 0.12, data[i * 4 + 3], (rand() - 0.5) * 0.12);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(x, heightAt(w, x, z) - 0.3, z), q, new THREE.Vector3(s, s * (0.85 + rand() * 0.3), s));
    mesh.setMatrixAt(i, m);
    const v = 0.78 + rand() * 0.4;
    mesh.setColorAt(i, c.setRGB(v, v * (0.95 + rand() * 0.1), v * 0.9));
  }
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  return mesh;
}

/* ── Markers, arrows, rings, the GPS line ──────────────────────────────── */

const beamVert = `
  varying vec2 vUv;
  varying vec3 vW;
  void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const beamFrag = `
  uniform vec3 color; uniform float time; uniform float strength;
  varying vec2 vUv; varying vec3 vW;
  void main(){
    float a = pow(1.0 - vUv.y, 1.6) * (0.55 + 0.25 * sin(time * 2.4 + vUv.y * 12.0));
    float near = smoothstep(4.0, 22.0, length(cameraPosition.xz - vW.xz));
    gl_FragColor = vec4(color, a * strength * near * 0.42);
  }`;

export interface Marker {
  group: THREE.Group;
  beam: THREE.ShaderMaterial;
  ring: THREE.Mesh;
  icon: THREE.Sprite;
  base: number;
}

export function iconTexture(kind: PoiKind | "arrow" | "waypoint", done = false) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const color = kind === "arrow" ? "#ffcf5a" : kind === "waypoint" ? "#ffffff" : KIND_COLOR[kind];
  ctx.translate(64, 64);
  ctx.beginPath();
  ctx.arc(0, 0, 50, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(10,10,16,0.82)";
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawGlyph(ctx, kind);
  if (done) {
    ctx.beginPath();
    ctx.arc(34, -34, 16, 0, Math.PI * 2);
    ctx.fillStyle = "#8be36a";
    ctx.fill();
    ctx.strokeStyle = "#0b0f08";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(26, -34);
    ctx.lineTo(32, -28);
    ctx.lineTo(42, -40);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The little pictures on markers and the map. Drawn, not borrowed. */
export function drawGlyph(ctx: CanvasRenderingContext2D, kind: PoiKind | "arrow" | "waypoint") {
  ctx.beginPath();
  switch (kind) {
    case "about": // a house
      ctx.moveTo(-22, 0);
      ctx.lineTo(0, -20);
      ctx.lineTo(22, 0);
      ctx.moveTo(-15, -4);
      ctx.lineTo(-15, 20);
      ctx.lineTo(15, 20);
      ctx.lineTo(15, -4);
      ctx.stroke();
      break;
    case "project": // a window
      ctx.strokeRect(-22, -17, 44, 34);
      ctx.moveTo(-22, -6);
      ctx.lineTo(22, -6);
      ctx.stroke();
      break;
    case "garage": // a spanner
      ctx.moveTo(-16, 16);
      ctx.lineTo(8, -8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(12, -12, 10, Math.PI * 0.95, Math.PI * 2.55);
      ctx.stroke();
      break;
    case "race": // a flag
      ctx.moveTo(-16, 22);
      ctx.lineTo(-16, -22);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-16, -20);
      ctx.lineTo(18, -12);
      ctx.lineTo(-16, -2);
      ctx.closePath();
      ctx.fill();
      break;
    case "range": // a target
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "contact": // an envelope
      ctx.strokeRect(-22, -15, 44, 30);
      ctx.moveTo(-22, -15);
      ctx.lineTo(0, 4);
      ctx.lineTo(22, -15);
      ctx.stroke();
      break;
    case "arrow":
      ctx.moveTo(-18, 18);
      ctx.lineTo(16, -16);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, -20);
      ctx.lineTo(4, -16);
      ctx.lineTo(16, -4);
      ctx.closePath();
      ctx.fill();
      break;
    case "waypoint":
      ctx.arc(0, -6, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-9, 2);
      ctx.lineTo(0, 22);
      ctx.lineTo(9, 2);
      ctx.stroke();
      break;
  }
}

export function makeMarker(w: World, x: number, z: number, kind: PoiKind, done: boolean): Marker {
  const group = new THREE.Group();
  const base = heightAt(w, x, z) + 0.2;
  group.position.set(x, base, z);
  const color = new THREE.Color(KIND_COLOR[kind]);
  const beam = new THREE.ShaderMaterial({
    uniforms: { color: { value: color }, time: { value: 0 }, strength: { value: done ? 0.35 : 1 } },
    vertexShader: beamVert,
    fragmentShader: beamFrag,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  const cyl = new THREE.CylinderGeometry(3.4, 3.4, 170, 24, 1, true);
  cyl.translate(0, 85, 0);
  group.add(new THREE.Mesh(cyl, beam));
  const ringGeo = new THREE.RingGeometry(5.6, 7.2, 48);
  ringGeo.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(
    ringGeo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  ring.position.y = 0.35;
  group.add(ring);
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(kind, done), depthTest: false, transparent: true, fog: false }));
  icon.position.y = 11;
  icon.renderOrder = 10;
  group.add(icon);
  return { group, beam, ring, icon, base };
}

export function arrowMesh() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc94a, emissive: 0xff9a1a, emissiveIntensity: 1.6, metalness: 0.8, roughness: 0.25 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 8), gold);
  shaft.rotation.z = Math.PI / 2;
  g.add(shaft);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 10), gold);
  head.rotation.z = -Math.PI / 2;
  head.position.x = 2.5;
  g.add(head);
  const fl = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffb04a, emissiveIntensity: 0.9, side: THREE.DoubleSide });
  for (let k = 0; k < 3; k++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.36), fl);
    f.position.x = -1.75;
    f.rotation.x = (k / 3) * Math.PI;
    f.position.y = 0;
    g.add(f);
  }
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffb547, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glow.scale.setScalar(9);
  g.add(glow);
  return g;
}

let glowTex: THREE.Texture | null = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

export function ringMesh() {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(9, 0.55, 10, 56), mat);
  return ring;
}

/** The GPS line: chevrons that run along the road toward where you are going. */
export function routeMaterial(color: string) {
  return new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform float time; uniform vec3 color; varying vec2 vUv;
      void main(){
        float x = abs(vUv.x - 0.5) * 2.0;
        float chev = fract(vUv.y * 0.5 - time * 0.9 + x * 0.35);
        float a = smoothstep(0.0, 0.12, chev) * smoothstep(0.55, 0.4, chev);
        float edge = smoothstep(1.0, 0.75, x);
        gl_FragColor = vec4(color * 1.4, (0.25 + a * 0.75) * edge * 0.85);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -6,
    polygonOffsetUnits: -12,
  });
}

/* ── The car: an original coupé, built from extrusions ─────────────────── */

export interface CarRig {
  root: THREE.Group;
  body: THREE.Group;
  wheels: THREE.Object3D[];
  steer: THREE.Object3D[];
  brake: THREE.MeshStandardMaterial;
  head: THREE.MeshStandardMaterial;
  beam: THREE.SpotLight;
  paint: THREE.MeshPhysicalMaterial;
}

function profile(points: [number, number][], width: number, bevel: number) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 4,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate((width - bevel * 2) / 2, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

export function buildCar(paintHex: number): CarRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const paint = new THREE.MeshPhysicalMaterial({
    color: paintHex,
    metalness: 0.55,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  });
  const trim = new THREE.MeshStandardMaterial({ color: 0x16171b, roughness: 0.55, metalness: 0.3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0c1218, metalness: 0.2, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.92 });

  // Lower body: long nose, short tail, a crease at the shoulder.
  const shell = new THREE.Mesh(
    profile(
      [
        [-2.28, 0.32], [-2.34, 0.62], [-2.26, 0.92], [-1.95, 1.02], [-1.3, 1.04], [1.05, 1.0],
        [1.75, 0.9], [2.22, 0.74], [2.36, 0.52], [2.3, 0.32],
      ],
      1.92,
      0.08,
    ),
    paint,
  );
  shell.castShadow = true;
  body.add(shell);

  // The cabin: a glass canopy with a painted roof.
  const cabin = new THREE.Mesh(
    profile([[-1.5, 0.98], [-0.62, 1.42], [0.32, 1.45], [1.12, 1.0]], 1.58, 0.06),
    glass,
  );
  cabin.castShadow = true;
  body.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.05, 0.86), paint);
  roof.position.set(0, 1.47, -0.15);
  body.add(roof);

  // Skirts, splitter, diffuser and a low wing.
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 3.4), trim);
  skirt.position.set(0, 0.36, 0);
  body.add(skirt);
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.06, 0.3), trim);
  splitter.position.set(0, 0.3, 2.28);
  body.add(splitter);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.34), trim);
  wing.position.set(0, 1.2, -2.06);
  body.add(wing);
  for (const s of [-0.62, 0.62]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.14), trim);
    post.position.set(s, 1.1, -2.04);
    body.add(post);
  }
  // A stripe down the middle, the colour of a lagoon.
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: 0.4, metalness: 0.4 });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 1.2), stripeMat);
  stripe.position.set(0, 0.995, 1.45);
  stripe.rotation.x = 0.13;
  body.add(stripe);

  const head = new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff1d6, emissiveIntensity: 1.2 });
  for (const s of [-0.66, 0.66]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.08), head);
    l.position.set(s, 0.76, 2.27);
    l.rotation.x = -0.4;
    body.add(l);
  }
  const brake = new THREE.MeshStandardMaterial({ color: 0x400606, emissive: 0xff1a1a, emissiveIntensity: 0.7 });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.06), brake);
  tail.position.set(0, 0.86, -2.34);
  body.add(tail);

  // Wheels.
  const tyre = new THREE.MeshStandardMaterial({ color: 0x111113, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.25, metalness: 0.9 });
  const wheels: THREE.Object3D[] = [];
  const steer: THREE.Object3D[] = [];
  for (const [x, z] of [[-0.9, 1.38], [0.9, 1.38], [-0.9, -1.36], [0.9, -1.36]] as const) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.37, z);
    const wheel = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.3, 20), tyre);
    t.rotation.z = Math.PI / 2;
    t.castShadow = true;
    wheel.add(t);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.31, 10), rimMat);
    rim.rotation.z = Math.PI / 2;
    wheel.add(rim);
    for (let k = 0; k < 5; k++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.05), trim);
      spoke.position.x = Math.sign(x) * 0.16;
      spoke.rotation.x = (k / 5) * Math.PI;
      spoke.scale.set(0.12, 1, 9);
      wheel.add(spoke);
    }
    pivot.add(wheel);
    root.add(pivot);
    wheels.push(wheel);
    if (z > 0) steer.push(pivot);
  }

  // A soft contact shadow, for when the real one is out of range.
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 5.6),
    new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.06;
  root.add(blob);

  const beam = new THREE.SpotLight(0xfff0d8, 0, 120, 0.5, 0.55, 1.2);
  beam.position.set(0, 0.9, 2.1);
  beam.target.position.set(0, -1.2, 18);
  root.add(beam);
  root.add(beam.target);

  return { root, body, wheels, steer, brake, head, beam, paint };
}

/* ── Everything together ───────────────────────────────────────────────── */

export interface Scenery {
  root: THREE.Group;
  water: WaterUniforms;
  night: NightUniform;
  palms: THREE.InstancedMesh;
  trees: THREE.InstancedMesh;
  lakes: THREE.Mesh[];
}

export function buildScenery(w: World, maxAniso: number, light: boolean): Scenery {
  const root = new THREE.Group();
  const night: NightUniform = { value: 0 };
  root.add(terrainMesh(w, maxAniso));
  const water = waterMesh(w);
  root.add(water.mesh);
  root.add(roadMeshes(w, maxAniso));
  root.add(buildingMeshes(w, night));
  const palms = vegetation(w, light ? 1400 : 2600, w.palms, palmGeometry(), 5, true);
  const trees = vegetation(w, light ? 2600 : 5200, w.trees, treeGeometry(), 6, false);
  root.add(palms, trees);
  const lakes = w.lakes.map((l) => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(l.r * 1.25, 48).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x1f6a78, roughness: 0.08, metalness: 0.3 }),
    );
    m.position.set(l.x, l.level, l.z);
    root.add(m);
    return m;
  });
  return { root, water: water.uniforms, night, palms, trees, lakes };
}

export { roadAt, sdfAt };
