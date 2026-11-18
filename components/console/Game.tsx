"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowCounterClockwise, Trophy, Wind, X } from "@phosphor-icons/react/dist/ssr";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { EASE } from "@/components/ui/Reveal";
import { ACCENTS, Avatar, SPOTTER, type Player } from "./players";
import { sfx, tension } from "./sound";
import { rumble, triggerRumble } from "./useGamepad";

/* ── Rules and tuning ──────────────────────────────────────────────────── */

type Mode = "practice" | "spotter" | "versus";
type Distance = 18 | 50 | 70;
type Phase = "menu" | "aim" | "ai" | "flight" | "impact" | "handover" | "set" | "done";

const MODES: { id: Mode; title: string; body: string }[] = [
  { id: "practice", title: "Practice", body: "Six arrows at the distance you choose. Your best is kept." },
  { id: "spotter", title: "Match: you vs the Spotter", body: "Olympic sets at 70 m. Three arrows each, two points a set, first to six." },
  { id: "versus", title: "Pass the pad", body: "Two players, same rules as a match. With two controllers, each uses their own." },
];
const DISTANCES: Distance[] = [18, 50, 70];
const AT: Record<Distance, { rad: number; wind: number; drift: number; sway: number; spread: number; label: string }> = {
  18: { rad: 0.3, wind: 0, drift: 0, sway: 0.55, spread: 0.022, label: "Warm-up. No wind." },
  50: { rad: 0.24, wind: 0.7, drift: 0.42, sway: 0.8, spread: 0.032, label: "A little wind." },
  70: { rad: 0.2, wind: 1, drift: 0.55, sway: 1, spread: 0.04, label: "The full distance." },
};
const PRACTICE_ARROWS = 6;
const SET_ARROWS = 3;
const TO_WIN = 6;
const FLIGHT = 0.5;
const RINGS = ["#F3F1EC", "#F3F1EC", "#1B1D21", "#1B1D21", "#2F6FB6", "#2F6FB6", "#D9412F", "#D9412F", "#F2C230", "#F2C230"];

interface Shot {
  x: number;
  y: number;
  score: number;
  /** distance from the centre, in target radii: breaks shoot-off ties */
  r: number;
}
interface Shooter {
  name: string;
  kind: "human" | "ai";
  color: string; // "r,g,b"
}

const gaussN = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5; // roughly normal, sd 1
const ease = (p: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
const toRgb = (s: string) => s.trim().replace(/\s+/g, ",");

/** Where on a clock face (x, y) sits, seen from the shooting line. */
function clock(x: number, y: number) {
  const deg = ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
  return Math.round(deg / 30) % 12 || 12;
}

/** What the Spotter says about one arrow. */
function call(s: Shot, weak: boolean, who?: string, theirs = false, opponent = "The Spotter"): string {
  const at = `${clock(s.x, s.y)} o'clock`;
  const name = who ? `${who}: ` : "";
  if (theirs && opponent !== "The Spotter") {
    if (s.score === 0) return `${opponent}: a miss. He will blame the wind. Your go.`;
    return `${opponent}: ${s.score === 10 ? "ten" : s.score} at ${at}. Your move.`;
  }
  if (theirs) {
    if (s.score === 0) return "Miss. The wind had other plans. Your go.";
    return s.score === 10 ? "Ten for me. Your move." : `${s.score} for me, ${at}. Your move.`;
  }
  if (s.score === 0) {
    if (weak) return `${name}Short draw. It dropped before the target.`;
    return Math.abs(s.x) > Math.abs(s.y) ? `${name}Miss, wide at ${at}. Watch the windsock.` : `${name}Miss, ${s.y > 0 ? "low" : "high"}. Breathe, then aim.`;
  }
  if (s.score === 10) return s.r < 0.05 ? `${name}Ten. Dead centre. Show off.` : `${name}Ten. In the gold.`;
  if (s.score === 9) return `${name}Nine at ${at}. Tidy.`;
  if (weak) return `${name}${s.score} at ${at}. Draw all the way back.`;
  if (s.score >= 7) return `${name}${s.score} at ${at}. Close. Hold steadier.`;
  return `${name}${s.score} at ${at}. Read the wind.`;
}

/* ── The scene's fixed furniture, generated once ───────────────────────── */

const STARS = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random() * 0.45, a: 0.2 + Math.random() * 0.6 }));
const TREES = Array.from({ length: 60 }, (_, i) => 0.5 + 0.5 * Math.sin(i * 1.7) * Math.sin(i * 0.43 + 1) + Math.random() * 0.35);

/**
 * 70 m: an archery game made for a controller, and playable without one.
 *
 * Aim the sight with the left stick (arrows or WASD, a mouse, or a finger).
 * Pull the right trigger to draw (Space, the mouse button, or Draw); let go to
 * shoot. A weak draw drops short. At full draw the sight shakes more the
 * longer you hold; the left trigger (Shift, or Steady) holds your breath and
 * calms it while your breath lasts. Every arrow has its own wind: the
 * windsock and the drifting dust show it, and you aim off into it.
 *
 * Three ways to play: Practice (six arrows at 18, 50 or 70 m), a match
 * against the Spotter, and Pass the pad for two players. Matches use the
 * Olympic set system: three arrows each per set, two points to the higher
 * set, one each for a tie, first to six; at five all, one arrow each,
 * closest to the centre wins.
 *
 * The scene is one canvas redrawn every frame from a mutable state object.
 * React re-renders only when something on the overlay changes (a score, the
 * wind, a call, a phase).
 */
export default function Game({
  player,
  bests,
  board,
  onExit,
  onArrow,
  onPractice,
  onMatch,
}: {
  player: Player;
  /** this player's best practice score, by distance */
  bests: Record<number, number>;
  /** best at 70 m for every profile on this device */
  board: { name: string; best: number; me: boolean }[];
  onExit: () => void;
  onArrow: (score: number, distance: Distance) => void;
  onPractice: (total: number, distance: Distance) => void;
  onMatch: (won: boolean, vs: "spotter" | "abdullah" | "versus") => void;
}) {
  const reduce = useReduceMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const props = useRef({ onExit, onArrow, onPractice, onMatch, reduce });
  props.current = { onExit, onArrow, onPractice, onMatch, reduce };

  const myColor = toRgb(ACCENTS[player.accent].rgb);
  // You play the Spotter, unless you are the Spotter: then it is Abdullah.
  const rival = player.kind === "spotter" ? "Abdullah" : "The Spotter";
  const rivalRef = useRef(rival);
  rivalRef.current = rival;
  const theirColor = toRgb(ACCENTS[player.accent === "sky" ? "gold" : "sky"].rgb);

  // everything the frame loop reads and writes
  const S = useRef({
    phase: "menu" as Phase,
    mode: "practice" as Mode,
    distance: 70 as Distance,
    menu: { mode: 0, dist: 2 },
    shooters: [] as Shooter[],
    turn: 0,
    setNo: 1,
    setArrows: [[], []] as Shot[][],
    setPoints: [0, 0],
    shootoff: false,
    lastSet: null as null | { sums: number[]; points: number[] },
    winner: -1,
    practice: [] as Shot[],
    marks: [] as { x: number; y: number; color: string }[],
    aim: { x: 0, y: 0.5 },
    draw: 0,
    drawing: false,
    full: 0,
    breath: 1,
    steadying: false,
    wind: 0,
    shake: 0,
    time: 0,
    flight: null as null | { t: number; to: Shot; weak: boolean; who: number },
    impact: null as null | { t: number; at: Shot; ten: boolean },
    ai: null as null | { t: number; from: { x: number; y: number }; to: { x: number; y: number } },
    straw: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
    dust: Array.from({ length: 46 }, () => ({ x: Math.random(), y: 0.25 + Math.random() * 0.7, s: 0.5 + Math.random() })),
    lastHeart: 0,
    lastHum: 0,
    // inputs
    keys: new Set<string>(),
    mouse: null as null | { x: number; y: number; at: number },
    mouseDown: false,
    touchDraw: false,
    touchSteady: false,
    padPrev: new Map<number, boolean[]>(),
    padAxisPrev: new Map<number, number[]>(),
    armed: false,
  });

  /* ── what the overlay shows ─────────────────────────────────────────── */

  const snapshot = () => {
    const s = S.current;
    return {
      phase: s.phase,
      mode: s.mode,
      distance: s.distance,
      menu: { ...s.menu },
      shooters: s.shooters.map((x) => ({ ...x })),
      turn: s.turn,
      setNo: s.setNo,
      setArrows: s.setArrows.map((a) => [...a]),
      setPoints: [...s.setPoints],
      shootoff: s.shootoff,
      lastSet: s.lastSet,
      winner: s.winner,
      practice: [...s.practice],
      wind: s.wind,
    };
  };
  const [hud, setHud] = useState(snapshot);
  const [line, setLine] = useState({ text: "Pick a game. I'll spot for you.", key: 0 });
  const [input, setInput] = useState<"pad" | "keys" | "touch">("keys");
  const inputRef = useRef(input);
  const noteInput = (v: "pad" | "keys" | "touch") => {
    if (inputRef.current !== v) {
      inputRef.current = v;
      setInput(v);
    }
  };

  const sync = useCallback(() => setHud(snapshot()), []);
  const say = useCallback((text: string) => setLine((l) => ({ text, key: l.key + 1 })), []);

  /* ── the rules ──────────────────────────────────────────────────────── */

  const newWind = useCallback((gentle = false) => {
    const s = S.current;
    const w = AT[s.distance].wind;
    s.wind = w === 0 ? 0 : (gentle ? (Math.random() - 0.5) * 0.6 : Math.random() * 2 - 1) * w;
  }, []);

  const resetBow = () => {
    const s = S.current;
    s.draw = 0;
    s.drawing = false;
    s.full = 0;
    tension(0);
  };
  /**
   * After a button that also draws the bow has just been used to confirm
   * something (Start, Ready), nothing counts until every button is up once.
   * Between arrows the bow stays live, so drawing early simply starts the
   * next draw.
   */
  const disarm = () => {
    S.current.armed = false;
  };

  /** Hand the line to whoever shoots next. */
  const startTurn = useCallback(() => {
    const s = S.current;
    const shooter = s.shooters[s.turn];
    resetBow();
    s.aim = { x: (Math.random() - 0.5) * 0.4, y: 0.5 };
    if (shooter.kind === "ai") {
      s.phase = "ai";
      // the Spotter aims off into the wind, not perfectly
      const off = -s.wind * AT[s.distance].drift * (0.8 + Math.random() * 0.3);
      s.ai = { t: 0, from: { ...s.aim }, to: { x: off + gaussN() * 0.04, y: gaussN() * 0.04 } };
      say(rivalRef.current === "The Spotter" ? "My turn. Watch the windsock." : "Abdullah's turn. He is reading the windsock.");
    } else if (s.mode === "versus" && s.turn === 1 && !twoPads()) {
      s.phase = "handover";
    } else if (s.mode === "versus" && s.turn === 0 && s.setArrows[1].length === 0 && s.setNo > 1 && !twoPads()) {
      s.phase = "handover";
    } else s.phase = "aim";
    sync();
  }, [say, sync]);

  const begin = useCallback(
    (mode: Mode, distance: Distance) => {
      const s = S.current;
      s.mode = mode;
      s.distance = mode === "practice" ? distance : 70;
      const me: Shooter = { name: player.name, kind: "human", color: myColor };
      s.shooters =
        mode === "practice"
          ? [me]
          : mode === "spotter"
            ? [me, { name: rival, kind: "ai", color: theirColor }]
            : [me, { name: "Player 2", kind: "human", color: theirColor }];
      s.turn = 0;
      s.setNo = 1;
      s.setArrows = [[], []];
      s.setPoints = [0, 0];
      s.shootoff = false;
      s.lastSet = null;
      s.winner = -1;
      s.practice = [];
      s.marks = [];
      s.flight = null;
      s.impact = null;
      s.breath = 1;
      disarm();
      newWind(true);
      sfx.select();
      say(
        mode === "practice"
          ? `${s.distance} m. ${AT[s.distance].label} Take your time.`
          : mode === "spotter"
            ? rivalRef.current === "The Spotter"
              ? "First to six set points. Go easy on me."
              : "You against Abdullah. First to six set points."
            : `${me.name} shoots first. I'll call both of you.`
      );
      startTurn();
    },
    [myColor, newWind, player.name, say, startTurn, theirColor]
  );

  const toMenu = useCallback(() => {
    const s = S.current;
    resetBow();
    s.phase = "menu";
    s.marks = [];
    s.flight = null;
    s.impact = null;
    say("Pick a game. I'll spot for you.");
    sync();
  }, [say, sync]);

  /** Score a finished set and move the match on. */
  const finishSet = useCallback(() => {
    const s = S.current;
    if (s.shootoff) {
      const [a, b] = s.setArrows.map((arr) => arr[0]);
      // closest to the centre wins; a true tie (rare) goes to the visitor
      s.winner = a.r <= b.r ? 0 : 1;
      s.lastSet = { sums: [a.score, b.score], points: [s.winner === 0 ? 1 : 0, s.winner === 1 ? 1 : 0] };
    } else {
      const sums = s.setArrows.map((arr) => arr.reduce((t, x) => t + x.score, 0));
      const pts = sums[0] > sums[1] ? [2, 0] : sums[0] < sums[1] ? [0, 2] : [1, 1];
      s.setPoints = [s.setPoints[0] + pts[0], s.setPoints[1] + pts[1]];
      s.lastSet = { sums, points: pts };
      if (s.setPoints[0] >= TO_WIN || s.setPoints[1] >= TO_WIN) s.winner = s.setPoints[0] >= TO_WIN ? 0 : 1;
    }
    s.phase = "set";
    sync();
  }, [sync]);

  /** After the set score has been seen: the next set, a shoot-off, or the end. */
  const nextSet = useCallback(() => {
    const s = S.current;
    if (s.winner >= 0) {
      s.phase = "done";
      const won = s.winner === 0;
      if (s.mode === "spotter") (won ? sfx.win : sfx.lose)();
      else sfx.win();
      props.current.onMatch(won, s.mode === "spotter" ? (rivalRef.current === "The Spotter" ? "spotter" : "abdullah") : "versus");
      say(
        s.mode === "spotter"
          ? won
            ? rivalRef.current === "The Spotter"
              ? "You beat me. I am going to need a rematch."
              : "You beat Abdullah. He wants a rematch."
            : rivalRef.current === "The Spotter"
              ? "My match. Spotters can shoot too."
              : "Abdullah takes it. He will not let you forget it."
          : `${s.shooters[s.winner].name} wins the match.`
      );
      sync();
      return;
    }
    s.setNo += 1;
    s.shootoff = s.setPoints[0] === TO_WIN - 1 && s.setPoints[1] === TO_WIN - 1;
    s.setArrows = [[], []];
    s.marks = [];
    s.turn = 0;
    newWind();
    say(s.shootoff ? "Five all. Shoot-off: one arrow each, closest to the middle wins." : `Set ${s.setNo}.`);
    startTurn();
  }, [newWind, say, startTurn, sync]);

  /** What happens once an arrow has landed and the camera has come back. */
  const advance = useCallback(() => {
    const s = S.current;
    s.impact = null;
    if (s.mode === "practice") {
      if (s.practice.length >= PRACTICE_ARROWS) {
        s.phase = "done";
        const total = s.practice.reduce((t, x) => t + x.score, 0);
        props.current.onPractice(total, s.distance);
        sync();
        return;
      }
      newWind();
      s.phase = "aim";
      resetBow();
      sync();
      return;
    }
    const per = s.shootoff ? 1 : SET_ARROWS;
    if (s.setArrows[s.turn].length < per) {
      newWind();
      startTurn();
      return;
    }
    if (s.turn === 0) {
      s.turn = 1;
      newWind();
      startTurn();
      return;
    }
    finishSet();
  }, [finishSet, newWind, startTurn, sync]);

  const land = useCallback(
    (shot: Shot, weak: boolean, who: number) => {
      const s = S.current;
      const shooter = s.shooters[who];
      s.flight = null;
      if (shot.score > 0) s.marks.push({ x: shot.x, y: shot.y, color: shooter.color });
      if (s.mode === "practice") s.practice.push(shot);
      else s.setArrows[who].push(shot);

      if (shot.score > 0) {
        sfx.hit();
        if (shooter.kind === "human") rumble(shot.score >= 9 ? 0.9 : 0.5, 0.2, shot.score >= 9 ? 170 : 110);
        if (!props.current.reduce)
          for (let i = 0; i < 14; i++)
            s.straw.push({ x: shot.x, y: shot.y, vx: (Math.random() - 0.5) * 1.4, vy: -Math.random() * 1.2, life: 1 });
      } else sfx.miss();

      if (shooter.kind === "human") props.current.onArrow(shot.score, s.distance);
      const theirs = shooter.kind === "ai";
      say(call(shot, weak, s.mode === "versus" ? shooter.name : undefined, theirs, shooter.name));
      s.phase = "impact";
      s.impact = { t: 0, at: shot, ten: shot.score === 10 };
      sync();
    },
    [say, sync]
  );

  const restart = useCallback(() => begin(S.current.mode, S.current.distance), [begin]);

  /* ── menus, by any input ────────────────────────────────────────────── */

  const menuMove = useCallback(
    (dir: "up" | "down" | "left" | "right") => {
      const s = S.current;
      if (dir === "up" || dir === "down") s.menu.mode = (s.menu.mode + (dir === "up" ? -1 : 1) + MODES.length) % MODES.length;
      else if (MODES[s.menu.mode].id === "practice")
        s.menu.dist = Math.min(DISTANCES.length - 1, Math.max(0, s.menu.dist + (dir === "left" ? -1 : 1)));
      sfx.move();
      sync();
    },
    [sync]
  );

  /** South button, Enter, or a tap: whatever "go on" means right now. */
  const confirm = useCallback(() => {
    const s = S.current;
    if (s.phase === "menu") begin(MODES[s.menu.mode].id, DISTANCES[s.menu.dist]);
    else if (s.phase === "handover") {
      sfx.select();
      s.phase = "aim";
      resetBow();
      disarm();
      sync();
    } else if (s.phase === "set") {
      sfx.select();
      nextSet();
    } else if (s.phase === "done") restart();
  }, [begin, nextSet, restart, sync]);

  /** East button or Escape: out of a game to the menu, out of the menu to the console. */
  const back = useCallback(() => {
    if (S.current.phase === "menu") props.current.onExit();
    else {
      sfx.back();
      toMenu();
    }
  }, [toMenu]);

  /* ── keyboard ───────────────────────────────────────────────────────── */

  useEffect(() => {
    const s = S.current;
    const down = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === "Escape") {
        e.preventDefault();
        back();
        return;
      }
      noteInput("keys");
      if (s.phase === "menu") {
        const dir = ({ ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" } as const)[
          k as "ArrowUp"
        ];
        if (dir) {
          e.preventDefault();
          menuMove(dir);
        } else if (k === "Enter" || k === " ") {
          e.preventDefault();
          confirm();
        }
        return;
      }
      if (s.phase === "handover" || s.phase === "set" || s.phase === "done") {
        if (k === "Enter" || k === " " || k === "r") {
          e.preventDefault();
          if (!e.repeat) confirm();
        }
        return;
      }
      if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Shift", "w", "a", "s", "d"].includes(k)) {
        e.preventDefault();
        s.keys.add(k);
      }
    };
    const up = (e: KeyboardEvent) => s.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      tension(0);
    };
  }, [back, confirm, menuMove]);

  /* ── pads ───────────────────────────────────────────────────────────── */

  const pads = () =>
    typeof navigator !== "undefined" && navigator.getGamepads ? [...navigator.getGamepads()].filter((p): p is Gamepad => !!p && p.connected) : [];
  function twoPads() {
    return pads().length >= 2;
  }

  /* ── the frame loop ─────────────────────────────────────────────────── */

  const drag = useRef<null | { x: number; y: number }>(null);
  const radPx = useRef(100);

  useEffect(() => {
    const c = canvas.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    const s = S.current;
    let raf = 0;
    let last = performance.now();
    let amp = 0.03;

    const swayAt = (t: number) => ({
      x: amp * (0.62 * Math.sin(t * 1.7) + 0.38 * Math.sin(t * 3.9 + 1.3)),
      y: amp * (0.55 * Math.cos(t * 1.3 + 0.4) + 0.45 * Math.sin(t * 3.1 + 2.2)),
    });

    const shoot = () => {
      const at = AT[s.distance];
      const power = s.draw;
      const weak = power < 0.92;
      const sway = swayAt(s.time);
      const drop = Math.pow(1 - power, 1.4) * 1.9;
      const x = s.aim.x + sway.x + s.wind * at.drift + gaussN() * at.spread;
      const y = s.aim.y + sway.y + drop + gaussN() * at.spread;
      const r = Math.hypot(x, y);
      s.flight = { t: 0, to: { x, y, r, score: r >= 1 ? 0 : 10 - Math.floor(r * 10) }, weak, who: s.turn };
      s.phase = "flight";
      resetBow();
      s.shake = props.current.reduce ? 0 : 1;
      sfx.release();
      rumble(0.25, 0.7, 90);
    };

    const aiShoot = () => {
      const at = AT[s.distance];
      const sd = 0.15; // the Spotter is good, not perfect
      const x = s.ai!.to.x + s.wind * at.drift + gaussN() * sd;
      const y = s.ai!.to.y + gaussN() * sd;
      const r = Math.hypot(x, y);
      s.ai = null;
      s.flight = { t: 0, to: { x, y, r, score: r >= 1 ? 0 : 10 - Math.floor(r * 10) }, weak: false, who: s.turn };
      s.phase = "flight";
      sfx.release();
    };

    let accent = myColor;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      s.time += dt;
      const reduce = props.current.reduce;

      const w = c.clientWidth;
      const h = c.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      const at = AT[s.distance];
      const rad = Math.min(w, h) * at.rad;
      radPx.current = rad;
      const cx = w / 2;
      const cy = h * 0.42;
      const groundY = cy + rad * 1.55;

      /* inputs */
      let ax = 0;
      let ay = 0;
      let drawVal = 0;
      let steady = false;
      const k = s.keys;
      if (k.has("ArrowLeft") || k.has("a")) ax -= 1;
      if (k.has("ArrowRight") || k.has("d")) ax += 1;
      if (k.has("ArrowUp") || k.has("w")) ay -= 1;
      if (k.has("ArrowDown") || k.has("s")) ay += 1;
      if (k.has(" ")) drawVal = 1;
      if (k.has("Shift")) steady = true;
      if (s.mouseDown || s.touchDraw) drawVal = 1;
      if (s.touchSteady) steady = true;

      const list = pads();
      // In Pass the pad with two controllers, each player has their own.
      const mine = s.mode === "versus" && list.length >= 2 ? list[s.turn] : list[0];
      list.forEach((pad, idx) => {
        const b = pad.buttons;
        const pressed = b.map((x) => x.pressed);
        // A pad seen for the first time: whatever is already held (the press
        // that opened the game) is treated as old, not as a new press.
        const prev = s.padPrev.get(idx) ?? pressed;
        const edge = (i: number) => pressed[i] && !prev[i];
        // the left stick as four edge-triggered directions, for the menus
        const ax0 = pad.axes[0] ?? 0;
        const ay0 = pad.axes[1] ?? 0;
        const axPrev = s.padAxisPrev.get(idx) ?? [ax0, ay0];
        const stickEdge = (v: number, p: number, sign: number) => sign * v > 0.6 && !(sign * p > 0.6);
        const any = pressed.some(Boolean) || Math.abs(ax0) > 0.3 || Math.abs(ay0) > 0.3;
        if (any) noteInput("pad");

        if (s.phase === "menu") {
          if (edge(12) || stickEdge(ay0, axPrev[1], -1)) menuMove("up");
          if (edge(13) || stickEdge(ay0, axPrev[1], 1)) menuMove("down");
          if (edge(14) || stickEdge(ax0, axPrev[0], -1)) menuMove("left");
          if (edge(15) || stickEdge(ax0, axPrev[0], 1)) menuMove("right");
          if (edge(0)) confirm();
        } else if (s.phase === "handover" || s.phase === "set") {
          if (edge(0)) confirm();
        } else if (s.phase === "done") {
          if (edge(0) || edge(2)) confirm();
        }
        if (edge(1) || edge(9)) back();

        if (pad === mine && (s.phase === "aim" || s.phase === "flight" || s.phase === "impact")) {
          const dz = (v: number) => (Math.abs(v) < 0.14 ? 0 : v);
          // the right stick fine-tunes, slowly
          ax += dz(ax0) + dz(pad.axes[2] ?? 0) * 0.35 + ((b[15]?.pressed ? 1 : 0) - (b[14]?.pressed ? 1 : 0)) * 0.6;
          ay += dz(ay0) + dz(pad.axes[3] ?? 0) * 0.35 + ((b[13]?.pressed ? 1 : 0) - (b[12]?.pressed ? 1 : 0)) * 0.6;
          drawVal = Math.max(drawVal, b[7]?.value ?? 0, b[0]?.pressed ? 1 : 0);
          if ((b[6]?.value ?? 0) > 0.3 || b[4]?.pressed) steady = true;
        }
        s.padPrev.set(idx, pressed);
        s.padAxisPrev.set(idx, [ax0, ay0]);
      });

      // nothing counts until every key and button is up once after a turn starts
      const held = drawVal > 0.05 || s.keys.size > 0 || list.some((p) => p.buttons.some((x) => x.pressed));
      if (!s.armed) {
        if (!held) s.armed = true;
        drawVal = 0;
      }

      /* the archer */
      if (s.phase === "aim") {
        const speed = s.drawing ? 0.9 : 1.4;
        s.aim.x = Math.max(-1.8, Math.min(1.8, s.aim.x + ax * speed * dt));
        s.aim.y = Math.max(-1.8, Math.min(1.8, s.aim.y + ay * speed * dt));
        // performance.now(), not the frame's timestamp: the mouse event was
        // stamped with it, and the two are not guaranteed to share a clock
        if (s.mouse && performance.now() - s.mouse.at < 2500) {
          s.aim.x = (s.mouse.x - cx) / rad;
          s.aim.y = (s.mouse.y - cy) / rad;
        }
        if (drawVal > 0.05) {
          s.drawing = true;
          s.draw = Math.min(1, s.draw + dt * (0.8 + drawVal));
          if (s.draw >= 1) s.full += dt;
        } else if (s.drawing) {
          if (s.draw > 0.2) shoot();
          else resetBow();
        }
      }

      const fatigue = Math.min(0.3, Math.max(0, s.full - 2.2) * 0.12);
      let target = (s.drawing ? 0.055 + fatigue : 0.03) * at.sway;
      s.steadying = steady && s.breath > 0 && s.drawing && s.phase === "aim";
      if (s.steadying) {
        target *= 0.25;
        s.breath = Math.max(0, s.breath - dt * 0.45);
        if (now - s.lastHeart > 820) {
          s.lastHeart = now;
          sfx.heart();
        }
      } else s.breath = Math.min(1, s.breath + dt * 0.22);
      amp += (target - amp) * Math.min(1, dt * 4);

      // the bow: a creak that rises with the draw, a hum in the pad that grows with the shake
      if (s.phase === "aim") {
        tension(s.drawing ? s.draw : 0);
        if (s.drawing && now - s.lastHum > 140) {
          s.lastHum = now;
          rumble(0, Math.min(1, 0.04 + s.draw * 0.1 + fatigue * 2), 160);
          // on pads with motors in the triggers, the draw trigger itself strains
          triggerRumble(0, Math.min(1, 0.08 + s.draw * 0.35 + fatigue * 2), 160);
        }
      }

      /* the Spotter, shooting */
      if (s.phase === "ai" && s.ai) {
        s.ai.t += dt;
        if (s.ai.t > 1.5) aiShoot();
      }

      /* the arrow in the air, and the camera on the target */
      if (s.flight) {
        // the last stretch of a ten plays slowly
        const slow = !reduce && s.flight.to.score === 10 && s.flight.t > 0.6 ? 0.35 : 1;
        s.flight.t += (dt / FLIGHT) * slow;
        if (s.flight.t >= 1) land(s.flight.to, s.flight.weak, s.flight.who);
      }
      if (s.phase === "impact" && s.impact) {
        s.impact.t += dt;
        if (s.impact.t > (reduce ? 0.6 : s.impact.ten ? 1.6 : 1.15)) advance();
      }
      s.shake = Math.max(0, s.shake - dt * 7);

      /* draw */
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      accent = myColor;

      // the camera: during an impact it closes in on where the arrow landed
      let zoom = 1;
      let fx = cx;
      let fy = cy;
      if (s.impact && !reduce) {
        const z = s.impact.ten ? 3 : 2.3;
        const t = s.impact.t;
        const dur = s.impact.ten ? 1.6 : 1.15;
        const k1 = ease(t / 0.28) * (1 - ease((t - (dur - 0.32)) / 0.32));
        zoom = 1 + (z - 1) * k1;
        fx = cx + s.impact.at.x * rad * k1;
        fy = cy + s.impact.at.y * rad * k1;
      }
      const kick = s.shake * 6;
      g.save();
      g.translate(w / 2 + (Math.random() - 0.5) * kick, h / 2 + (Math.random() - 0.5) * kick);
      g.scale(zoom, zoom);
      g.translate(-(fx + (w / 2 - cx)), -(fy + (h / 2 - cy)));
      g.translate(w / 2 - cx, h / 2 - cy);

      // sky, stars, floodlights
      const sky = g.createLinearGradient(0, 0, 0, groundY);
      sky.addColorStop(0, "#03050a");
      sky.addColorStop(1, "#0d1416");
      g.fillStyle = sky;
      g.fillRect(-w, -h, w * 3, groundY + h);
      for (const st of STARS) {
        g.fillStyle = `rgba(255,255,255,${st.a * (0.75 + 0.25 * Math.sin(s.time * 1.3 + st.x * 40))})`;
        g.fillRect(st.x * w, st.y * h, 1.4, 1.4);
      }
      for (const side of [-1, 1]) {
        const lx = cx + side * w * 0.42;
        const beam = g.createLinearGradient(lx, 0, cx, groundY);
        beam.addColorStop(0, "rgba(255,244,214,0.12)");
        beam.addColorStop(1, "rgba(255,244,214,0)");
        g.fillStyle = beam;
        g.beginPath();
        g.moveTo(lx - 10, h * 0.05);
        g.lineTo(lx + 10, h * 0.05);
        g.lineTo(cx + side * w * 0.05, groundY);
        g.lineTo(cx + side * w * 0.38, groundY);
        g.closePath();
        g.fill();
        g.fillStyle = "rgba(255,248,230,0.85)";
        g.beginPath();
        g.arc(lx, h * 0.05, 4, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#11161a";
        g.fillRect(lx - 1.5, h * 0.05, 3, groundY - h * 0.05);
      }
      // the tree line
      g.fillStyle = "#070b09";
      g.beginPath();
      g.moveTo(-w, groundY);
      TREES.forEach((v, i) => {
        const x = -w + (i / (TREES.length - 1)) * w * 3;
        g.lineTo(x, groundY - h * (0.04 + v * 0.07));
      });
      g.lineTo(w * 2, groundY);
      g.closePath();
      g.fill();
      // the field, its lanes and distance lines
      const field = g.createLinearGradient(0, groundY, 0, h);
      field.addColorStop(0, "#0f1d13");
      field.addColorStop(1, "#1b3321");
      g.fillStyle = field;
      g.fillRect(-w, groundY, w * 3, h * 2);
      g.strokeStyle = "rgba(255,255,255,0.06)";
      g.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        g.beginPath();
        g.moveTo(cx + i * rad * 0.9, groundY);
        g.lineTo(cx + i * w * 0.35, h);
        g.stroke();
      }
      for (let i = 1; i < 7; i++) {
        const y = groundY + Math.pow(i / 7, 2.2) * (h - groundY);
        g.strokeStyle = `rgba(255,255,255,${0.04 + (i / 7) * 0.05})`;
        g.beginPath();
        g.moveTo(-w, y);
        g.lineTo(w * 2, y);
        g.stroke();
      }

      // the stand, the boss, the face
      g.fillStyle = "#3a2f1f";
      g.fillRect(cx - rad * 1.0, cy + rad * 0.95, rad * 0.08, groundY - cy - rad * 0.95);
      g.fillRect(cx + rad * 0.92, cy + rad * 0.95, rad * 0.08, groundY - cy - rad * 0.95);
      g.fillStyle = "#b69a64";
      g.beginPath();
      g.roundRect(cx - rad * 1.18, cy - rad * 1.18, rad * 2.36, rad * 2.36, rad * 0.08);
      g.fill();
      RINGS.forEach((col, i) => {
        g.beginPath();
        g.arc(cx, cy, rad * (1 - i / 10), 0, Math.PI * 2);
        g.fillStyle = col;
        g.fill();
        g.lineWidth = 1 / zoom;
        g.strokeStyle = i === 2 || i === 3 ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)";
        g.stroke();
      });
      g.beginPath();
      g.arc(cx, cy, rad * 0.05, 0, Math.PI * 2);
      g.strokeStyle = "rgba(0,0,0,0.3)";
      g.stroke();

      // arrows in the target: a dark hole, a nock, and three fletches in the shooter's colour
      for (const m of s.marks) {
        const px = cx + m.x * rad;
        const py = cy + m.y * rad;
        const fl = Math.max(4, rad * 0.06);
        g.fillStyle = "#0e0f12";
        g.beginPath();
        g.arc(px, py, Math.max(1.8, rad * 0.022), 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = `rgb(${m.color})`;
        g.lineWidth = Math.max(1.4, rad * 0.012);
        for (const ang of [-0.5, Math.PI / 2 + 0.2, Math.PI + 0.9]) {
          g.beginPath();
          g.moveTo(px, py);
          g.lineTo(px + Math.cos(ang) * fl, py + Math.sin(ang) * fl);
          g.stroke();
        }
      }

      // straw kicked up by a hit
      s.straw = s.straw.filter((p) => (p.life -= dt * 1.8) > 0);
      for (const p of s.straw) {
        p.x += p.vx * dt * 0.25;
        p.y += p.vy * dt * 0.25;
        p.vy += dt * 2.2;
        g.fillStyle = `rgba(214,186,122,${p.life})`;
        g.fillRect(cx + p.x * rad - 1.5, cy + p.y * rad - 1.5, 3, 3);
      }

      // the windsock: the direction and strength of this arrow's wind
      {
        const px = cx + rad * 1.75;
        const top = cy - rad * 0.55;
        g.fillStyle = "#8b8f94";
        g.fillRect(px - 1.5, top, 3, groundY - top);
        const strength = Math.min(1, Math.abs(s.wind) / Math.max(0.0001, AT[70].wind));
        const dir = s.wind >= 0 ? 1 : -1;
        const droop = (1 - strength) * 1.25;
        const flutter = reduce ? 0 : Math.sin(s.time * (6 + strength * 6)) * 0.08 * (0.3 + strength);
        const ang = dir > 0 ? droop + flutter : Math.PI - droop - flutter;
        const L = rad * (0.55 + 0.25 * strength);
        for (let i = 0; i < 4; i++) {
          const a0 = i / 4;
          const a1 = (i + 1) / 4;
          const w0 = rad * 0.09 * (1 - a0 * 0.55);
          const w1 = rad * 0.09 * (1 - a1 * 0.55);
          const x0 = px + Math.cos(ang) * L * a0;
          const y0 = top + Math.sin(ang) * L * a0;
          const x1 = px + Math.cos(ang) * L * a1;
          const y1 = top + Math.sin(ang) * L * a1;
          const nx = -Math.sin(ang);
          const ny = Math.cos(ang);
          g.fillStyle = i % 2 ? "#f1eee6" : "#d9412f";
          g.beginPath();
          g.moveTo(x0 + nx * w0, y0 + ny * w0);
          g.lineTo(x1 + nx * w1, y1 + ny * w1);
          g.lineTo(x1 - nx * w1, y1 - ny * w1);
          g.lineTo(x0 - nx * w0, y0 - ny * w0);
          g.closePath();
          g.fill();
        }
      }

      // dust drifting with the wind
      if (!reduce && at.wind > 0) {
        for (const d of s.dust) {
          d.x += (s.wind * 0.22 * d.s + 0.004 * Math.sin(s.time + d.y * 10)) * dt;
          if (d.x > 1.05) d.x -= 1.1;
          if (d.x < -0.05) d.x += 1.1;
          g.fillStyle = `rgba(255,240,210,${0.08 + 0.12 * d.s})`;
          g.fillRect(d.x * w, d.y * h, 1.6 * d.s, 1.6 * d.s);
        }
      }

      // the arrow in flight, from the bow to the target, shrinking with distance
      if (s.flight) {
        const p = 1 - Math.pow(1 - s.flight.t, 2.2);
        const tx = cx + s.flight.to.x * rad;
        const ty = cy + s.flight.to.y * rad;
        const ox = s.shooters[s.flight.who]?.kind === "ai" ? w * 0.62 : w / 2;
        const ax0 = ox + (tx - ox) * p;
        const ay0 = h + 40 + (ty - h - 40) * p - Math.sin(p * Math.PI) * h * 0.06;
        const len = (1 - p) * 70 + 6;
        const ang = Math.atan2(ty - (h + 40), tx - ox);
        g.strokeStyle = "rgba(240,236,228,0.92)";
        g.lineWidth = Math.max(1.2, 5 * (1 - p));
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(ax0, ay0);
        g.lineTo(ax0 - Math.cos(ang) * len, ay0 - Math.sin(ang) * len);
        g.stroke();
      }

      // the sight: a ring with a pin. The Spotter's is drawn in their colour while they aim.
      const sightAt =
        s.phase === "aim"
          ? (() => {
              const sw = swayAt(s.time);
              return { x: s.aim.x + sw.x, y: s.aim.y + sw.y, color: accent };
            })()
          : s.phase === "ai" && s.ai
            ? (() => {
                const k1 = ease(s.ai.t / 1.1);
                return {
                  x: s.ai.from.x + (s.ai.to.x - s.ai.from.x) * k1 + Math.sin(s.time * 2.1) * 0.03,
                  y: s.ai.from.y + (s.ai.to.y - s.ai.from.y) * k1 + Math.cos(s.time * 1.7) * 0.03,
                  color: theirColor,
                };
              })()
            : null;
      if (sightAt) {
        const px = cx + sightAt.x * rad;
        const py = cy + sightAt.y * rad;
        const ring = Math.max(14, rad * 0.16);
        g.lineWidth = 2;
        g.strokeStyle = s.steadying ? "rgba(190,220,255,0.95)" : "rgba(255,255,255,0.92)";
        g.beginPath();
        g.arc(px, py, ring, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = "rgba(255,255,255,0.35)";
        g.beginPath();
        g.moveTo(px, py - ring * 1.7);
        g.lineTo(px, py - ring * 0.55);
        g.stroke();
        g.beginPath();
        g.arc(px, py, Math.max(2.5, ring * 0.16), 0, Math.PI * 2);
        g.fillStyle = `rgb(${sightAt.color})`;
        g.fill();
      }
      g.restore();

      // vignette, darker while the breath is held (the world narrows)
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const v = g.createRadialGradient(cx, cy, Math.min(w, h) * (s.steadying ? 0.22 : 0.3), cx, cy, Math.max(w, h) * 0.75);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(1, `rgba(0,0,0,${s.steadying ? 0.78 : 0.6})`);
      g.fillStyle = v;
      g.fillRect(0, 0, w, h);

      // meters: draw (accent) and breath (pale blue)
      if (s.phase === "aim") {
        const mw = Math.min(280, w * 0.5);
        const mx = (w - mw) / 2;
        const my = h - 96;
        g.fillStyle = "rgba(255,255,255,0.14)";
        g.beginPath();
        g.roundRect(mx, my, mw, 8, 4);
        g.fill();
        g.fillStyle = s.draw >= 1 ? "#ffffff" : `rgb(${accent})`;
        g.beginPath();
        g.roundRect(mx, my, Math.max(0.01, mw * s.draw), 8, 4);
        g.fill();
        g.fillStyle = "rgba(255,255,255,0.14)";
        g.beginPath();
        g.roundRect(mx + mw * 0.2, my + 16, mw * 0.6, 4, 2);
        g.fill();
        g.fillStyle = "rgba(170,210,255,0.85)";
        g.beginPath();
        g.roundRect(mx + mw * 0.2, my + 16, Math.max(0.01, mw * 0.6 * s.breath), 4, 2);
        g.fill();
        g.font = "12px ui-monospace, monospace";
        g.fillStyle = "rgba(255,255,255,0.65)";
        g.textAlign = "center";
        g.fillText(s.draw >= 1 ? (s.full > 2.2 ? "Full draw: shaking, let go" : "Full draw") : s.drawing ? "Drawing" : "Draw", w / 2, my - 8);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      tension(0);
    };
  }, [advance, back, confirm, land, menuMove, myColor, theirColor]);

  /* ── the overlay ────────────────────────────────────────────────────── */

  const kmh = Math.round(Math.abs(hud.wind) * 16);
  const match = hud.mode !== "practice";
  const total = hud.practice.reduce((t, s) => t + s.score, 0);
  const best = bests[hud.distance] ?? 0;
  const shooter = hud.shooters[hud.turn];
  // Centred with inset and auto margins, not translate: the entrance animation owns the transform.
  const panel = "c-panel absolute inset-0 m-auto h-fit max-h-[92dvh] w-[min(32rem,92vw)] overflow-y-auto p-6 text-center sm:p-8";
  const primaryBtn = "flex h-12 items-center justify-center gap-2 rounded-full bg-content px-6 font-medium text-ink";
  const ghostBtn = "h-12 rounded-full border border-white/30 px-6";
  const playing = hud.phase === "aim" || hud.phase === "ai" || hud.phase === "flight" || hud.phase === "impact";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="70 m, an archery game"
      className="fixed inset-0 z-[45] select-none overflow-hidden bg-black"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
    >
      <canvas
        ref={canvas}
        className={`absolute inset-0 h-full w-full touch-none ${hud.phase === "aim" ? "[cursor:none]" : ""}`}
        onPointerMove={(e) => {
          const s = S.current;
          if (e.pointerType === "mouse") {
            const r = e.currentTarget.getBoundingClientRect();
            s.mouse = { x: e.clientX - r.left, y: e.clientY - r.top, at: performance.now() };
          } else if (drag.current) {
            const k = 1 / radPx.current;
            s.aim.x = Math.max(-1.8, Math.min(1.8, s.aim.x + (e.clientX - drag.current.x) * k));
            s.aim.y = Math.max(-1.8, Math.min(1.8, s.aim.y + (e.clientY - drag.current.y) * k));
            drag.current = { x: e.clientX, y: e.clientY };
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") {
            noteInput("keys");
            if (e.button === 0) S.current.mouseDown = true;
          } else {
            noteInput("touch");
            drag.current = { x: e.clientX, y: e.clientY };
          }
        }}
        onPointerUp={(e) => {
          if (e.pointerType === "mouse") S.current.mouseDown = false;
          drag.current = null;
        }}
        onPointerCancel={() => {
          S.current.mouseDown = false;
          drag.current = null;
        }}
      />
      <p className="sr-only" aria-live="polite">
        {line.text}
      </p>

      {/* the score */}
      {playing && !match && (
        <div className="pointer-events-none absolute left-4 top-4 sm:left-8 sm:top-6">
          <p className="mega text-[3.2rem] leading-none tabular-nums sm:text-[4.2rem]">
            {total}
            <span className="text-[0.45em] text-white/50">/60</span>
          </p>
          <ol className="mt-3 flex gap-1.5" aria-label="Arrows">
            {Array.from({ length: PRACTICE_ARROWS }).map((_, i) => {
              const s = hud.practice[i];
              return (
                <li
                  key={i}
                  className={`grid h-7 w-7 place-items-center rounded-full border text-xs tabular-nums ${
                    s ? (s.score >= 9 ? "border-accent bg-accent text-onAccent" : "border-white/40") : "border-white/15"
                  }`}
                >
                  {s ? (s.score === 0 ? "M" : s.score) : ""}
                </li>
              );
            })}
          </ol>
          {best > 0 && <p className="mt-2 text-xs text-white/60">Best at {hud.distance} m: {best}</p>}
        </div>
      )}
      {(playing || hud.phase === "handover") && match && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-black/45 p-3 backdrop-blur sm:left-8 sm:top-6">
          <p className="mb-2 px-1 text-xs text-white/60">{hud.shootoff ? "Shoot-off" : `Set ${hud.setNo}`}</p>
          <table className="text-sm">
            <tbody>
              {hud.shooters.map((sh, i) => (
                <tr key={sh.name} className={i === hud.turn ? "" : "opacity-60"}>
                  <td className="pr-3">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: `rgb(${sh.color})` }} />
                    {sh.name}
                  </td>
                  <td className="flex gap-1 pr-3">
                    {Array.from({ length: hud.shootoff ? 1 : SET_ARROWS }).map((_, j) => {
                      const a = hud.setArrows[i]?.[j];
                      return (
                        <span key={j} className="grid h-6 w-6 place-items-center rounded-full border border-white/25 text-xs tabular-nums">
                          {a ? (a.score === 0 ? "M" : a.score) : ""}
                        </span>
                      );
                    })}
                  </td>
                  <td className="mega text-2xl tabular-nums">{hud.setPoints[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* wind and distance */}
      {hud.phase !== "menu" && (
        <div className="pointer-events-none absolute right-16 top-5 flex items-center gap-3 rounded-full bg-black/45 px-4 py-2 backdrop-blur sm:right-24 sm:top-7">
          <span className="text-sm tabular-nums">{hud.distance} m</span>
          <span className="h-4 w-px bg-white/25" />
          <Wind size={18} />
          {kmh > 0 ? (
            <>
              <span aria-hidden className="inline-block transition-transform duration-500" style={{ transform: `scaleX(${hud.wind < 0 ? -1 : 1})` }}>
                &rarr;
              </span>
              <span className="text-sm tabular-nums">
                {kmh} km/h <span className="sr-only">{hud.wind < 0 ? "from the right" : "from the left"}</span>
              </span>
            </>
          ) : (
            <span className="text-sm">Still</span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={back}
        aria-label={hud.phase === "menu" ? "Leave the game" : "Back to the game menu"}
        className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white transition-colors hover:bg-white/15 sm:right-8 sm:top-6"
      >
        <X size={18} weight="bold" />
      </button>

      {/* the Spotter's call */}
      {/* centred by a wrapper: the bubble's own transform belongs to its entrance */}
      {hud.phase !== "menu" && (
        <div className="pointer-events-none absolute inset-x-0 top-[13%] flex justify-center px-4">
          <motion.div
            key={line.key}
            className="flex max-w-[min(32rem,88vw)] items-center gap-3 rounded-full bg-black/55 py-2 pl-2 pr-5 backdrop-blur"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Avatar player={SPOTTER} className="h-9 w-9" iconSize={18} />
            <p data-call className="text-sm leading-snug sm:text-base">
              {line.text}
            </p>
          </motion.div>
        </div>
      )}

      {/* how to play, for whichever input is in use */}
      {hud.phase === "aim" && (
        <p className="pointer-events-none absolute inset-x-0 bottom-5 px-4 text-center text-xs text-white/65 sm:text-sm">
          {input === "pad"
            ? "Left stick aims. Right trigger draws, let go to shoot. Left trigger holds your breath. East button: menu."
            : input === "touch"
              ? "Drag to aim. Hold Draw, let go to shoot. Hold Steady to hold your breath."
              : "Arrows or mouse to aim. Hold Space or the mouse button to draw, let go to shoot. Shift holds your breath."}
        </p>
      )}
      {hud.phase === "ai" && <p className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-sm text-white/65">The Spotter is on the line.</p>}

      {/* touch controls */}
      {input === "touch" && hud.phase === "aim" && (
        <>
          <button
            type="button"
            onPointerDown={() => (S.current.touchSteady = true)}
            onPointerUp={() => (S.current.touchSteady = false)}
            onPointerCancel={() => (S.current.touchSteady = false)}
            onPointerLeave={() => (S.current.touchSteady = false)}
            className="absolute bottom-14 left-5 h-20 w-20 touch-none rounded-full border border-white/30 bg-black/40 text-sm"
          >
            Steady
          </button>
          <button
            type="button"
            onPointerDown={() => (S.current.touchDraw = true)}
            onPointerUp={() => (S.current.touchDraw = false)}
            onPointerCancel={() => (S.current.touchDraw = false)}
            onPointerLeave={() => (S.current.touchDraw = false)}
            className="absolute bottom-14 right-5 h-24 w-24 touch-none rounded-full bg-accent text-sm font-medium text-onAccent"
          >
            Draw
          </button>
        </>
      )}

      <AnimatePresence>
        {/* the game menu */}
        {hud.phase === "menu" && (
          <motion.div
            key="menu"
            className="absolute inset-0 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.3 }}
          >
            <div className="w-full max-w-[34rem]">
              <p className="mega text-center text-[clamp(4rem,14vw,7.5rem)] leading-none">70 m</p>
              <ul className="mt-6 grid gap-2" role="listbox" aria-label="Game mode">
                {MODES.map((mode, i) => {
                  const m = mode.id === "spotter" && rival !== "The Spotter" ? { ...mode, title: `Match: you vs ${rival}` } : mode;
                  const on = hud.menu.mode === i;
                  return (
                    <li key={m.id} role="option" aria-selected={on}>
                      <button
                        type="button"
                        onClick={() => {
                          if (S.current.menu.mode === i) confirm();
                          else {
                            S.current.menu.mode = i;
                            sfx.move();
                            sync();
                          }
                        }}
                        className={`w-full rounded-2xl p-4 text-left transition-[background-color,box-shadow] ${
                          on ? "bg-white/[0.14] shadow-[0_0_0_2px_rgb(var(--content-rgb))]" : "bg-white/[0.06] hover:bg-white/10"
                        }`}
                      >
                        <span className="block font-display text-lg font-semibold">{m.title}</span>
                        <span className="block text-sm text-white/70">{m.body}</span>
                        {m.id === "practice" && on && (
                          <span className="mt-3 flex items-center gap-2" role="radiogroup" aria-label="Distance">
                            {DISTANCES.map((d, j) => (
                              <span
                                key={d}
                                role="radio"
                                aria-checked={hud.menu.dist === j}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  S.current.menu.dist = j;
                                  sfx.move();
                                  sync();
                                }}
                                className={`rounded-full px-3.5 py-1.5 text-sm tabular-nums transition-colors ${
                                  hud.menu.dist === j ? "bg-accent text-onAccent" : "border border-white/25 hover:bg-white/10"
                                }`}
                              >
                                {d} m{bests[d] ? ` · best ${bests[d]}` : ""}
                              </span>
                            ))}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 flex justify-center gap-3">
                <button type="button" onClick={confirm} className={primaryBtn}>
                  Start
                </button>
                <button type="button" onClick={back} className={ghostBtn}>
                  Leave
                </button>
              </div>
              <p className="mt-4 text-center text-xs text-white/55">
                {input === "pad" ? "Up and down: mode. Left and right: distance. South: start. East: leave." : "Arrow keys to choose, Enter to start, Esc to leave."}
              </p>
            </div>
          </motion.div>
        )}

        {/* pass the pad */}
        {hud.phase === "handover" && shooter && (
          <motion.div key="handover" className={panel} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <p className="text-sm text-white/70">Pass the pad</p>
            <p className="mega mt-2 text-[3rem] leading-none">{shooter.name}</p>
            <p className="mt-3 text-white/75">Your turn on the line.</p>
            <button type="button" onClick={confirm} className={`${primaryBtn} mx-auto mt-6`}>
              Ready
            </button>
            <p className="mt-3 text-xs text-white/55">South button, Enter or Space.</p>
          </motion.div>
        )}

        {/* a set, scored */}
        {hud.phase === "set" && hud.lastSet && (
          <motion.div key={`set-${hud.setNo}`} className={panel} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <p className="text-sm text-white/70">{hud.shootoff ? "Shoot-off" : `Set ${hud.setNo}`}</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {hud.shooters.map((sh, i) => (
                <div key={sh.name} className="rounded-2xl bg-white/[0.06] p-4">
                  <p className="truncate text-sm" style={{ color: `rgb(${sh.color})` }}>
                    {sh.name}
                  </p>
                  <p className="mega mt-1 text-[3rem] leading-none tabular-nums">{hud.lastSet!.sums[i]}</p>
                  <p className="mt-1 text-sm text-white/70">
                    {hud.shootoff ? (hud.lastSet!.points[i] ? "Closest" : "") : `+${hud.lastSet!.points[i]} set points`}
                  </p>
                </div>
              ))}
            </div>
            {!hud.shootoff && (
              <p className="mt-4 text-white/80">
                Match: {hud.setPoints[0]} to {hud.setPoints[1]}
              </p>
            )}
            <button type="button" onClick={confirm} className={`${primaryBtn} mx-auto mt-6`}>
              {hud.winner >= 0 ? "See the result" : "Next set"}
            </button>
          </motion.div>
        )}

        {/* the end */}
        {hud.phase === "done" && (
          <motion.div key="done" className={panel} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35, ease: EASE, delay: 0.2 }}>
            {match ? (
              <>
                <Trophy size={40} weight="fill" className="mx-auto text-accentInk" />
                <p className="mega mt-2 text-[2.6rem] leading-none">
                  {hud.mode === "spotter" ? (hud.winner === 0 ? "You win" : `${rival} wins`) : `${hud.shooters[hud.winner]?.name} wins`}
                </p>
                <p className="mt-2 text-white/75">
                  Sets {hud.setPoints[0]} to {hud.setPoints[1]}
                  {hud.shootoff ? ", after a shoot-off" : ""}.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-white/70">{hud.distance} m, end complete</p>
                <p className="mega mt-1 text-[5rem] leading-none tabular-nums">{total}</p>
                <p className="mt-2 text-white/75">{total >= best && total > 0 ? "A new best." : `Best ${best}`}</p>
                {hud.distance === 70 && board.length > 1 && (
                  <ol className="mx-auto mt-5 max-w-[18rem] text-left text-sm">
                    <li className="mb-1 text-xs text-white/55">Best at 70 m on this device</li>
                    {board.slice(0, 5).map((b, i) => (
                      <li key={b.name} className={`flex justify-between border-t border-white/10 py-1.5 ${b.me ? "text-accentInk" : ""}`}>
                        <span>
                          {i + 1}. {b.name}
                        </span>
                        <span className="tabular-nums">{b.best}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <button type="button" onClick={confirm} className={primaryBtn}>
                <ArrowCounterClockwise size={16} weight="bold" />
                {match ? "Rematch" : "Shoot again"}
              </button>
              <button type="button" onClick={back} className={ghostBtn}>
                Menu
              </button>
            </div>
            <p className="mt-4 text-xs text-white/55">South or west button to go again, east for the menu. Enter, or Esc.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
