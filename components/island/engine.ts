/**
 * The running game: renderer, sky and time of day, the car and its physics,
 * the camera, markers, golden arrows, the race and the GPS. React owns every
 * menu; this owns everything that moves every frame, and talks back through
 * `onEvent`.
 */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SPAWN, TOWNS, rng } from "./geo";
import {
  arrowMesh,
  buildCar,
  buildScenery,
  glowTexture,
  iconTexture,
  makeMarker,
  ribbon,
  ringMesh,
  routeMaterial,
  type CarRig,
  type Marker,
  type Scenery,
} from "./scene";
import { heightAt, nearestNode, roadAt, route, sdfAt, type World } from "./world";
import { rumble, triggerRumble } from "@/components/console/useGamepad";
import { restoreDualSense } from "@/components/console/dualsense";

export type PadButton =
  | "a" | "b" | "x" | "y" | "lb" | "rb" | "lt" | "rt" | "select" | "start" | "ls" | "rs"
  | "up" | "down" | "left" | "right" | "home";

const PAD_NAMES: PadButton[] = ["a", "b", "x", "y", "lb", "rb", "lt", "rt", "select", "start", "ls", "rs", "up", "down", "left", "right", "home"];

export type EngineEvent =
  | { type: "poi"; id: string }
  | { type: "arrow"; index: number }
  | { type: "checkpoint"; index: number; time: number }
  | { type: "finish"; time: number }
  | { type: "countdown"; n: number }
  | { type: "bump"; strength: number }
  | { type: "pad"; button: PadButton }
  | { type: "padUsed" };

export type Mode = "title" | "intro" | "drive" | "card" | "frozen";

export interface Hud {
  speed: number;
  gear: number;
  rpm: number;
  throttle: number;
  slip: number;
  offroad: number;
  coast: number;
  x: number;
  z: number;
  heading: number;
  hour: number;
  place: string;
  race: { time: number; next: number; countdown: number } | null;
  route: [number, number][] | null;
  driven: number;
  top: number;
}

const VMAX = 56;
const GEARS = [0, 10, 19, 28, 37, 46, 99];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Sky, light and fog through the day, keyed on the sun's height. */
type Key = { e: number; sun: number[]; si: number; hemi: number[]; hi: number; fog: number[]; exp: number; zen: number[]; hor: number[]; glow: number[] };
const PALETTE: Key[] = [
  { e: -0.3, sun: [0.5, 0.6, 1.0], si: 0.2, hemi: [0.2, 0.26, 0.46], hi: 0.35, fog: [0.03, 0.04, 0.09], exp: 0.95, zen: [0.004, 0.006, 0.02], hor: [0.03, 0.04, 0.09], glow: [0.04, 0.05, 0.1] },
  { e: -0.1, sun: [0.7, 0.45, 0.6], si: 0.3, hemi: [0.4, 0.3, 0.5], hi: 0.4, fog: [0.2, 0.1, 0.2], exp: 0.85, zen: [0.03, 0.025, 0.09], hor: [0.22, 0.1, 0.2], glow: [0.6, 0.18, 0.2] },
  { e: 0.0, sun: [1.0, 0.36, 0.14], si: 1.5, hemi: [0.6, 0.38, 0.46], hi: 0.5, fog: [0.62, 0.28, 0.26], exp: 0.75, zen: [0.08, 0.06, 0.22], hor: [0.75, 0.3, 0.28], glow: [1.4, 0.48, 0.18] },
  { e: 0.1, sun: [1.0, 0.58, 0.3], si: 2.5, hemi: [0.62, 0.5, 0.62], hi: 0.6, fog: [0.86, 0.52, 0.38], exp: 0.7, zen: [0.12, 0.17, 0.42], hor: [0.95, 0.58, 0.42], glow: [1.5, 0.75, 0.32] },
  { e: 0.35, sun: [1.0, 0.9, 0.78], si: 2.7, hemi: [0.55, 0.7, 0.95], hi: 0.7, fog: [0.62, 0.74, 0.88], exp: 0.62, zen: [0.1, 0.26, 0.62], hor: [0.62, 0.76, 0.92], glow: [0.95, 0.88, 0.75] },
  { e: 1.0, sun: [1.0, 0.97, 0.92], si: 2.9, hemi: [0.55, 0.72, 1.0], hi: 0.8, fog: [0.58, 0.72, 0.9], exp: 0.6, zen: [0.08, 0.24, 0.6], hor: [0.56, 0.72, 0.9], glow: [0.8, 0.82, 0.85] },
];

function palette(e: number) {
  let i = 0;
  while (i < PALETTE.length - 2 && e > PALETTE[i + 1].e) i++;
  const a = PALETTE[i];
  const b = PALETTE[i + 1];
  const t = clamp((e - a.e) / (b.e - a.e), 0, 1);
  const mix = (x: number[], y: number[]) => x.map((v, k) => lerp(v, y[k], t));
  return {
    sun: mix(a.sun, b.sun),
    si: lerp(a.si, b.si, t),
    hemi: mix(a.hemi, b.hemi),
    hi: lerp(a.hi, b.hi, t),
    fog: mix(a.fog, b.fog),
    exp: lerp(a.exp, b.exp, t),
    zen: mix(a.zen, b.zen),
    hor: mix(a.hor, b.hor),
    glow: mix(a.glow, b.glow),
  };
}

export class IslandEngine {
  readonly world: World;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.5, 30000);
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private envSky: THREE.Mesh;
  private envScene = new THREE.Scene();
  private pmrem: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private envAt = -99;
  private sun = new THREE.DirectionalLight(0xffffff, 2);
  private hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 0.8);
  private stars: THREE.Points;
  private moon: THREE.Sprite;
  private scenery: Scenery;
  private car: CarRig;
  private markers = new Map<string, Marker>();
  private arrowObjs: (THREE.Group | null)[] = [];
  private rings: THREE.Mesh[] = [];
  private routeMesh: THREE.Mesh | null = null;
  private routeMat = routeMaterial("#ffb547");
  private waypoint: THREE.Sprite | null = null;
  private particles: { s: THREE.Sprite; vx: number; vy: number; vz: number; life: number; max: number }[] = [];
  private raf = 0;
  private last = 0;
  private time = 0;
  private quality: "high" | "low";
  private slowFrames = 0;
  private frameWindow = 0;
  private frameCount = 0;
  private reduce: boolean;

  // Car state.
  private x = SPAWN.at[0];
  private z = SPAWN.at[1];
  private y = 0;
  private heading = SPAWN.heading;
  private vx = 0;
  private vz = 0;
  private steerCur = 0;
  private pitch = 0;
  private roll = 0;
  private rpm = 0.2;
  private gear = 1;
  private slip = 0;
  private offroad = 0;
  private throttleNow = 0;
  private driven = 0;
  private top = 0;
  private bumpCool = 0;
  private shake = 0;

  // Camera.
  mode: Mode = "title";
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private introT = 0;
  private introFrom = new THREE.Vector3();
  private introLook = new THREE.Vector3();
  private orbitA = 0;
  private titleA = 0.6;

  // Input.
  private keys = new Set<string>();
  virtual = { steer: 0, throttle: 0, brake: 0, handbrake: false };
  inputSuspended = false;
  private padPrev: boolean[] = [];
  private stickPrev = { x: 0, y: 0, at: 0 };
  private padActive = false;

  // Game state.
  hour = 17.45;
  hourRate = 1 / 150; // game hours per second
  private poiCool = new Set<string>();
  private found = new Set<string>();
  private arrowsFound = new Set<number>();
  private race: { phase: "countdown" | "run"; t0: number; idx: number; lastN: number } | null = null;
  private target: { x: number; z: number } | null = null;
  private routeAt = 0;
  private routePts: [number, number][] | null = null;
  private placeAt = 0;
  private place = "";

  constructor(
    private canvas: HTMLCanvasElement,
    world: World,
    private onEvent: (e: EngineEvent) => void,
    opts: { quality: "high" | "low"; found: string[]; arrows: number[]; reduce: boolean },
  ) {
    this.world = world;
    this.quality = opts.quality;
    this.reduce = opts.reduce;
    opts.found.forEach((f) => this.found.add(f));
    opts.arrows.forEach((a) => this.arrowsFound.add(a));

    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = this.quality === "high";
    r.shadowMap.type = THREE.PCFShadowMap;
    this.renderer = r;
    this.pmrem = new THREE.PMREMGenerator(r);

    const s = this.scene;
    s.fog = new THREE.FogExp2(0xffaa77, 0.00052);

    // A painted sky: zenith to horizon, warmest toward the sun.
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        zenith: { value: new THREE.Color() },
        horizon: { value: new THREE.Color() },
        glow: { value: new THREE.Color() },
        sunDir: { value: new THREE.Vector3(0, 1, 0) },
        sunColor: { value: new THREE.Color() },
        sunAmt: { value: 1 },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
      fragmentShader: `
        uniform vec3 zenith, horizon, glow, sunDir, sunColor; uniform float sunAmt;
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = max(d.y, 0.0);
          float toward = max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z) + 1e-5)), 0.0);
          vec3 col = mix(horizon, zenith, pow(h, 0.55));
          col = mix(col, glow, pow(toward, 3.0) * exp(-h * 5.0) * 0.85);
          float c = max(dot(d, normalize(sunDir)), 0.0);
          col += sunColor * (pow(c, 900.0) * 14.0 + pow(c, 40.0) * 0.5 + pow(c, 6.0) * 0.15) * sunAmt;
          if (d.y < 0.0) col = mix(horizon, horizon * 0.45, min(1.0, -d.y * 4.0));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(16000, 32, 16), this.skyMat);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    s.add(this.sky);
    this.envSky = new THREE.Mesh(new THREE.SphereGeometry(16000, 32, 16), this.skyMat);
    this.envScene.add(this.envSky);

    // Stars and a moon for after dark.
    const rand = rng(3);
    const sp: number[] = [];
    for (let i = 0; i < 2600; i++) {
      const u = rand() * Math.PI * 2;
      const v = Math.acos(rand() * 0.95);
      sp.push(Math.sin(v) * Math.cos(u) * 14000, Math.cos(v) * 14000, Math.sin(v) * Math.sin(u) * 14000);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    s.add(this.stars);
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xdfe8ff, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    this.moon.scale.setScalar(900);
    s.add(this.moon);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -95;
    sc.right = 95;
    sc.top = 95;
    sc.bottom = -95;
    sc.near = 1;
    sc.far = 900;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.5;
    s.add(this.sun, this.sun.target, this.hemi);

    this.scenery = buildScenery(world, r.capabilities.getMaxAnisotropy(), this.quality === "low");
    s.add(this.scenery.root);

    this.car = buildCar(0xe8873a);
    s.add(this.car.root);

    for (const p of world.pois) {
      const m = makeMarker(world, p.x, p.z, p.kind, this.found.has(p.id));
      this.markers.set(p.id, m);
      s.add(m.group);
    }
    world.arrows.forEach((a, i) => {
      if (this.arrowsFound.has(i)) {
        this.arrowObjs.push(null);
        return;
      }
      const g = arrowMesh();
      g.position.set(a.x, heightAt(world, a.x, a.z) + 2.6, a.z);
      s.add(g);
      this.arrowObjs.push(g);
    });
    for (let i = 0; i < 5; i++) {
      const ring = ringMesh();
      ring.visible = false;
      s.add(ring);
      this.rings.push(ring);
    }
    for (let i = 0; i < 90; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, opacity: 0, depthWrite: false }));
      sprite.visible = false;
      s.add(sprite);
      this.particles.push({ s: sprite, vx: 0, vy: 0, vz: 0, life: 0, max: 1 });
    }

    this.setupComposer();
    this.resize();
    this.y = heightAt(world, this.x, this.z);
    this.placeCar();
    this.updateSky(true);

    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKey);
    window.addEventListener("blur", this.onBlur);
    void restoreDualSense();
    window.addEventListener("resize", this.resize);
  }

  /* ── Lifecycle ───────────────────────────────────────────────────────── */

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
      this.watchSpeed(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKey);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("resize", this.resize);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
    });
    this.envRT?.dispose();
    this.pmrem.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }

  private setupComposer() {
    this.composer?.dispose();
    this.composer = null;
    this.bloom = null;
    if (this.quality !== "high") return;
    const c = new EffectComposer(this.renderer);
    c.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.5, 0.96);
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.composer = c;
  }

  setQuality(q: "high" | "low") {
    if (q === this.quality) return;
    this.quality = q;
    this.renderer.shadowMap.enabled = q === "high";
    this.scenery.palms.count = q === "high" ? this.world.palms.length / 4 : Math.min(1400, this.world.palms.length / 4);
    this.scenery.trees.count = q === "high" ? this.world.trees.length / 4 : Math.min(2600, this.world.trees.length / 4);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => (x.needsUpdate = true));
    });
    this.setupComposer();
    this.resize();
  }

  getQuality() {
    return this.quality;
  }

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.quality === "high" ? 1.5 : 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(dpr);
    this.composer?.setSize(w, h);
    this.bloom?.setSize((w * dpr) / 2, (h * dpr) / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  /** Drop to the lighter setting if frames are slow for a few seconds running. */
  private watchSpeed(dt: number) {
    if (this.quality !== "high" || this.mode === "title") return;
    this.frameWindow += dt;
    this.frameCount++;
    if (this.frameWindow > 2) {
      const avg = this.frameWindow / this.frameCount;
      this.slowFrames = avg > 1 / 32 ? this.slowFrames + 1 : 0;
      this.frameWindow = 0;
      this.frameCount = 0;
      if (this.slowFrames >= 2) this.setQuality("low");
    }
  }

  /* ── Input ───────────────────────────────────────────────────────────── */

  private onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (e.type === "keydown") this.keys.add(e.code);
    else this.keys.delete(e.code);
    if (this.mode === "drive" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  };

  private onBlur = () => this.keys.clear();

  private readPad() {
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    let pad: Gamepad | null = null;
    for (const p of pads) if (p && p.connected && p.mapping === "standard") pad = p;
    if (!pad) return null;
    const pressed = pad.buttons.map((b) => b.pressed || b.value > 0.5);
    if (!this.inputSuspended) {
      pressed.forEach((on, i) => {
        if (on && !this.padPrev[i] && PAD_NAMES[i]) {
          this.padActive = true;
          this.onEvent({ type: "pad", button: PAD_NAMES[i] });
        }
      });
      // The stick moves through menus too, with a gentle repeat.
      if (this.mode !== "drive") {
        const sx = pad.axes[0] ?? 0;
        const sy = pad.axes[1] ?? 0;
        const now = performance.now();
        const dir = Math.abs(sx) > 0.6 ? (sx > 0 ? "right" : "left") : Math.abs(sy) > 0.6 ? (sy > 0 ? "down" : "up") : null;
        const was = Math.abs(this.stickPrev.x) > 0.6 || Math.abs(this.stickPrev.y) > 0.6;
        if (dir && (!was || now - this.stickPrev.at > 220)) {
          this.onEvent({ type: "pad", button: dir });
          this.stickPrev.at = now + (was ? 0 : 160);
        }
        this.stickPrev.x = sx;
        this.stickPrev.y = sy;
      }
    }
    if (pressed.some(Boolean) || Math.abs(pad.axes[0]) > 0.3) {
      if (!this.padActive) this.onEvent({ type: "padUsed" });
      this.padActive = true;
    }
    this.padPrev = pressed;
    return pad;
  }

  private rumble(strong: number, weak: number, ms: number) {
    if (this.padActive) rumble(strong, weak, ms);
  }

  /** The road through the hands: gravel, slides and a hard push on the throttle. */
  private feelAt = 0;
  private feel(sp: number, throttle: number) {
    if (!this.padActive || this.time - this.feelAt < 0.11) return;
    this.feelAt = this.time;
    const gravel = this.offroad * clamp(sp / 25, 0, 1);
    const slide = this.slip > 0.4 ? clamp((this.slip - 0.4) * 1.6, 0, 1) * clamp(sp / 12, 0, 1) : 0;
    const strong = Math.max(gravel * 0.55, slide * 0.35);
    const weak = Math.max(gravel * 0.45, slide * 0.7);
    if (strong > 0.05 || weak > 0.05) rumble(strong, weak, 130);
    if (throttle > 0.1) triggerRumble(0, clamp(0.1 + this.rpm * 0.35, 0, 0.5) * throttle, 130);
  }

  private controls(pad: Gamepad | null) {
    const k = this.keys;
    let steer = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    let throttle = k.has("KeyW") || k.has("ArrowUp") ? 1 : 0;
    let brake = k.has("KeyS") || k.has("ArrowDown") ? 1 : 0;
    let handbrake = k.has("Space");
    let analog = false;
    if (pad) {
      const ax = pad.axes[0] ?? 0;
      if (Math.abs(ax) > 0.12) {
        steer = Math.sign(ax) * Math.pow((Math.abs(ax) - 0.12) / 0.88, 1.4);
        analog = true;
      }
      throttle = Math.max(throttle, pad.buttons[7]?.value ?? 0);
      brake = Math.max(brake, pad.buttons[6]?.value ?? 0);
      handbrake = handbrake || !!pad.buttons[1]?.pressed || !!pad.buttons[5]?.pressed;
    }
    const v = this.virtual;
    if (v.steer || v.throttle || v.brake || v.handbrake) {
      if (Math.abs(v.steer) > 0.02) {
        steer = v.steer;
        analog = true;
      }
      throttle = Math.max(throttle, v.throttle);
      brake = Math.max(brake, v.brake);
      handbrake = handbrake || v.handbrake;
    }
    return { steer, throttle, brake, handbrake, analog };
  }

  /* ── The frame ───────────────────────────────────────────────────────── */

  private frame(dt: number) {
    this.time += dt;
    const pad = this.readPad();
    if (this.mode === "drive" && !this.inputSuspended) {
      const c = this.controls(pad);
      if (this.race?.phase === "countdown") this.physics(dt, { steer: 0, throttle: 0, brake: 1, handbrake: false, analog: false });
      else this.physics(dt, c);
    } else {
      // Not driving: let the car roll to a stop, never into reverse.
      const k = Math.exp(-dt * (this.mode === "card" ? 4 : 2));
      this.vx *= k;
      this.vz *= k;
      this.physics(dt, { steer: 0, throttle: 0, brake: 0, handbrake: false, analog: false });
    }
    this.placeCar();
    this.updateWorldObjects(dt);
    this.updateRace();
    this.updateCamera(dt);
    this.hour = (this.hour + dt * this.hourRate) % 24;
    this.updateSky(false);
    this.updateRoute();
    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  private physics(dt: number, c: { steer: number; throttle: number; brake: number; handbrake: boolean; analog: boolean }) {
    const w = this.world;
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    const rx = Math.cos(this.heading);
    const rz = -Math.sin(this.heading);
    let vF = this.vx * fx + this.vz * fz;
    let vR = this.vx * rx + this.vz * rz;

    const road = roadAt(w, this.x, this.z);
    const sdf = sdfAt(w, this.x, this.z);
    const offroad = clamp((road - 6) / 6, 0, 1);
    const sand = clamp((26 - sdf) / 14, 0, 1) * offroad;
    this.offroad = offroad;
    const vmax = VMAX * (1 - offroad * 0.38 - sand * 0.25);

    // Engine and brakes.
    this.throttleNow = c.throttle;
    if (c.throttle > 0) vF += c.throttle * 19 * (1 - Math.pow(clamp(vF / vmax, 0, 1), 2.2)) * dt;
    if (c.brake > 0) {
      if (vF > 0.8) vF -= c.brake * 38 * dt;
      else vF = Math.max(-13, vF - c.brake * 12 * dt);
    }
    if (vF > vmax) vF -= (vF - vmax) * 1.6 * dt;
    vF -= vF * (0.12 + offroad * 0.5) * dt;
    if (c.throttle === 0 && c.brake === 0) vF -= Math.sign(vF) * Math.min(Math.abs(vF), 2.4 * dt);
    if (c.handbrake) vF -= vF * 0.9 * dt;

    // Steering: quick at low speed, calmer when fast, never on the spot.
    const target = c.steer;
    this.steerCur = c.analog ? target : lerp(this.steerCur, target, 1 - Math.exp(-dt * (target === 0 ? 9 : 5)));
    const speedK = clamp(Math.abs(vF) / 7, 0, 1) * (1 - 0.52 * clamp(Math.abs(vF) / VMAX, 0, 1));
    const yaw = -this.steerCur * 2.15 * speedK * Math.sign(vF || 1) * (c.handbrake ? 1.45 : 1);
    this.heading += yaw * dt;

    // Grip.
    const grip = c.handbrake ? 1.3 : 9.5 - offroad * 4.5;
    vR *= Math.exp(-grip * dt);
    this.slip = clamp(Math.abs(vR) / 9, 0, 1);

    const nfx = Math.sin(this.heading);
    const nfz = Math.cos(this.heading);
    const nrx = Math.cos(this.heading);
    const nrz = -Math.sin(this.heading);
    this.vx = nfx * vF + nrx * vR;
    this.vz = nfz * vF + nrz * vR;

    // Move, unless the move ends in the sea, a lake, a cliff or a building.
    const nx = this.x + this.vx * dt;
    const nz = this.z + this.vz * dt;
    const hNow = heightAt(w, this.x, this.z);
    const hNext = heightAt(w, nx, nz);
    const step = Math.hypot(nx - this.x, nz - this.z) || 1e-6;
    let blocked = sdfAt(w, nx, nz) < 2.5 || (hNext - hNow) / step > 1.1;
    for (const lake of w.lakes) if (Math.hypot(nx - lake.x, nz - lake.z) < lake.r * 1.15) blocked = true;
    const hit = blocked ? null : this.buildingHit(nx, nz);
    if (blocked || hit) {
      const impact = Math.hypot(this.vx, this.vz);
      if (hit) {
        // Slide along the wall.
        const dot = this.vx * hit[0] + this.vz * hit[1];
        this.vx -= hit[0] * dot * 1.3;
        this.vz -= hit[1] * dot * 1.3;
        this.x += hit[0] * 0.3;
        this.z += hit[1] * 0.3;
      } else {
        const gx = sdfAt(w, this.x + 2, this.z) - sdfAt(w, this.x - 2, this.z);
        const gz = sdfAt(w, this.x, this.z + 2) - sdfAt(w, this.x, this.z - 2);
        const len = Math.hypot(gx, gz) || 1;
        const ix = gx / len;
        const iz = gz / len;
        const dot = this.vx * ix + this.vz * iz;
        if (dot < 0) {
          this.vx -= ix * dot * 1.25;
          this.vz -= iz * dot * 1.25;
        }
        this.vx *= 0.55;
        this.vz *= 0.55;
      }
      if (impact > 6 && this.bumpCool <= 0) {
        this.onEvent({ type: "bump", strength: clamp(impact / 40, 0.15, 1) });
        this.shake = this.reduce ? 0 : clamp(impact / 50, 0.1, 0.7);
        this.rumble(clamp(impact / 40, 0.2, 1), 0.6, 220);
        this.bumpCool = 0.4;
      }
    } else {
      this.driven += step;
      this.x = nx;
      this.z = nz;
    }
    this.bumpCool -= dt;

    // Gears and revs, for the sound and the dial.
    const sp = Math.abs(vF);
    this.top = Math.max(this.top, sp);
    let g = 1;
    while (g < GEARS.length - 2 && sp > GEARS[g]) g++;
    this.gear = vF < -0.5 ? -1 : g;
    const lo = GEARS[g - 1];
    const hi = GEARS[g];
    const targetRpm = clamp(0.22 + 0.78 * ((sp - lo) / (hi - lo)) * (c.throttle > 0 ? 1 : 0.85), 0.18, 1);
    this.rpm = lerp(this.rpm, targetRpm, 1 - Math.exp(-dt * 8));

    // Body motion.
    const latAcc = yaw * vF;
    this.roll = lerp(this.roll, clamp(latAcc * 0.004, -0.07, 0.07), 1 - Math.exp(-dt * 6));
    this.pitch = lerp(this.pitch, clamp((c.brake - c.throttle * 0.5) * 0.025, -0.03, 0.04), 1 - Math.exp(-dt * 5));

    // Wheels.
    this.car.wheels.forEach((wh) => (wh.rotation.x += (vF * dt) / 0.37));
    this.car.steer.forEach((s) => (s.rotation.y = -this.steerCur * 0.42));
    this.car.brake.emissiveIntensity = c.brake > 0.1 && vF > 0.5 ? 1.6 : 0.45;
    if (this.mode === "drive") this.feel(sp, c.throttle);

    // Smoke when sliding, dust off the road.
    if ((this.slip > 0.45 && sp > 8) || (offroad > 0.6 && sp > 12)) {
      if (Math.random() < dt * 40) this.puff(offroad > 0.6 ? (sand > 0.4 ? 0xe9d9b0 : 0xbda67a) : 0xdddddd);
    }
  }

  private buildingHit(x: number, z: number): [number, number] | null {
    const r = 1.9;
    for (const b of this.nearBuildings(x, z)) {
      const c = Math.cos(-b.rot);
      const s = Math.sin(-b.rot);
      const lx = (x - b.x) * c - (z - b.z) * s;
      const lz = (x - b.x) * s + (z - b.z) * c;
      const px = clamp(lx, -b.w / 2, b.w / 2);
      const pz = clamp(lz, -b.d / 2, b.d / 2);
      const dx = lx - px;
      const dz = lz - pz;
      const d = Math.hypot(dx, dz);
      if (d < r) {
        let nx = d > 1e-4 ? dx / d : 0;
        let nz = d > 1e-4 ? dz / d : 1;
        if (d <= 1e-4) {
          // Inside: push out the nearest face.
          const ex = b.w / 2 - Math.abs(lx);
          const ez = b.d / 2 - Math.abs(lz);
          if (ex < ez) {
            nx = Math.sign(lx);
            nz = 0;
          } else {
            nx = 0;
            nz = Math.sign(lz);
          }
        }
        const ci = Math.cos(b.rot);
        const si = Math.sin(b.rot);
        return [nx * ci - nz * si, nx * si + nz * ci];
      }
    }
    return null;
  }

  private bgrid: Map<number, World["buildings"]> | null = null;
  private nearBuildings(x: number, z: number) {
    if (!this.bgrid) {
      this.bgrid = new Map();
      for (const b of this.world.buildings) {
        const r = Math.max(b.w, b.d);
        for (let gx = Math.floor((b.x - r) / 32); gx <= Math.floor((b.x + r) / 32); gx++)
          for (let gz = Math.floor((b.z - r) / 32); gz <= Math.floor((b.z + r) / 32); gz++) {
            const k = gx * 10007 + gz;
            (this.bgrid.get(k) ?? this.bgrid.set(k, []).get(k)!).push(b);
          }
      }
    }
    return this.bgrid.get(Math.floor(x / 32) * 10007 + Math.floor(z / 32)) ?? [];
  }

  private placeCar() {
    const w = this.world;
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    const hf = heightAt(w, this.x + fx * 1.4, this.z + fz * 1.4);
    const hb = heightAt(w, this.x - fx * 1.4, this.z - fz * 1.4);
    const hl = heightAt(w, this.x + fz * 0.9, this.z - fx * 0.9);
    const hr = heightAt(w, this.x - fz * 0.9, this.z + fx * 0.9);
    const ground = Math.max((hf + hb) / 2, (hl + hr) / 2, heightAt(w, this.x, this.z));
    this.y = lerp(this.y, ground, 0.5);
    const root = this.car.root;
    root.position.set(this.x, this.y, this.z);
    root.rotation.set(0, 0, 0);
    root.rotation.order = "YXZ";
    root.rotation.y = this.heading;
    root.rotation.x = -Math.atan2(hf - hb, 2.8);
    root.rotation.z = Math.atan2(hl - hr, 1.8);
    const bob = this.offroad * Math.hypot(this.vx, this.vz) > 6 ? Math.sin(this.time * 31) * 0.025 : 0;
    this.car.body.rotation.set(this.pitch, 0, this.roll);
    this.car.body.position.y = bob;
  }

  private puff(color: number) {
    const p = this.particles.find((q) => q.life <= 0);
    if (!p) return;
    const back = -2.2;
    p.s.position.set(
      this.x + Math.sin(this.heading) * back + (Math.random() - 0.5) * 1.6,
      this.y + 0.5,
      this.z + Math.cos(this.heading) * back + (Math.random() - 0.5) * 1.6,
    );
    (p.s.material as THREE.SpriteMaterial).color.setHex(color);
    p.vx = this.vx * 0.15 + (Math.random() - 0.5) * 2;
    p.vz = this.vz * 0.15 + (Math.random() - 0.5) * 2;
    p.vy = 1 + Math.random() * 1.4;
    p.max = p.life = 1.1 + Math.random() * 0.7;
    p.s.visible = true;
  }

  private updateWorldObjects(dt: number) {
    const t = this.time;
    for (const [id, m] of this.markers) {
      m.beam.uniforms.time.value = t;
      const s = 1 + 0.08 * Math.sin(t * 3);
      m.ring.scale.set(s, 1, s);
      const d = this.camera.position.distanceTo(m.group.position);
      const k = clamp(d * 0.045, 4.5, 60);
      m.icon.scale.setScalar(k);
      m.icon.position.y = 10 + k * 0.4 + Math.sin(t * 2 + m.base) * 0.4;
      // Arriving.
      if (this.mode === "drive" && !this.race) {
        const dd = Math.hypot(this.x - m.group.position.x, this.z - m.group.position.z);
        if (dd < 8.5 && !this.poiCool.has(id)) {
          this.poiCool.add(id);
          this.onEvent({ type: "poi", id });
        } else if (dd > 22) this.poiCool.delete(id);
      }
    }
    this.arrowObjs.forEach((g, i) => {
      if (!g) return;
      g.rotation.y = t * 1.6 + i;
      const a = this.world.arrows[i];
      g.position.y = heightAt(this.world, a.x, a.z) + 2.6 + Math.sin(t * 2.2 + i) * 0.45;
      const near = Math.hypot(this.x - a.x, this.z - a.z);
      g.visible = near < 520;
      if (near < 5.5 && this.mode === "drive") {
        this.scene.remove(g);
        this.arrowObjs[i] = null;
        this.arrowsFound.add(i);
        this.rumble(0.4, 0.8, 160);
        this.onEvent({ type: "arrow", index: i });
      }
    });
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.s.position.x += p.vx * dt;
      p.s.position.y += p.vy * dt;
      p.s.position.z += p.vz * dt;
      const k = 1 - p.life / p.max;
      p.s.scale.setScalar(1.5 + k * 6);
      (p.s.material as THREE.SpriteMaterial).opacity = 0.42 * (1 - k);
      if (p.life <= 0) p.s.visible = false;
    }
    this.routeMat.uniforms.time.value = t;
    if (this.waypoint) this.waypoint.scale.setScalar(clamp(this.camera.position.distanceTo(this.waypoint.position) * 0.045, 4, 50));
  }

  /* ── Camera ──────────────────────────────────────────────────────────── */

  private chaseTarget(out: THREE.Vector3, look: THREE.Vector3) {
    const sp = Math.hypot(this.vx, this.vz);
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    // Lean the view toward where the car is actually going, so slides read.
    let dx = fx;
    let dz = fz;
    if (sp > 6) {
      const vxn = this.vx / sp;
      const vzn = this.vz / sp;
      const fwd = vxn * fx + vzn * fz > 0 ? 1 : -1;
      dx = lerp(fx, vxn * fwd, 0.45);
      dz = lerp(fz, vzn * fwd, 0.45);
      const l = Math.hypot(dx, dz);
      dx /= l;
      dz /= l;
    }
    const dist = 10.5 + sp * 0.075;
    const hgt = 3.5 + sp * 0.022;
    out.set(this.x - dx * dist, this.y + hgt, this.z - dz * dist);
    out.y = Math.max(out.y, heightAt(this.world, out.x, out.z) + 1.8);
    look.set(this.x + dx * 7, this.y + 1.5, this.z + dz * 7);
  }

  private updateCamera(dt: number) {
    const cam = this.camera;
    const want = new THREE.Vector3();
    const look = new THREE.Vector3();
    const sp = Math.hypot(this.vx, this.vz);
    if (this.mode === "title") {
      this.titleA += dt * 0.035;
      const r = 1500;
      want.set(Math.cos(this.titleA) * r - 300, 420 + Math.sin(this.titleA * 0.7) * 60, Math.sin(this.titleA) * r * 1.15);
      look.set(-150, 30, 150);
      cam.position.copy(want);
      this.camPos.copy(want);
      this.camLook.copy(look);
      cam.lookAt(look);
      cam.fov = 50;
      cam.updateProjectionMatrix();
      return;
    }
    if (this.mode === "intro") {
      this.introT = Math.min(1, this.introT + dt / (this.reduce ? 0.8 : 3.2));
      this.chaseTarget(want, look);
      const k = ease(this.introT);
      // Arc over, not straight through the hills.
      const mid = new THREE.Vector3().lerpVectors(this.introFrom, want, k);
      mid.y += Math.sin(k * Math.PI) * 120 * (1 - k);
      cam.position.copy(mid);
      this.camLook.lerpVectors(this.introLook, look, k);
      cam.lookAt(this.camLook);
      cam.fov = lerp(50, 60, k);
      cam.updateProjectionMatrix();
      this.camPos.copy(cam.position);
      if (this.introT >= 1) this.mode = "drive";
      return;
    }
    if (this.mode === "card") {
      this.orbitA += dt * 0.18;
      const r = 12.5;
      want.set(this.x + Math.sin(this.heading + 2.3 + this.orbitA) * r, this.y + 3.4, this.z + Math.cos(this.heading + 2.3 + this.orbitA) * r);
      want.y = Math.max(want.y, heightAt(this.world, want.x, want.z) + 1.6);
      look.set(this.x, this.y + 1.2, this.z);
    } else {
      this.chaseTarget(want, look);
    }
    const k = 1 - Math.exp(-dt * (this.reduce ? 3 : 5.5));
    this.camPos.lerp(want, k);
    this.camLook.lerp(look, 1 - Math.exp(-dt * 9));
    cam.position.copy(this.camPos);
    if (this.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * this.shake;
      cam.position.y += (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 1.8);
    }
    cam.lookAt(this.camLook);
    const fov = this.mode === "card" ? 46 : 58 + (this.reduce ? 0 : clamp(sp - 10, 0, 50) * 0.3);
    cam.fov = lerp(cam.fov, fov, 1 - Math.exp(-dt * 3));
    cam.updateProjectionMatrix();
  }

  /** From the aerial title view down to the car. */
  beginDrive() {
    this.introFrom.copy(this.camera.position);
    this.introLook.copy(this.camLook);
    this.introT = 0;
    this.mode = "intro";
    this.updateCamera(0);
  }

  setMode(m: Mode) {
    if (m === "drive" && this.mode === "intro") return;
    if (m === "card") this.orbitA = 0;
    this.mode = m;
  }

  /* ── Sky ─────────────────────────────────────────────────────────────── */

  private sunDir = new THREE.Vector3();

  private updateSky(force: boolean) {
    const a = ((this.hour - 6) / 12) * Math.PI;
    this.sunDir.set(Math.cos(a), Math.sin(a) * 0.92, -0.32 * Math.max(0.2, Math.sin(a)) - 0.1).normalize();
    const e = this.sunDir.y;
    const p = palette(e);
    const su = this.skyMat.uniforms;
    su.zenith.value.setRGB(p.zen[0], p.zen[1], p.zen[2]);
    su.horizon.value.setRGB(p.hor[0], p.hor[1], p.hor[2]);
    su.glow.value.setRGB(p.glow[0], p.glow[1], p.glow[2]);
    su.sunDir.value.copy(this.sunDir);
    su.sunColor.value.setRGB(p.sun[0], p.sun[1], p.sun[2]);
    su.sunAmt.value = clamp((e + 0.03) / 0.06, 0, 1);
    this.sky.position.copy(this.camera.position);
    const night = clamp((-e - 0.02) / 0.16, 0, 1);
    const above = e > -0.05;
    const lightDir = above ? this.sunDir : new THREE.Vector3(-this.sunDir.x, Math.abs(this.sunDir.y) + 0.3, 0.2).normalize();
    this.sun.color.setRGB(p.sun[0], p.sun[1], p.sun[2]);
    this.sun.intensity = p.si;
    this.sun.position.set(this.x + lightDir.x * 400, this.y + lightDir.y * 400, this.z + lightDir.z * 400);
    this.sun.target.position.set(this.x, this.y, this.z);
    this.sun.castShadow = this.quality === "high" && e > -0.02;
    this.hemi.color.setRGB(p.hemi[0], p.hemi[1], p.hemi[2]);
    this.hemi.groundColor.setRGB(p.hemi[0] * 0.45, p.hemi[1] * 0.4, p.hemi[2] * 0.32);
    this.hemi.intensity = p.hi;
    const fog = this.scene.fog as THREE.FogExp2;
    fog.color.setRGB(p.fog[0], p.fog[1], p.fog[2]);
    fog.density = this.mode === "title" ? 0.00022 : 0.00034;
    this.renderer.toneMappingExposure = p.exp;
    // The sky's own light is far brighter at noon than at dusk; keep its reflections in proportion.
    this.scene.environmentIntensity = 0.9;
    (this.stars.material as THREE.PointsMaterial).opacity = night * 0.95;
    this.stars.position.copy(this.camera.position);
    this.moon.position.set(this.camera.position.x - this.sunDir.x * 9000, this.camera.position.y + Math.max(1500, -this.sunDir.y * 9000), this.camera.position.z - this.sunDir.z * 9000 - 3000);
    (this.moon.material as THREE.SpriteMaterial).opacity = night * 0.9;
    this.scenery.night.value = clamp((0.12 - e) / 0.2, 0, 1);
    const wu = this.scenery.water;
    wu.time.value = this.time;
    wu.sunDir.value.copy(this.sunDir);
    wu.sunColor.value.setRGB(p.sun[0] * 1.6, p.sun[1] * 1.5, p.sun[2] * 1.4);
    wu.skyColor.value.setRGB(p.zen[0] * 1.4, p.zen[1] * 1.4, p.zen[2] * 1.4);
    wu.horizonColor.value.setRGB(lerp(p.hor[0], p.glow[0], 0.35), lerp(p.hor[1], p.glow[1], 0.35), lerp(p.hor[2], p.glow[2], 0.35));
    wu.fogColor.value.copy(fog.color);
    wu.fogDensity.value = fog.density;
    wu.light.value = clamp(p.si / 2.6 + p.hi * 0.4, 0.1, 1.2);
    this.car.beam.intensity = this.scenery.night.value * 260;
    this.car.head.emissiveIntensity = 1 + this.scenery.night.value * 5;
    if (this.bloom) this.bloom.strength = 0.28 + this.scenery.night.value * 0.55;
    // Reflections follow the sky, refreshed every so often.
    if (force || Math.abs(this.time - this.envAt) > 4) {
      this.envAt = this.time;
      const rt = this.pmrem.fromScene(this.envScene, 0, 1, 25000);
      this.scene.environment = rt.texture;
      this.envRT?.dispose();
      this.envRT = rt;
    }
  }

  /* ── GPS ─────────────────────────────────────────────────────────────── */

  setTarget(t: { x: number; z: number } | null) {
    this.target = t;
    this.routeAt = -99;
    if (this.waypoint) {
      this.scene.remove(this.waypoint);
      this.waypoint = null;
    }
    if (t) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture("waypoint"), depthTest: false, transparent: true, fog: false }));
      sp.position.set(t.x, heightAt(this.world, t.x, t.z) + 14, t.z);
      sp.renderOrder = 11;
      this.scene.add(sp);
      this.waypoint = sp;
    }
    if (!t) this.clearRoute();
  }

  getTarget() {
    return this.target;
  }

  private clearRoute() {
    if (this.routeMesh) {
      this.scene.remove(this.routeMesh);
      this.routeMesh.geometry.dispose();
      this.routeMesh = null;
    }
    this.routePts = null;
  }

  private updateRoute() {
    const goal = this.race
      ? this.world.checkpoints[Math.min(this.race.idx, 4)]
      : this.target;
    if (!goal || this.mode === "title") {
      if (this.routeMesh) this.clearRoute();
      return;
    }
    if (this.time - this.routeAt < 0.8) return;
    this.routeAt = this.time;
    const g = this.world.graph;
    const a = nearestNode(g, this.x + Math.sin(this.heading) * 8, this.z + Math.cos(this.heading) * 8);
    const b = nearestNode(g, goal.x, goal.z);
    if (!this.race && Math.hypot(this.x - goal.x, this.z - goal.z) < 14) {
      this.setTarget(null);
      return;
    }
    const nodes = route(g, a, b);
    if (nodes.length < 2) {
      this.clearRoute();
      return;
    }
    const pts = nodes.slice(0, 900).map((i) => [g.x[i], g.z[i]] as [number, number]);
    this.routePts = pts;
    const geo = ribbon(this.world, pts, 2.6, 0.42, false, 6);
    if (this.routeMesh) {
      this.routeMesh.geometry.dispose();
      this.routeMesh.geometry = geo;
    } else {
      this.routeMesh = new THREE.Mesh(geo, this.routeMat);
      this.routeMesh.renderOrder = 2;
      this.scene.add(this.routeMesh);
    }
  }

  /* ── The race ────────────────────────────────────────────────────────── */

  startRace() {
    const start = this.world.pois.find((p) => p.kind === "race")!;
    const first = this.world.checkpoints[0];
    this.x = start.x;
    this.z = start.z;
    this.heading = Math.atan2(first.x - start.x, first.z - start.z);
    this.vx = this.vz = 0;
    this.camPos.set(this.x - Math.sin(this.heading) * 12, this.y + 5, this.z - Math.cos(this.heading) * 12);
    this.race = { phase: "countdown", t0: this.time, idx: 0, lastN: 4 };
    this.poiCool.add("race");
    this.mode = "drive";
    this.routeAt = -99;
  }

  cancelRace() {
    this.race = null;
    this.rings.forEach((r) => (r.visible = false));
  }

  racing() {
    return !!this.race;
  }

  private updateRace() {
    const r = this.race;
    if (!r) return;
    const cps = this.world.checkpoints;
    this.rings.forEach((ring, i) => {
      ring.visible = i >= r.idx && i <= r.idx + 1;
      const cp = cps[i];
      ring.position.set(cp.x, heightAt(this.world, cp.x, cp.z) + 8.5, cp.z);
      ring.rotation.y = cp.heading;
      const m = ring.material as THREE.MeshBasicMaterial;
      m.opacity = i === r.idx ? 0.95 : 0.3;
      const s = i === r.idx ? 1 + 0.05 * Math.sin(this.time * 6) : 0.85;
      ring.scale.setScalar(s);
    });
    if (r.phase === "countdown") {
      const left = 3 - (this.time - r.t0);
      const n = Math.ceil(left);
      if (n !== r.lastN) {
        r.lastN = n;
        this.onEvent({ type: "countdown", n: Math.max(0, n) });
      }
      if (left <= 0) {
        r.phase = "run";
        r.t0 = this.time;
      }
      return;
    }
    const cp = cps[r.idx];
    if (Math.hypot(this.x - cp.x, this.z - cp.z) < 13) {
      const t = this.time - r.t0;
      this.rumble(0.3, 0.7, 120);
      if (r.idx === cps.length - 1) {
        this.onEvent({ type: "finish", time: t });
        this.cancelRace();
      } else {
        this.onEvent({ type: "checkpoint", index: r.idx, time: t });
        r.idx++;
        this.routeAt = -99;
      }
    }
  }

  /* ── Moving things around ────────────────────────────────────────────── */

  /** Put the car beside a place, facing along its road. */
  teleport(x: number, z: number, heading: number) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.vx = this.vz = 0;
    this.y = heightAt(this.world, x, z);
    this.placeCar();
    this.chaseTarget(this.camPos, this.camLook);
  }

  /** Nudge the car out of a marker before the card closes, so it does not re-open. */
  markVisited(id: string) {
    this.found.add(id);
    const m = this.markers.get(id);
    const poi = this.world.pois.find((p) => p.id === id);
    if (!m || !poi) return;
    (m.icon.material as THREE.SpriteMaterial).map = iconTexture(poi.kind, true);
    m.beam.uniforms.strength.value = 0.35;
  }

  setPaint(hex: number) {
    this.car.paint.color.setHex(hex);
  }

  setHour(h: number) {
    this.hour = h;
    this.envAt = -99;
  }

  hud(): Hud {
    if (this.time - this.placeAt > 0.5) {
      this.placeAt = this.time;
      let best = "";
      let bestD = Infinity;
      for (const t of TOWNS) {
        const d = Math.hypot(this.x - t.at[0], this.z - t.at[1]) / (t.r * 1.5);
        if (d < 1 && d < bestD) {
          bestD = d;
          best = t.name;
        }
      }
      if (!best) {
        let rd = Infinity;
        for (const r of this.world.roads) {
          for (let i = 0; i < r.pts.length; i += 3) {
            const d = Math.hypot(r.pts[i][0] - this.x, r.pts[i][1] - this.z);
            if (d < rd) {
              rd = d;
              best = rd < 12 ? r.name : "";
            }
          }
        }
        if (!best) best = sdfAt(this.world, this.x, this.z) < 40 ? "The beach" : "Cane fields";
      }
      this.place = best;
    }
    const r = this.race;
    return {
      speed: Math.hypot(this.vx, this.vz),
      gear: this.gear,
      rpm: this.rpm,
      throttle: this.throttleNow,
      slip: this.slip,
      offroad: this.offroad,
      coast: clamp(1 - sdfAt(this.world, this.x, this.z) / 140, 0, 1),
      x: this.x,
      z: this.z,
      heading: this.heading,
      hour: this.hour,
      place: this.place,
      race: r ? { time: r.phase === "run" ? this.time - r.t0 : 0, next: r.idx, countdown: r.phase === "countdown" ? Math.max(0, 3 - (this.time - r.t0)) : 0 } : null,
      route: this.routePts,
      driven: this.driven,
      top: this.top,
    };
  }

  nightness() {
    return this.scenery.night.value;
  }
}
