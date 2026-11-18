/**
 * The console's audio: interface sounds and background music, all
 * synthesised in the browser with Web Audio. Nothing is sampled and nothing
 * is borrowed from any console maker; the music is this site's own,
 * generated as it plays.
 *
 * The music is a slow ambient loop: soft pad chords, a low root, and sparse
 * bells that echo into a long reverb. Each tile on the home screen has its
 * own key (`setMood`), so moving along the row shifts the music a little, the
 * way a console plays each game's theme when its tile is focused.
 *
 * Browsers only allow audio after a gesture, which the boot screen's "press
 * any button" provides. Music, sounds and volume are remembered.
 */

const KEYS = { sfx: "am-console-sound", music: "am-console-music", volume: "am-console-volume" };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let padFilter: BiquadFilterNode | null = null;
let bellBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noise: AudioBuffer | null = null;
let reverbIn: AudioNode | null = null;

let sfxOn = true;
let musicOn = true;
let volume = 0.6;
let ducked = false;
let playing = false;
let mood = 0;

/* ── Preferences ───────────────────────────────────────────────────────── */

export function loadPrefs() {
  try {
    sfxOn = localStorage.getItem(KEYS.sfx) !== "off";
    musicOn = localStorage.getItem(KEYS.music) !== "off";
    const v = parseFloat(localStorage.getItem(KEYS.volume) ?? "");
    if (v >= 0 && v <= 1) volume = v;
  } catch {
    /* storage blocked: defaults for this visit */
  }
  return { sfx: sfxOn, music: musicOn, volume };
}

const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* the choice just will not persist */
  }
};

export function setSfx(on: boolean) {
  sfxOn = on;
  save(KEYS.sfx, on ? "on" : "off");
}

export function setMusic(on: boolean) {
  musicOn = on;
  save(KEYS.music, on ? "on" : "off");
  if (on) startMusic();
  else stopMusic();
}

export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, Math.round(v * 10) / 10));
  save(KEYS.volume, String(volume));
  applyMusicGain();
  return volume;
}

/** Lower the music while something else has the stage (the game). */
export function duckMusic(on: boolean) {
  ducked = on;
  applyMusicGain();
}

/** Each tile has its own key. Takes effect on the next chord. */
export function setMood(index: number) {
  mood = index;
}

/* ── The audio graph ───────────────────────────────────────────────────── */

function impulse(c: AudioContext, seconds: number) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return buf;
}

function build(c: AudioContext) {
  master = c.createGain();
  master.connect(c.destination);

  const reverb = c.createConvolver();
  reverb.buffer = impulse(c, 3.4);
  const wet = c.createGain();
  wet.gain.value = 0.55;
  reverb.connect(wet).connect(master);
  reverbIn = reverb;

  musicBus = c.createGain();
  musicBus.gain.value = 0;
  musicBus.connect(master);
  musicBus.connect(reverb);

  padFilter = c.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 1100;
  padFilter.Q.value = 0.6;
  padFilter.connect(musicBus);
  // the filter breathes slowly, so the pad never sits completely still
  const lfo = c.createOscillator();
  const lfoAmt = c.createGain();
  lfo.frequency.value = 0.05;
  lfoAmt.gain.value = 380;
  lfo.connect(lfoAmt).connect(padFilter.frequency);
  lfo.start();

  bellBus = c.createGain();
  const echo = c.createDelay(1);
  echo.delayTime.value = 0.42;
  const feedback = c.createGain();
  feedback.gain.value = 0.38;
  bellBus.connect(musicBus);
  bellBus.connect(echo);
  echo.connect(feedback).connect(echo);
  echo.connect(musicBus);

  sfxBus = c.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);

  const len = c.sampleRate;
  noise = c.createBuffer(1, len, c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
}

function applyMusicGain() {
  if (!ctx || !musicBus) return;
  const target = playing ? volume * 0.55 * (ducked ? 0.32 : 1) : 0;
  musicBus.gain.setTargetAtTime(target, ctx.currentTime, 0.6);
}

/**
 * Whether sound can actually play. Browsers keep audio locked until a key
 * press, click or tap; a gamepad button does not count. "locked" means the
 * console has asked for sound but the browser has not allowed it yet.
 */
export function audioState(): "none" | "locked" | "running" {
  if (!ctx) return "none";
  return ctx.state === "running" ? "running" : "locked";
}

// While the console is powering on, its chime has the stage: music waits.
let musicHeld = false;

/** Start the music after the power-on chime, if it is switched on. */
export function releaseMusic() {
  musicHeld = false;
  if (musicOn) startMusic();
}

/**
 * Call from a user gesture: creates (or wakes) the audio context. With
 * `holdMusic`, the music waits for `releaseMusic` (the power-on sequence).
 */
export function unlockSound({ holdMusic = false }: { holdMusic?: boolean } = {}) {
  if (typeof window === "undefined") return;
  if (holdMusic) musicHeld = true;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!ctx && Ctor) {
      ctx = new Ctor();
      build(ctx);
      document.addEventListener("visibilitychange", () => {
        if (!ctx) return;
        if (document.hidden) void ctx.suspend();
        else void ctx.resume();
      });
    }
    if (ctx && ctx.state !== "running" && !document.hidden)
      void ctx
        .resume()
        .then(() => musicOn && !musicHeld && startMusic())
        .catch(() => {});
    if (musicOn && !musicHeld) startMusic();
  } catch {
    /* no audio: the console is silent */
  }
}

/* ── Music ─────────────────────────────────────────────────────────────── */

// Chords as semitones above the root: I maj7, vi7, IV maj7, V add9.
const PROGRESSION = [
  [0, 4, 7, 11],
  [9, 12, 16, 19],
  [5, 9, 12, 16],
  [7, 11, 14, 19],
];
// One root (MIDI note) per tile, so each has its own key.
const ROOTS = [50, 47, 52, 45, 48, 53, 46, 51, 49, 44, 54];
const CHORD = 7.5; // seconds per chord

let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;
let nextChord = 0;
let nextBell = 0;
let chordNotes: number[] = [];

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function padVoice(freq: number, at: number, len: number, level: number) {
  if (!ctx || !padFilter) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(level, at + 2.6);
  g.gain.setValueAtTime(level, at + len - 0.5);
  g.gain.linearRampToValueAtTime(0.0001, at + len + 3.4);
  g.connect(padFilter);
  for (const [type, detune] of [
    ["sine", 1],
    ["triangle", 1.004],
  ] as const) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq * detune;
    o.connect(g);
    o.start(at);
    o.stop(at + len + 3.6);
  }
}

function bell(freq: number, at: number) {
  if (!ctx || !bellBus) return;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.045, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 2.8);
  g.connect(bellBus);
  for (const [mult, amp] of [
    [1, 1],
    [2.01, 0.22],
    [3.98, 0.06],
  ]) {
    const o = ctx.createOscillator();
    const a = ctx.createGain();
    o.frequency.value = freq * mult;
    a.gain.value = amp;
    o.connect(a).connect(g);
    o.start(at);
    o.stop(at + 3);
  }
}

function schedule() {
  if (!ctx) return;
  const now = ctx.currentTime;
  while (nextChord < now + 0.6) {
    const root = ROOTS[mood % ROOTS.length];
    const chord = PROGRESSION[step % PROGRESSION.length];
    chordNotes = chord.map((n) => root + n);
    chordNotes.forEach((n) => padVoice(mtof(n), nextChord, CHORD, 0.034));
    padVoice(mtof(root + chord[0] - 12), nextChord, CHORD, 0.05);
    step++;
    nextChord += CHORD;
  }
  while (nextBell < now + 0.6) {
    if (chordNotes.length && Math.random() > 0.28) {
      const n = chordNotes[Math.floor(Math.random() * chordNotes.length)] + (Math.random() < 0.6 ? 24 : 12);
      bell(mtof(n), nextBell);
    }
    nextBell += 0.9 + Math.random() * 1.6;
  }
}

function startMusic() {
  if (!ctx || playing) return;
  playing = true;
  nextChord = Math.max(nextChord, ctx.currentTime + 0.1);
  nextBell = Math.max(nextBell, ctx.currentTime + 1.2);
  schedule();
  timer = setInterval(schedule, 200);
  applyMusicGain();
}

function stopMusic() {
  playing = false;
  if (timer) clearInterval(timer);
  timer = null;
  applyMusicGain();
}

/* ── Interface sounds ──────────────────────────────────────────────────── */

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; at?: number; to?: number } = {}) {
  if (!sfxOn || !ctx || !sfxBus || ctx.state !== "running") return;
  const { type = "sine", gain = 0.05, at = 0, to } = opts;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  // a soft attack and a quick fall, so nothing clicks
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(sfxBus);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function hiss(dur: number, filterType: BiquadFilterType, freq: number, gain: number, sweepTo?: number) {
  if (!sfxOn || !ctx || !sfxBus || !noise || ctx.state !== "running") return;
  const t0 = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = filterType;
  f.frequency.setValueAtTime(freq, t0);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/* ── The bow under tension ─────────────────────────────────────────────── */

let tensionOsc: OscillatorNode | null = null;
let tensionGain: GainNode | null = null;

/**
 * A low creak that rises as the bow is drawn and fades when it is let go:
 * level 0 is silent, 1 is full draw. Cheap enough to set every frame.
 */
export function tension(level: number) {
  if (!ctx || !sfxBus || ctx.state !== "running") return;
  if (!tensionOsc) {
    if (level <= 0.01 || !sfxOn) return;
    tensionOsc = ctx.createOscillator();
    tensionOsc.type = "sawtooth";
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 260;
    tensionGain = ctx.createGain();
    tensionGain.gain.value = 0;
    tensionOsc.connect(lp).connect(tensionGain).connect(sfxBus);
    tensionOsc.start();
  }
  const t = ctx.currentTime;
  const on = sfxOn && level > 0.01;
  tensionOsc.frequency.setTargetAtTime(48 + level * 34, t, 0.05);
  tensionGain!.gain.setTargetAtTime(on ? 0.012 + level * 0.03 : 0, t, on ? 0.05 : 0.04);
  if (!on) {
    const osc = tensionOsc;
    tensionOsc = null;
    tensionGain = null;
    setTimeout(() => osc.stop(), 300);
  }
}

export const sfx = {
  /** Moving the focus. */
  move: () => tone(660, 0.07, { to: 860, gain: 0.03 }),
  /** Choosing something. */
  select: () => {
    tone(520, 0.09);
    tone(780, 0.16, { at: 0.07 });
  },
  /** Stepping back. */
  back: () => tone(460, 0.11, { to: 300, gain: 0.04 }),
  /** The edge of a row: nothing further that way. */
  edge: () => tone(200, 0.06, { type: "triangle", gain: 0.03 }),
  /** Switching tabs with the shoulder buttons. */
  tab: () => {
    hiss(0.16, "bandpass", 900, 0.05, 2600);
    tone(880, 0.08, { gain: 0.025, at: 0.05 });
  },
  /** A menu or a dialog opening. */
  open: () => {
    tone(392, 0.12, { type: "triangle", gain: 0.03 });
    tone(587, 0.2, { type: "triangle", gain: 0.03, at: 0.06 });
  },
  /** Powering on. */
  boot: () => {
    [196, 294, 392, 587, 784].forEach((f, i) => tone(f, 1.1, { type: "triangle", gain: 0.03, at: i * 0.12 }));
    hiss(1.6, "lowpass", 400, 0.03, 5000);
  },
  /** A milestone. */
  milestone: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, { type: "triangle", gain: 0.05, at: i * 0.085 }));
  },
  /** The bow: the string going forward. */
  release: () => {
    hiss(0.14, "bandpass", 1800, 0.16, 700);
    tone(110, 0.12, { gain: 0.08, to: 70 });
  },
  /** The arrow arriving in the target. */
  hit: () => {
    hiss(0.18, "lowpass", 600, 0.22, 160);
    tone(95, 0.16, { gain: 0.12, to: 55 });
  },
  /** One heartbeat, while the breath is held. */
  heart: () => {
    tone(62, 0.12, { gain: 0.16, to: 48 });
    tone(58, 0.14, { gain: 0.11, to: 44, at: 0.16 });
  },
  /** Winning a match. */
  win: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.32, { type: "triangle", gain: 0.05, at: i * 0.1 }));
  },
  /** Losing one. */
  lose: () => {
    [392, 330, 262].forEach((f, i) => tone(f, 0.34, { type: "triangle", gain: 0.04, at: i * 0.16 }));
  },
  /**
   * Powering on: a breath of air rising over a warm chord, then, as the mark
   * forms (2.75 s in), a bright bell chord with a little sparkle on top. This
   * site's own chime, in D major, made from the same voices as its music.
   */
  power: () => {
    if (!sfxOn || !ctx || !sfxBus || !noise || ctx.state !== "running") return;
    const c = ctx;
    const out = sfxBus;
    const t0 = c.currentTime + 0.02;
    const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

    // air: filtered noise opening up as the light spreads
    const air = c.createBufferSource();
    air.buffer = noise;
    air.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(260, t0);
    bp.frequency.exponentialRampToValueAtTime(4200, t0 + 2.7);
    const ag = c.createGain();
    ag.gain.setValueAtTime(0.0001, t0);
    ag.gain.exponentialRampToValueAtTime(0.05, t0 + 2.4);
    ag.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.95);
    air.connect(bp).connect(ag).connect(out);
    air.start(t0);
    air.stop(t0 + 3);

    // the chord blooming underneath
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(500, t0);
    lp.frequency.linearRampToValueAtTime(1600, t0 + 2.75);
    lp.connect(out);
    if (reverbIn) lp.connect(reverbIn);
    for (const n of [38, 45, 50, 54, 57]) {
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.03, t0 + 1.8);
      g.gain.setValueAtTime(0.03, t0 + 3.2);
      g.gain.linearRampToValueAtTime(0.0001, t0 + 6);
      g.connect(lp);
      for (const [type, det] of [
        ["sine", 1],
        ["triangle", 1.005],
      ] as const) {
        const o = c.createOscillator();
        o.type = type;
        o.frequency.value = mtof(n) * det;
        o.connect(g);
        o.start(t0);
        o.stop(t0 + 6.1);
      }
    }

    // the mark: a bright bell chord, then a sparkle
    const bell = (n: number, at: number, gain: number, len: number) => {
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(gain, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      g.connect(out);
      if (reverbIn) g.connect(reverbIn);
      for (const [mult, amp] of [
        [1, 1],
        [2.01, 0.25],
        [3.99, 0.07],
      ]) {
        const o = c.createOscillator();
        const a = c.createGain();
        o.frequency.value = mtof(n) * mult;
        a.gain.value = amp;
        o.connect(a).connect(g);
        o.start(at);
        o.stop(at + len + 0.05);
      }
    };
    [74, 78, 81, 86].forEach((n, i) => bell(n, t0 + 2.75 + i * 0.018, 0.045, 3.4));
    [93, 90, 98, 95].forEach((n, i) => bell(n, t0 + 2.95 + i * 0.13, 0.016, 1.3));
  },
  /** A miss: nothing but the wind. */
  miss: () => hiss(0.5, "bandpass", 500, 0.05, 1400),
};
