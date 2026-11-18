/**
 * Every sound on the island, synthesised in the browser: the car (engine,
 * tyres, wind, gravel), the island (waves on the reef, crickets after dark),
 * the interface, and a car radio with five stations of original music that
 * is composed as it plays. Nothing is sampled and no existing song is used;
 * every title and artist name is made up.
 *
 * The radio keeps time while you are tuned away, like a broadcast: tune back
 * and the song has moved on.
 */

type Chord = [number, "M" | "m" | "7" | "m7" | "M7" | "sus"];

interface Song {
  title: string;
  artist: string;
  root: number; // midi
  prog: Chord[];
  seed: number;
}

interface StepCtx {
  t: number;
  step: number; // within the bar
  bar: number; // within the song
  song: Song;
  chord: number[]; // midi notes of this bar's chord, root position around octave 3
  root: number; // midi of this bar's chord root, octave 2
  stepDur: number;
  section: "intro" | "a" | "b" | "outro";
  out: AudioNode;
  rand: () => number;
  motif: (number | null)[];
}

export interface Station {
  id: string;
  name: string;
  freq: string;
  tagline: string;
  color: string;
  bpm: number;
  div: number; // steps per beat
  swing: number;
  songs: Song[];
  ids: string[]; // what the DJ says when you tune in
  play: (s: StepCtx) => void;
  scale: number[];
}

const SONG_BARS = 48;

let ctx: AudioContext | null = null;
let master: GainNode;
let radioBus: GainNode;
let stationGain: GainNode;
let sfxBus: GainNode;
let carBus: GainNode;
let reverb: ConvolverNode;
let reverbSend: GainNode;
let delay: DelayNode;
let delaySend: GainNode;
let noiseBuf: AudioBuffer;
let timer: ReturnType<typeof setInterval> | null = null;

const prefs = { music: 0.7, sfx: 0.8, dj: true };
const PREF_KEY = "am-island-audio";

export function loadAudioPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
    if (typeof p.music === "number") prefs.music = p.music;
    if (typeof p.sfx === "number") prefs.sfx = p.sfx;
    if (typeof p.dj === "boolean") prefs.dj = p.dj;
  } catch {
    /* defaults */
  }
  return { ...prefs };
}

function savePrefs() {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    /* not saved */
  }
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/* ── Setup ─────────────────────────────────────────────────────────────── */

function impulse(c: AudioContext, seconds: number, decay: number) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return;
  }
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  const c = new AC();
  ctx = c;
  master = c.createGain();
  master.gain.value = 0.9;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 3;
  master.connect(comp).connect(c.destination);

  reverb = c.createConvolver();
  reverb.buffer = impulse(c, 2.6, 2.6);
  reverbSend = c.createGain();
  reverbSend.gain.value = 0.5;
  reverbSend.connect(reverb).connect(master);

  delay = c.createDelay(2);
  delay.delayTime.value = 0.36;
  const fb = c.createGain();
  fb.gain.value = 0.32;
  const dlp = c.createBiquadFilter();
  dlp.type = "lowpass";
  dlp.frequency.value = 2600;
  delaySend = c.createGain();
  delaySend.gain.value = 0.5;
  delaySend.connect(delay);
  delay.connect(dlp).connect(fb).connect(delay);
  dlp.connect(master);

  // The radio: a little thinner than hi-fi, as from a car's speakers.
  radioBus = c.createGain();
  radioBus.gain.value = prefs.music;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 55;
  const presence = c.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 2800;
  presence.gain.value = 2;
  stationGain = c.createGain();
  stationGain.gain.value = 0;
  stationGain.connect(hp).connect(presence).connect(radioBus).connect(master);

  sfxBus = c.createGain();
  sfxBus.gain.value = prefs.sfx;
  sfxBus.connect(master);
  carBus = c.createGain();
  carBus.gain.value = prefs.sfx * 0.9;
  carBus.connect(master);

  noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  buildCar(c);
  timer = setInterval(schedule, 30);
}

export function audioReady() {
  return !!ctx && ctx.state === "running";
}

export function setMusicVolume(v: number) {
  prefs.music = v;
  savePrefs();
  if (ctx) radioBus.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
}

export function setSfxVolume(v: number) {
  prefs.sfx = v;
  savePrefs();
  if (ctx) {
    sfxBus.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
    carBus.gain.setTargetAtTime(v * 0.9, ctx.currentTime, 0.05);
  }
}

export function setDj(on: boolean) {
  prefs.dj = on;
  savePrefs();
  if (!on) stopSpeech();
}

/** Mute everything for a moment (menus, the archery game). */
export function duckAll(on: boolean) {
  if (!ctx) return;
  master.gain.setTargetAtTime(on ? 0.0001 : 0.9, ctx.currentTime, 0.12);
}

export function pauseAudio(on: boolean) {
  if (!ctx) return;
  if (on) ctx.suspend().catch(() => {});
  else ctx.resume().catch(() => {});
}

/* ── Instruments ───────────────────────────────────────────────────────── */

function env(g: GainNode, t: number, a: number, peak: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function noiseSrc(t: number, len: number) {
  const s = ctx!.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  s.start(t, Math.random() * 1.5);
  s.stop(t + len + 0.05);
  return s;
}

function kick(t: number, out: AudioNode, gain = 1, tune = 1) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(150 * tune, t);
  o.frequency.exponentialRampToValueAtTime(44 * tune, t + 0.13);
  env(g, t, 0.003, 0.9 * gain, 0.34);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.4);
}

function snare(t: number, out: AudioNode, gain = 1, opts: { tone?: number; color?: number; len?: number; verb?: number } = {}) {
  const c = ctx!;
  const n = noiseSrc(t, opts.len ?? 0.2);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = opts.color ?? 1900;
  f.Q.value = 0.8;
  const g = c.createGain();
  env(g, t, 0.002, 0.5 * gain, opts.len ?? 0.18);
  n.connect(f).connect(g).connect(out);
  if (opts.verb) {
    const s = c.createGain();
    s.gain.value = opts.verb;
    g.connect(s).connect(reverbSend);
  }
  const o = c.createOscillator();
  const og = c.createGain();
  o.frequency.setValueAtTime(opts.tone ?? 200, t);
  o.frequency.exponentialRampToValueAtTime((opts.tone ?? 200) * 0.7, t + 0.08);
  env(og, t, 0.002, 0.35 * gain, 0.09);
  o.connect(og).connect(out);
  o.start(t);
  o.stop(t + 0.15);
}

function clap(t: number, out: AudioNode, gain = 1) {
  const c = ctx!;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 1150;
  f.Q.value = 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  for (let k = 0; k < 3; k++) {
    g.gain.setValueAtTime(0.5 * gain, t + k * 0.011);
    g.gain.exponentialRampToValueAtTime(0.05, t + k * 0.011 + 0.01);
  }
  g.gain.setValueAtTime(0.4 * gain, t + 0.034);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  noiseSrc(t, 0.25).connect(f).connect(g).connect(out);
  const s = c.createGain();
  s.gain.value = 0.25;
  g.connect(s).connect(reverbSend);
}

function hat(t: number, out: AudioNode, gain = 1, open = false) {
  const c = ctx!;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 7200;
  const g = c.createGain();
  env(g, t, 0.001, 0.22 * gain, open ? 0.24 : 0.035);
  noiseSrc(t, open ? 0.3 : 0.06).connect(f).connect(g).connect(out);
}

function shaker(t: number, out: AudioNode, gain = 1) {
  const c = ctx!;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 5200;
  f.Q.value = 1.1;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.16 * gain, t + 0.018);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
  noiseSrc(t, 0.1).connect(f).connect(g).connect(out);
}

function triangleBell(t: number, out: AudioNode, gain = 1, len = 0.6) {
  const c = ctx!;
  for (const [f, a] of [[2637, 1], [3951, 0.5], [5800, 0.25]] as const) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.value = f;
    env(g, t, 0.001, 0.05 * gain * a, len);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + len + 0.05);
  }
}

function frameDrum(t: number, out: AudioNode, gain = 1, slap = false) {
  const c = ctx!;
  if (slap) {
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 950;
    f.Q.value = 1.6;
    const g = c.createGain();
    env(g, t, 0.001, 0.42 * gain, 0.09);
    noiseSrc(t, 0.12).connect(f).connect(g).connect(out);
    const o = c.createOscillator();
    const og = c.createGain();
    o.frequency.setValueAtTime(330, t);
    o.frequency.exponentialRampToValueAtTime(240, t + 0.05);
    env(og, t, 0.001, 0.2 * gain, 0.06);
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + 0.1);
  } else {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(125, t);
    o.frequency.exponentialRampToValueAtTime(68, t + 0.2);
    env(g, t, 0.004, 0.7 * gain, 0.32);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.4);
  }
}

function synthBass(t: number, out: AudioNode, freq: number, len: number, gain = 1, opts: { type?: OscillatorType; cut?: number; envAmt?: number } = {}) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = opts.type ?? "sawtooth";
  o.frequency.value = freq;
  const sub = c.createOscillator();
  sub.frequency.value = freq / 2;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.Q.value = 4;
  const cut = opts.cut ?? 420;
  f.frequency.setValueAtTime(cut + (opts.envAmt ?? 1400), t);
  f.frequency.exponentialRampToValueAtTime(cut, t + Math.min(len, 0.18));
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.32 * gain, t + 0.006);
  g.gain.setValueAtTime(0.28 * gain, t + len * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  const sg = c.createGain();
  sg.gain.value = 0.6;
  o.connect(f).connect(g).connect(out);
  sub.connect(sg).connect(g);
  o.start(t);
  sub.start(t);
  o.stop(t + len + 0.05);
  sub.stop(t + len + 0.05);
}

function pad(t: number, out: AudioNode, notes: number[], len: number, gain = 1, cut = 1500) {
  const c = ctx!;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = cut;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.06 * gain, t + len * 0.3);
  g.gain.setValueAtTime(0.06 * gain, t + len * 0.75);
  g.gain.linearRampToValueAtTime(0.0001, t + len);
  f.connect(g).connect(out);
  const s = c.createGain();
  s.gain.value = 0.5;
  g.connect(s).connect(reverbSend);
  for (const m of notes)
    for (const det of [-8, 7]) {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = mtof(m);
      o.detune.value = det;
      o.connect(f);
      o.start(t);
      o.stop(t + len + 0.05);
    }
}

function pluck(t: number, out: AudioNode, freq: number, gain = 1, len = 0.3, type: OscillatorType = "square", cut = 2400, echo = 0.4) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(cut, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(200, cut / 4), t + len);
  const g = c.createGain();
  env(g, t, 0.003, 0.12 * gain, len);
  o.connect(f).connect(g).connect(out);
  if (echo > 0) {
    const s = c.createGain();
    s.gain.value = echo;
    g.connect(s).connect(delaySend);
  }
  o.start(t);
  o.stop(t + len + 0.05);
}

function lead(t: number, out: AudioNode, freq: number, len: number, gain = 1, opts: { type?: OscillatorType; cut?: number; vib?: number; echo?: number } = {}) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = opts.type ?? "sawtooth";
  o.frequency.value = freq;
  const o2 = c.createOscillator();
  o2.type = opts.type ?? "sawtooth";
  o2.frequency.value = freq;
  o2.detune.value = 9;
  const lfo = c.createOscillator();
  lfo.frequency.value = 5.4;
  const lg = c.createGain();
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(freq * (opts.vib ?? 0.008), t + Math.min(0.35, len));
  lfo.connect(lg);
  lg.connect(o.frequency);
  lg.connect(o2.frequency);
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = opts.cut ?? 2600;
  f.Q.value = 1;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.075 * gain, t + 0.02);
  g.gain.setValueAtTime(0.065 * gain, t + len * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.08);
  o.connect(f);
  o2.connect(f);
  f.connect(g).connect(out);
  const s = c.createGain();
  s.gain.value = opts.echo ?? 0.45;
  g.connect(s).connect(delaySend);
  const r = c.createGain();
  r.gain.value = 0.3;
  g.connect(r).connect(reverbSend);
  for (const n of [o, o2, lfo]) {
    n.start(t);
    n.stop(t + len + 0.15);
  }
}

function epiano(t: number, out: AudioNode, freq: number, len: number, gain = 1) {
  const c = ctx!;
  const car = c.createOscillator();
  car.frequency.value = freq;
  const mod = c.createOscillator();
  mod.frequency.value = freq * 2;
  const mg = c.createGain();
  mg.gain.setValueAtTime(freq * 1.2, t);
  mg.gain.exponentialRampToValueAtTime(freq * 0.05, t + 0.6);
  mod.connect(mg).connect(car.frequency);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.07 * gain, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.02 * gain, t + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  car.connect(g).connect(out);
  const s = c.createGain();
  s.gain.value = 0.35;
  g.connect(s).connect(reverbSend);
  car.start(t);
  mod.start(t);
  car.stop(t + len + 0.05);
  mod.stop(t + len + 0.05);
}

/** Plucked string, by Karplus-Strong, one cached buffer per note. */
const strings = new Map<number, AudioBuffer>();
function stringBuf(midi: number) {
  const c = ctx!;
  const hit = strings.get(midi);
  if (hit) return hit;
  const sr = c.sampleRate;
  const len = Math.floor(sr * 1.4);
  const buf = c.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const period = Math.max(2, Math.round(sr / mtof(midi)));
  let prev = 0;
  for (let i = 0; i < period; i++) {
    const v = Math.random() * 2 - 1;
    d[i] = (v + prev) * 0.5;
    prev = v;
  }
  for (let i = period; i < len; i++) d[i] = 0.5 * (d[i - period] + d[i - period + 1]) * 0.994;
  strings.set(midi, buf);
  return buf;
}

function pluckString(t: number, out: AudioNode, midi: number, gain = 1) {
  const c = ctx!;
  const s = c.createBufferSource();
  s.buffer = stringBuf(midi);
  const g = c.createGain();
  g.gain.value = 0.16 * gain;
  s.connect(g).connect(out);
  const r = c.createGain();
  r.gain.value = 0.2;
  g.connect(r).connect(reverbSend);
  s.start(t);
}

function reed(t: number, out: AudioNode, freq: number, len: number, gain = 1) {
  // A bright, slightly nasal reed: two detuned saws and a square an octave down.
  const c = ctx!;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 2100;
  f.Q.value = 2;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.06 * gain, t + 0.03);
  g.gain.setValueAtTime(0.055 * gain, t + len * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
  f.connect(g).connect(out);
  const lfo = c.createOscillator();
  lfo.frequency.value = 5.8;
  const lg = c.createGain();
  lg.gain.value = freq * 0.006;
  lfo.connect(lg);
  const parts: [OscillatorType, number, number][] = [["sawtooth", 1, -6], ["sawtooth", 1, 6], ["square", 0.5, 0]];
  for (const [type, mult, det] of parts) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq * mult;
    o.detune.value = det;
    lg.connect(o.frequency);
    o.connect(f);
    o.start(t);
    o.stop(t + len + 0.1);
  }
  lfo.start(t);
  lfo.stop(t + len + 0.1);
  const r = c.createGain();
  r.gain.value = 0.25;
  g.connect(r).connect(reverbSend);
}

function stab(t: number, out: AudioNode, notes: number[], gain = 1, len = 0.22) {
  const c = ctx!;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.setValueAtTime(3800, t);
  f.frequency.exponentialRampToValueAtTime(700, t + len);
  const g = c.createGain();
  env(g, t, 0.002, 0.07 * gain, len);
  f.connect(g).connect(out);
  const s = c.createGain();
  s.gain.value = 0.35;
  g.connect(s).connect(delaySend);
  for (const m of notes)
    for (const type of ["sawtooth", "square"] as OscillatorType[]) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = mtof(m);
      o.detune.value = type === "square" ? 5 : -5;
      o.connect(f);
      o.start(t);
      o.stop(t + len + 0.05);
    }
}

function crackle(t: number, out: AudioNode, len: number) {
  // Dust on a record.
  const c = ctx!;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) if (Math.random() < 0.0009) d[i] = (Math.random() * 2 - 1) * 0.7;
  const s = c.createBufferSource();
  s.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 1800;
  const g = c.createGain();
  g.gain.value = 0.18;
  s.connect(f).connect(g).connect(out);
  s.start(t);
}

function riser(t: number, out: AudioNode, len: number, gain = 1) {
  const c = ctx!;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 2;
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(7000, t + len);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.16 * gain, t + len);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
  noiseSrc(t, len + 0.1).connect(f).connect(g).connect(out);
}

/* ── Harmony helpers ───────────────────────────────────────────────────── */

const QUAL: Record<Chord[1], number[]> = {
  M: [0, 4, 7],
  m: [0, 3, 7],
  "7": [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  M7: [0, 4, 7, 11],
  sus: [0, 5, 7],
};

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    s ^= s >>> 13;
    return (s >>> 0) / 4294967296;
  };
}

function makeMotif(seed: number, slots: number, density: number) {
  const r = seeded(seed);
  const out: (number | null)[] = [];
  let deg = 2;
  for (let i = 0; i < slots; i++) {
    if (r() < density) {
      deg = Math.max(0, Math.min(7, deg + Math.round((r() - 0.5) * 4)));
      out.push(deg);
    } else out.push(null);
  }
  return out;
}

const scaleNote = (root: number, scale: number[], deg: number) =>
  root + scale[((deg % scale.length) + scale.length) % scale.length] + 12 * Math.floor(deg / scale.length);

/* ── The stations ──────────────────────────────────────────────────────── */

const MINOR_PENTA = [0, 3, 5, 7, 10];
const MAJOR_PENTA = [0, 2, 4, 7, 9];

export const STATIONS: Station[] = [
  {
    id: "lagoon",
    name: "Lagoon FM",
    freq: "88.2",
    tagline: "Synth and sunsets",
    color: "#ff5c9a",
    bpm: 100,
    div: 4,
    swing: 0,
    scale: MINOR_PENTA,
    ids: [
      "Lagoon FM. Windows down, sun low, keep it between the lines.",
      "You are on Lagoon FM. The coast road was made for this one.",
      "Lagoon FM. Neon on the water, all night long.",
    ],
    songs: [
      { title: "Coastal Road", artist: "Night Archer", root: 57, seed: 11, prog: [[0, "m"], [-4, "M"], [3, "M"], [-2, "M"]] },
      { title: "Last Light on Le Morne", artist: "The Reef Line", root: 52, seed: 23, prog: [[0, "m"], [5, "m"], [-4, "M"], [-2, "M"]] },
      { title: "Seventy Metres", artist: "Lumière Bleue", root: 50, seed: 37, prog: [[-4, "M"], [-2, "M"], [0, "m"], [0, "m"]] },
    ],
    play(s) {
      const { t, step, out, section, chord, root } = s;
      const full = section === "a" || section === "b";
      if (step % 8 === 0) kick(t, out, 0.95);
      if (step % 8 === 4 && section !== "intro") snare(t, out, 0.9, { len: 0.28, verb: 0.9, color: 1600 });
      if (step % 2 === 0) hat(t, out, step % 4 === 2 ? 0.7 : 0.35);
      if (section !== "intro" && step % 2 === 0) synthBass(t, out, mtof(root + (step % 4 === 2 ? 12 : 0)), s.stepDur * 1.8, 0.9, { cut: 300, envAmt: 900 });
      if (step === 0) pad(t, out, chord.map((m) => m + 12), s.stepDur * 16, full ? 1 : 0.7, section === "outro" ? 900 : 1600);
      if ((section === "b" || (section === "a" && s.bar % 8 >= 4)) && step % 1 === 0) {
        const n = chord[step % chord.length] + 24 + (step % 8 >= 4 ? 12 : 0);
        pluck(t, out, mtof(n), 0.55, 0.16, "square", 3000, 0.35);
      }
      if (section === "b" && step % 2 === 0) {
        const m = s.motif[(s.bar % 2) * 8 + step / 2];
        if (m !== null) lead(t, out, mtof(scaleNote(s.song.root + 12, this.scale, m)), s.stepDur * 2.6, 1);
      }
      if (s.bar % 16 === 15 && step === 8) riser(t, out, s.stepDur * 8, 0.8);
    },
  },
  {
    id: "ravanne",
    name: "Ravanne Radio",
    freq: "91.7",
    tagline: "Island rhythm",
    color: "#ffb547",
    bpm: 118,
    div: 3,
    swing: 0,
    scale: MAJOR_PENTA,
    ids: [
      "Ravanne Radio. Drums by the fire, feet in the sand.",
      "This is Ravanne Radio, island rhythm all evening.",
      "Ravanne Radio. Turn it up, the tide is coming in.",
    ],
    songs: [
      { title: "Sable Doré", artist: "Les Cannes Sucrées", root: 62, seed: 5, prog: [[0, "M"], [5, "M"], [7, "M"], [0, "M"]] },
      { title: "Coin de Mire", artist: "Ravanne Club", root: 57, seed: 9, prog: [[0, "M"], [7, "M"], [9, "m"], [5, "M"]] },
      { title: "Marée Haute", artist: "Ti Lagon", root: 64, seed: 17, prog: [[0, "M"], [0, "M"], [5, "M"], [7, "7"]] },
    ],
    play(s) {
      // Twelve steps a bar: four beats of three.
      const { t, step, out, section, chord, root } = s;
      const low = [0, 6, 9];
      const slap = [2, 3, 5, 8, 11];
      if (low.includes(step)) frameDrum(t, out, step === 0 ? 1 : 0.75);
      if (slap.includes(step) && section !== "intro") frameDrum(t, out, step % 3 === 2 ? 0.7 : 0.45, true);
      shaker(t, out, step % 3 === 0 ? 1 : 0.55);
      if (step % 3 === 2 && section !== "outro") triangleBell(t, out, step === 5 || step === 11 ? 0.9 : 0.45, 0.35);
      if (section !== "intro") {
        if (step === 0) synthBass(t, out, mtof(root), s.stepDur * 2.5, 0.85, { type: "triangle", cut: 600, envAmt: 600 });
        if (step === 6) synthBass(t, out, mtof(root + 7), s.stepDur * 2.5, 0.75, { type: "triangle", cut: 600, envAmt: 600 });
        if (step === 9 || step === 10) synthBass(t, out, mtof(root + (step === 9 ? 4 : 5)), s.stepDur, 0.55, { type: "triangle", cut: 600, envAmt: 400 });
        // Strummed strings on the off beats.
        if (step === 3 || step === 9 || step === 5 || step === 11) {
          chord.forEach((m, k) => pluckString(t + k * 0.012, out, m + 12, step % 6 === 3 ? 0.9 : 0.55));
        }
      }
      if ((section === "b" || (section === "a" && s.bar % 8 >= 6)) && step % 3 === 0) {
        const m = s.motif[(s.bar % 2) * 4 + step / 3];
        if (m !== null) reed(t, out, mtof(scaleNote(s.song.root + 12, this.scale, m)), s.stepDur * 2.4, 1);
      }
    },
  },
  {
    id: "lofi",
    name: "Port Louis Lo-Fi",
    freq: "96.4",
    tagline: "Slow beats for slow traffic",
    color: "#86d7c4",
    bpm: 80,
    div: 4,
    swing: 0.16,
    scale: MINOR_PENTA,
    ids: [
      "Port Louis Lo-Fi. Slow beats for slow traffic.",
      "You found Port Louis Lo-Fi. Take the long way home.",
      "Lo-fi from the capital. Rain or shine, mostly shine.",
    ],
    songs: [
      { title: "Rain on the Waterfront", artist: "Quiet Harbour", root: 50, seed: 41, prog: [[2, "m7"], [7, "7"], [0, "M7"], [9, "m7"]] },
      { title: "Code Review at 2am", artist: "Soft Compile", root: 53, seed: 43, prog: [[0, "M7"], [-3, "m7"], [2, "m7"], [7, "7"]] },
      { title: "Tea at Ebène", artist: "Cane Field Tapes", root: 48, seed: 47, prog: [[9, "m7"], [5, "M7"], [0, "M7"], [7, "sus"]] },
    ],
    play(s) {
      const { t, step, out, section, chord, root } = s;
      const lp = out;
      if (step === 0 || step === 10 || (step === 7 && s.bar % 2 === 1)) kick(t, lp, 0.75, 0.9);
      if ((step === 4 || step === 12) && section !== "intro") snare(t, lp, 0.6, { color: 1300, len: 0.16, tone: 180 });
      if (step % 2 === 0) hat(t, lp, step % 4 === 0 ? 0.45 : 0.25);
      if (step === 0) {
        crackle(t, out, s.stepDur * 16);
        chord.forEach((m, k) => epiano(t + k * 0.02, lp, mtof(m + 12), s.stepDur * 7, 0.9));
      }
      if (step === 10 && section !== "intro") chord.forEach((m) => epiano(t, lp, mtof(m + 12), s.stepDur * 4, 0.55));
      if (section !== "intro" && (step === 0 || step === 6 || step === 11))
        synthBass(t, lp, mtof(root + (step === 11 ? 7 : 0)), s.stepDur * (step === 0 ? 5 : 3), 0.8, { type: "sine", cut: 500, envAmt: 100 });
      if (section === "b" && step % 2 === 0) {
        const m = s.motif[(s.bar % 2) * 8 + step / 2];
        if (m !== null) pluckString(t, lp, scaleNote(s.song.root + 24, this.scale, m), 0.7);
      }
    },
  },
  {
    id: "cyclone",
    name: "Cyclone 103",
    freq: "103.1",
    tagline: "Warning level: maximum",
    color: "#4fd2ff",
    bpm: 124,
    div: 4,
    swing: 0,
    scale: MINOR_PENTA,
    ids: [
      "Cyclone one oh three. Warning level: maximum.",
      "You are in the eye of Cyclone one oh three.",
      "Cyclone one oh three. Batten down, turn it up.",
    ],
    songs: [
      { title: "Trade Winds", artist: "Class Four", root: 53, seed: 61, prog: [[0, "m"], [-2, "M"], [-4, "M"], [-2, "M"]] },
      { title: "Night Ferry", artist: "Port Signal", root: 55, seed: 67, prog: [[0, "m7"], [0, "m7"], [5, "m7"], [3, "M7"]] },
      { title: "Warning Level", artist: "Low Pressure", root: 50, seed: 71, prog: [[0, "m"], [3, "M"], [-2, "M"], [-4, "M"]] },
    ],
    play(s) {
      const { t, step, out, section, chord, root } = s;
      const drop = section === "a" || section === "b";
      if (step % 4 === 0 && section !== "intro") kick(t, out, 1);
      if (step % 4 === 0 && section === "intro" && s.bar >= 2) kick(t, out, 0.7);
      if ((step === 4 || step === 12) && drop) clap(t, out, 0.9);
      if (step % 4 === 2) hat(t, out, 0.7, true);
      if (step % 2 === 1) hat(t, out, 0.3);
      if (step % 4 === 2 && section !== "intro") synthBass(t, out, mtof(root + 12), s.stepDur * 1.6, 0.9, { cut: 380, envAmt: 2200 });
      if (drop && [3, 6, 10, 14].includes(step) && (section === "b" || s.bar % 2 === 1)) stab(t, out, chord.map((m) => m + 24), 1);
      if (step === 0) pad(t, out, chord.map((m) => m + 12), s.stepDur * 16, 0.6, section === "b" ? 2400 : 1100);
      if (section === "b" && step % 2 === 0) {
        const m = s.motif[(s.bar % 2) * 8 + step / 2];
        if (m !== null) pluck(t, out, mtof(scaleNote(s.song.root + 24, this.scale, m)), 0.9, 0.2, "sawtooth", 4000, 0.5);
      }
      if (s.bar % 8 === 7 && step === 0) riser(t, out, s.stepDur * 16, 1);
    },
  },
  {
    id: "talk",
    name: "Talk 99",
    freq: "99.0",
    tagline: "The island's talk show",
    color: "#b98bff",
    bpm: 70,
    div: 4,
    swing: 0,
    scale: MAJOR_PENTA,
    ids: ["Talk ninety nine. Today: the developer who drives his own portfolio."],
    songs: [{ title: "The Morning Brief", artist: "Talk 99", root: 55, seed: 3, prog: [[0, "M7"], [5, "M7"], [-3, "m7"], [2, "m7"]] }],
    play(s) {
      // A quiet bed under the voice.
      if (s.step === 0) pad(s.t, s.out, s.chord.map((m) => m + 12), s.stepDur * 16, 0.45, 900);
      if (s.step === 0 || s.step === 8) epiano(s.t, s.out, mtof(s.chord[s.step === 0 ? 0 : 2] + 24), s.stepDur * 6, 0.35);
    },
  },
];

/* ── Tuning and the scheduler ──────────────────────────────────────────── */

let current = -1; // -1 is off
let stationOffset = 0;
let nextStep = 0; // global step index in station time
let lastSong = "";
const listeners = {
  nowPlaying: null as null | ((info: { station: Station | null; song: Song | null }) => void),
  subtitle: null as null | ((text: string | null, who: string) => void),
};

export function onNowPlaying(fn: typeof listeners.nowPlaying) {
  listeners.nowPlaying = fn;
}
export function onSubtitle(fn: typeof listeners.subtitle) {
  listeners.subtitle = fn;
}

const stepDurOf = (st: Station) => 60 / st.bpm / st.div;
const stepsPerBar = (st: Station) => st.div * 4;

export function currentStation() {
  return current;
}

/**
 * Tune the radio. `preview` is the console playing the game's theme while its
 * tile is focused: no static, no presenter, quieter, and a slow fade in.
 */
export function tune(index: number, { preview = false }: { preview?: boolean } = {}) {
  if (!ctx) return;
  stopSpeech();
  const c = ctx;
  const now = c.currentTime;
  current = index;
  lastSong = "";
  stationGain.gain.cancelScheduledValues(now);
  stationGain.gain.setValueAtTime(stationGain.gain.value, now);
  stationGain.gain.linearRampToValueAtTime(0, now + (preview ? 0.6 : 0.06));
  if (index >= 0 && preview) {
    const st = STATIONS[index];
    stationOffset = 1000 + index * 377;
    nextStep = Math.ceil((now + 0.1 + stationOffset) / stepDurOf(st));
    stationGain.gain.setValueAtTime(0, now + 0.1);
    stationGain.gain.linearRampToValueAtTime(0.55, now + 2.2);
    return;
  }
  if (index >= 0) {
    static_(now, 0.32);
    stationGain.gain.setValueAtTime(0, now + 0.3);
    stationGain.gain.linearRampToValueAtTime(1, now + 0.75);
    const st = STATIONS[index];
    // Each station has been broadcasting since its own made-up start time.
    stationOffset = 1000 + index * 377;
    nextStep = Math.ceil((now + 0.3 + stationOffset) / stepDurOf(st));
    if (prefs.dj && st.id !== "talk") {
      const line = st.ids[Math.floor(Math.random() * st.ids.length)];
      setTimeout(() => current === index && speak(line, st.name), 900);
    }
    if (st.id === "talk") setTimeout(() => current === index && talkNext(), 1400);
  } else {
    listeners.nowPlaying?.({ station: null, song: null });
  }
}

function static_(t: number, len: number) {
  const c = ctx!;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.Q.value = 0.7;
  f.frequency.setValueAtTime(3000, t);
  f.frequency.exponentialRampToValueAtTime(800, t + len);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.09 * prefs.music, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  noiseSrc(t, len).connect(f).connect(g).connect(master);
}

function schedule() {
  if (!ctx || current < 0 || ctx.state !== "running") return;
  const st = STATIONS[current];
  const sd = stepDurOf(st);
  const spb = stepsPerBar(st);
  const horizon = ctx.currentTime + 0.18;
  while (nextStep * sd - stationOffset < horizon) {
    const g = nextStep;
    const barGlobal = Math.floor(g / spb);
    const step = g % spb;
    const songIdx = Math.floor(barGlobal / SONG_BARS) % st.songs.length;
    const song = st.songs[songIdx];
    const bar = barGlobal % SONG_BARS;
    const [deg, q] = song.prog[bar % song.prog.length];
    const chordRoot = song.root + deg;
    const chord = QUAL[q].map((i) => chordRoot - 12 + i);
    const section: StepCtx["section"] = bar < 4 ? "intro" : bar < 20 ? "a" : bar < 36 ? "b" : bar < 44 ? "a" : "outro";
    let t = g * sd - stationOffset;
    if (st.swing && step % 2 === 1) t += st.swing * sd;
    if (t > ctx.currentTime - 0.01) {
      const key = `${st.id}:${songIdx}:${Math.floor(barGlobal / SONG_BARS)}`;
      if (key !== lastSong) {
        lastSong = key;
        listeners.nowPlaying?.({ station: st, song });
      }
      try {
        st.play({
          t: Math.max(t, ctx.currentTime),
          step,
          bar,
          song,
          chord,
          root: chordRoot - 24,
          stepDur: sd,
          section,
          out: stationGain,
          rand: Math.random,
          motif: motifFor(song, st.div),
        });
      } catch {
        /* one missed note is better than a stopped radio */
      }
    }
    nextStep++;
  }
}

const motifs = new Map<string, (number | null)[]>();
function motifFor(song: Song, div: number) {
  const key = song.title;
  let m = motifs.get(key);
  if (!m) {
    m = makeMotif(song.seed, div === 3 ? 8 : 16, 0.6);
    motifs.set(key, m);
  }
  return m;
}

/* ── The DJ ────────────────────────────────────────────────────────────── */

let talkLines: string[] = [];
let talkIndex = 0;
let talkTimer: ReturnType<typeof setTimeout> | null = null;

export function setTalkScript(lines: string[]) {
  talkLines = lines;
  talkIndex = 0;
}

function talkNext() {
  if (current < 0 || STATIONS[current].id !== "talk" || !talkLines.length) return;
  const line = talkLines[talkIndex % talkLines.length];
  talkIndex++;
  speak(line, "Talk 99", () => {
    talkTimer = setTimeout(talkNext, 1600);
  });
}

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  return (
    voices.find((v) => /en-GB/i.test(v.lang) && /male|ryan|daniel|george/i.test(v.name)) ??
    voices.find((v) => /en-GB/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null
  );
}

function speak(text: string, who: string, done?: () => void) {
  listeners.subtitle?.(text, who);
  const finish = () => {
    if (ctx) stationGain.gain.setTargetAtTime(1, ctx.currentTime, 0.3);
    listeners.subtitle?.(null, who);
    done?.();
  };
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!prefs.dj && who !== "Talk 99") {
    setTimeout(() => listeners.subtitle?.(null, who), 2600);
    return;
  }
  if (!synth || prefs.music < 0.02) {
    // No voice here: the words still show, at reading pace.
    talkTimer = setTimeout(finish, 1200 + text.length * 55);
    return;
  }
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1.04;
    u.pitch = 0.92;
    u.volume = Math.min(1, prefs.music * 1.3);
    u.onstart = () => ctx && stationGain.gain.setTargetAtTime(0.3, ctx.currentTime, 0.15);
    u.onend = finish;
    u.onerror = finish;
    synth.speak(u);
  } catch {
    finish();
  }
}

function stopSpeech() {
  if (talkTimer) clearTimeout(talkTimer);
  talkTimer = null;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* nothing to stop */
  }
  listeners.subtitle?.(null, "");
}

/* ── The car and the island ────────────────────────────────────────────── */

let eng: { o1: OscillatorNode; o2: OscillatorNode; o3: OscillatorNode; f: BiquadFilterNode; g: GainNode } | null = null;
let tyre: GainNode;
let gravel: GainNode;
let wind: GainNode;
let waves: GainNode;
let crickets: GainNode;
let hornNodes: OscillatorNode[] = [];
let hornGain: GainNode | null = null;

function loopNoise(c: AudioContext, type: BiquadFilterType, freq: number, q: number) {
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.value = 0;
  s.connect(f).connect(g).connect(carBus);
  s.start();
  return g;
}

function buildCar(c: AudioContext) {
  const o1 = c.createOscillator();
  o1.type = "sawtooth";
  const o2 = c.createOscillator();
  o2.type = "square";
  const o3 = c.createOscillator();
  o3.type = "sine";
  const shaper = c.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * 2 - 1;
    curve[i] = Math.tanh(x * 2.4);
  }
  shaper.curve = curve;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.Q.value = 3;
  const g = c.createGain();
  g.gain.value = 0;
  const m1 = c.createGain();
  m1.gain.value = 0.5;
  const m2 = c.createGain();
  m2.gain.value = 0.35;
  const m3 = c.createGain();
  m3.gain.value = 0.7;
  o1.connect(m1).connect(shaper);
  o2.connect(m2).connect(shaper);
  o3.connect(m3).connect(f);
  shaper.connect(f).connect(g).connect(carBus);
  o1.start();
  o2.start();
  o3.start();
  eng = { o1, o2, o3, f, g };

  tyre = loopNoise(c, "bandpass", 1500, 5);
  gravel = loopNoise(c, "lowpass", 200, 0.7);
  wind = loopNoise(c, "bandpass", 520, 0.6);
  waves = loopNoise(c, "lowpass", 650, 0.5);

  // Crickets: a high tone, chopped fast, swelling slowly.
  const cr = c.createOscillator();
  cr.frequency.value = 4400;
  const chop = c.createOscillator();
  chop.type = "square";
  chop.frequency.value = 22;
  const chopG = c.createGain();
  chopG.gain.value = 0.5;
  const amp = c.createGain();
  amp.gain.value = 0.5;
  chop.connect(chopG).connect(amp.gain);
  crickets = c.createGain();
  crickets.gain.value = 0;
  cr.connect(amp).connect(crickets).connect(carBus);
  cr.start();
  chop.start();
}

let wavePhase = 0;

/** Called every frame with the car's state. */
export function carSound(s: { speed: number; rpm: number; throttle: number; slip: number; offroad: number; coast: number; night: number; active: boolean }) {
  if (!ctx || !eng) return;
  const t = ctx.currentTime;
  const on = s.active ? 1 : 0;
  const f = 34 + s.rpm * 118;
  eng.o1.frequency.setTargetAtTime(f, t, 0.03);
  eng.o2.frequency.setTargetAtTime(f * 0.5, t, 0.03);
  eng.o3.frequency.setTargetAtTime(f * 0.5, t, 0.03);
  eng.f.frequency.setTargetAtTime(240 + s.rpm * 1300 * (0.45 + s.throttle * 0.55), t, 0.05);
  eng.g.gain.setTargetAtTime(on * (0.05 + s.throttle * 0.06 + s.rpm * 0.04), t, 0.06);
  const sp = Math.min(1, s.speed / 56);
  tyre.gain.setTargetAtTime(on * Math.max(0, s.slip - 0.35) * 0.22 * Math.min(1, s.speed / 10), t, 0.05);
  gravel.gain.setTargetAtTime(on * s.offroad * Math.min(1, s.speed / 20) * 0.32, t, 0.08);
  wind.gain.setTargetAtTime(on * sp * sp * 0.09, t, 0.1);
  wavePhase += 0.016;
  const swell = 0.55 + 0.45 * Math.sin(wavePhase * 0.8) * Math.sin(wavePhase * 0.31 + 1);
  waves.gain.setTargetAtTime(s.coast * 0.16 * swell, t, 0.3);
  crickets.gain.setTargetAtTime(s.night * (1 - s.coast) * 0.012 * (0.6 + 0.4 * Math.sin(wavePhase * 0.5)), t, 0.4);
}

export function horn(on: boolean) {
  if (!ctx) return;
  const c = ctx;
  if (on && !hornGain) {
    hornGain = c.createGain();
    hornGain.gain.value = 0.0001;
    hornGain.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 0.02);
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1800;
    hornGain.connect(f).connect(sfxBus);
    hornNodes = [349, 440].map((fr) => {
      const o = c.createOscillator();
      o.type = "square";
      o.frequency.value = fr;
      o.connect(hornGain!);
      o.start();
      return o;
    });
  } else if (!on && hornGain) {
    const g = hornGain;
    g.gain.setTargetAtTime(0.0001, c.currentTime, 0.03);
    hornNodes.forEach((o) => o.stop(c.currentTime + 0.15));
    hornNodes = [];
    hornGain = null;
  }
}

/* ── Interface sounds ──────────────────────────────────────────────────── */

function tone(freq: number, len: number, opts: { type?: OscillatorType; gain?: number; at?: number; to?: number; verb?: number } = {}) {
  if (!ctx) return;
  const c = ctx;
  const t = c.currentTime + (opts.at ?? 0);
  const o = c.createOscillator();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + len);
  const g = c.createGain();
  env(g, t, 0.004, opts.gain ?? 0.12, len);
  o.connect(g).connect(sfxBus);
  if (opts.verb) {
    const s = c.createGain();
    s.gain.value = opts.verb;
    g.connect(s).connect(reverbSend);
  }
  o.start(t);
  o.stop(t + len + 0.05);
}

export const sfx = {
  move: () => tone(1250, 0.04, { gain: 0.04, type: "triangle" }),
  select: () => {
    tone(880, 0.08, { gain: 0.08, type: "triangle" });
    tone(1320, 0.12, { gain: 0.06, type: "triangle", at: 0.05 });
  },
  back: () => tone(520, 0.1, { gain: 0.07, type: "triangle", to: 380 }),
  phone: () => {
    tone(1568, 0.14, { gain: 0.08, verb: 0.2 });
    tone(2093, 0.22, { gain: 0.08, at: 0.11, verb: 0.2 });
  },
  notify: () => {
    tone(1318, 0.18, { gain: 0.09, verb: 0.3 });
    tone(1760, 0.3, { gain: 0.09, at: 0.13, verb: 0.3 });
  },
  arrow: () => [76, 80, 83, 88, 92].forEach((m, i) => tone(mtof(m), 0.5, { gain: 0.07, at: i * 0.06, verb: 0.6 })),
  found: () => {
    if (!ctx) return;
    kick(ctx.currentTime, sfxBus, 1.2, 0.7);
    riser(ctx.currentTime, sfxBus, 0.25, 0.6);
    [62, 69, 74, 78, 81].forEach((m, i) => tone(mtof(m), 1.6, { gain: 0.05, type: "triangle", at: 0.04 * i, verb: 0.8 }));
  },
  checkpoint: () => {
    tone(880, 0.09, { gain: 0.1, type: "square" });
    tone(1319, 0.16, { gain: 0.09, type: "square", at: 0.08 });
  },
  count: (go: boolean) => tone(go ? 880 : 440, go ? 0.5 : 0.18, { gain: 0.12, type: "square" }),
  finish: () => [67, 72, 76, 79, 84].forEach((m, i) => tone(mtof(m), 0.6, { gain: 0.08, type: "square", at: i * 0.09, verb: 0.4 })),
  bump: (s: number) => {
    if (!ctx) return;
    kick(ctx.currentTime, sfxBus, 0.6 + s * 0.8, 0.6);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    const g = ctx.createGain();
    env(g, ctx.currentTime, 0.002, 0.3 * s, 0.25);
    noiseSrc(ctx.currentTime, 0.3).connect(f).connect(g).connect(sfxBus);
  },
  typeKey: () => tone(1900, 0.025, { gain: 0.035, type: "triangle" }),
};

export function disposeAudio() {
  stopSpeech();
  if (timer) clearInterval(timer);
  timer = null;
  ctx?.close().catch(() => {});
  ctx = null;
  eng = null;
  current = -1;
}
