"use client";

/**
 * Golden Hour: the portfolio as an open island you drive around. The island
 * is shaped like Mauritius; every place on the map is a part of the site
 * (the projects, the toolbox, the five-step process as a coast-road race,
 * the archery range, a way to get in touch), ten golden arrows are hidden
 * at landmarks, and the car radio plays five stations of original music made
 * in the browser.
 *
 * This file is the interface: loading, title, HUD, minimap, phone, map,
 * place cards and touch controls. The 3D world and the car live in
 * engine.ts; the sound in audio.ts.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSiteContent } from "@/context/SiteContext";
import { useReduceMotion } from "@/lib/useReduceMotion";
import Game from "@/components/console/Game";
import { GUEST } from "@/components/console/players";
import { unlockSound } from "@/components/console/sound";
import { SPOTTER_TAKES } from "@/components/console/tiles";
import { IslandEngine, type EngineEvent, type Hud, type PadButton } from "./engine";
import { generate, nearestNode, type World } from "./world";
import { paintMap, toMap, fromMap, MAP_SCALE } from "./mapImage";
import { KIND_COLOR, drawGlyph } from "./scene";
import type { PoiKind } from "./geo";
import {
  STATIONS,
  carSound,
  currentStation,
  disposeAudio,
  duckAll,
  horn,
  loadAudioPrefs,
  onNowPlaying,
  onSubtitle,
  setDj,
  setMusicVolume,
  setSfxVolume,
  setTalkScript,
  sfx,
  tune,
  unlockAudio,
} from "./audio";

/* ── Saved progress ────────────────────────────────────────────────────── */

interface Save {
  found: string[];
  arrows: number[];
  best: number | null;
  paint: number;
  station: number;
  seen: string[]; // messages already sent
}

const SAVE_KEY = "am-island-v1";
const blankSave = (): Save => ({ found: [], arrows: [], best: null, paint: 0xe8873a, station: 0, seen: [] });

function readSave(): Save {
  try {
    return { ...blankSave(), ...JSON.parse(localStorage.getItem(SAVE_KEY) ?? "{}") };
  } catch {
    return blankSave();
  }
}

function writeSave(s: Save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* progress just will not persist */
  }
  // The console's tile shows the progress; tell it.
  window.dispatchEvent(new Event("am-island-save"));
}

const PAINTS: { name: string; hex: number }[] = [
  { name: "Ginger", hex: 0xe8873a },
  { name: "Lagoon", hex: 0x1fa6a0 },
  { name: "Flamingo", hex: 0xe8467c },
  { name: "Midnight", hex: 0x1b2340 },
  { name: "Pearl", hex: 0xeae6dc },
  { name: "Cane", hex: 0x8fbf3a },
];

const TIPS = [
  "Every marker on the map is a part of the portfolio.",
  "Ten golden arrows are hidden at landmarks around the island.",
  "The coast road from Flic en Flac is a race. Five checkpoints, five steps.",
  "Change the station with Q and E, or left and right on the d-pad.",
  "Lost? Press G and the GPS picks the nearest place you have not seen.",
  "Hold the handbrake in a corner to slide.",
];

const fmtTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
};

const fmtClock = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

/* ── Content, as places ────────────────────────────────────────────────── */

interface CardData {
  id: string;
  kind: PoiKind;
  place: string;
  kicker: string;
  title: string;
  highlight?: string;
  body: string[];
  image?: string;
  tags?: string[];
  lesson?: { title: string; body: string };
  take?: string;
  groups?: { title: string; note: string; items: { name: string; detail: string }[] }[];
  stats?: { value: string; label: string }[];
  quote?: string;
}

function useCards(world: World | null): CardData[] {
  const { content } = useSiteContent();
  return useMemo(() => {
    if (!world) return [];
    const { about, work, skills, process, archery, contact, hero, meta } = content;
    return world.pois.map((p): CardData => {
      const base = { id: p.id, kind: p.kind, place: p.place };
      switch (p.kind) {
        case "about":
          return {
            ...base,
            kicker: `${meta.role}, ${meta.location}`,
            title: about.heading,
            highlight: about.headingHighlight,
            body: [about.body1, about.body2],
            stats: hero.stats,
            tags: about.values,
          };
        case "project": {
          const shot = work.shots[p.project ?? 0];
          return {
            ...base,
            kicker: shot.type,
            title: shot.name,
            body: [shot.description],
            image: shot.image,
            tags: shot.tags,
            lesson: { title: "What it taught me", body: shot.adjustment },
            take: SPOTTER_TAKES[shot.number],
          };
        }
        case "garage":
          return { ...base, kicker: skills.label, title: skills.heading, body: [skills.subheading], groups: skills.groups };
        case "race":
          return {
            ...base,
            kicker: process.label,
            title: process.heading,
            body: [process.subheading, "Five checkpoints down the west coast road to Le Morne. Each one is a step of how I work."],
          };
        case "range":
          return { ...base, kicker: archery.label, title: archery.heading, body: [archery.quoteBody], quote: archery.quote, stats: archery.stats };
        case "contact":
          return { ...base, kicker: contact.label, title: contact.heading, highlight: contact.headingHighlight, body: [contact.body] };
      }
    });
  }, [content, world]);
}

const KIND_LABEL: Record<PoiKind, string> = {
  about: "Start here",
  project: "Project",
  garage: "The garage",
  race: "Race",
  range: "Archery range",
  contact: "Get in touch",
};

/* ── The app ───────────────────────────────────────────────────────────── */

type Overlay =
  | null
  | { type: "card"; id: string }
  | { type: "pause" }
  | { type: "map" }
  | { type: "phone"; app: string }
  | { type: "game" }
  | { type: "result"; time: number; best: number; isBest: boolean }
  | { type: "complete" };

interface Toast {
  id: number;
  from: string;
  text: string;
}

/**
 * `onExit` is set when the console launched the game: "back to the console"
 * returns to its home screen instead of loading the page again, and the
 * centre button of a pad goes home from anywhere, as on a console.
 */
export default function IslandApp({ onExit }: { onExit?: () => void } = {}) {
  const { content } = useSiteContent();
  const reduce = useReduceMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<IslandEngine | null>(null);
  const [world, setWorld] = useState<World | null>(null);
  const [mapImg, setMapImg] = useState<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<"boot" | "title" | "play">("boot");
  const [load, setLoad] = useState({ p: 0, label: "Starting" });
  const [failed, setFailed] = useState(false);
  const [overlay, setOverlayState] = useState<Overlay>(null);
  const overlayRef = useRef<Overlay>(null);
  const [save, setSaveState] = useState<Save>(blankSave);
  const saveRef = useRef<Save>(blankSave());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [splash, setSplash] = useState<{ title: string; sub: string; color: string } | null>(null);
  const [now, setNow] = useState<{ station: string; freq: string; color: string; song?: string; artist?: string } | null>(null);
  const [showNow, setShowNow] = useState(false);
  const [subtitle, setSubtitle] = useState<{ text: string; who: string } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [stepToast, setStepToast] = useState<{ n: string; phase: string; distance: string; text: string } | null>(null);
  const [pad, setPad] = useState(false);
  const [touch, setTouch] = useState(false);
  const [audioPrefs, setAudioPrefs] = useState({ music: 0.7, sfx: 0.8, dj: true });
  const [quality, setQualityState] = useState<"high" | "low">("high");
  const [hold, setHold] = useState(false);
  const [hint, setHint] = useState(true);
  const [tip, setTip] = useState(0);
  const [racing, setRacing] = useState(false);
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
  const cards = useCards(world);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const hudRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const gearRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const placeRef = useRef<HTMLSpanElement>(null);
  const raceRef = useRef<HTMLSpanElement>(null);
  const raceNextRef = useRef<HTMLSpanElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);

  const setOverlay = useCallback((o: Overlay) => {
    overlayRef.current = o;
    setOverlayState(o);
  }, []);

  const updateSave = useCallback((fn: (s: Save) => Save) => {
    const next = fn(saveRef.current);
    saveRef.current = next;
    setSaveState(next);
    writeSave(next);
  }, []);

  /* ── Messages from the Spotter ────────────────────────────────────── */

  const toastId = useRef(0);
  const text = useCallback(
    (key: string, body: string, from = "The Spotter") => {
      if (saveRef.current.seen.includes(key) && key !== "*") return;
      if (key !== "*") updateSave((s) => ({ ...s, seen: [...s.seen, key] }));
      const id = ++toastId.current;
      setToasts((t) => [...t.slice(-2), { id, from, text: body }]);
      setMessages((m) => [...m, { from, text: body }]);
      sfx.notify();
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 7000);
    },
    [updateSave],
  );

  /* ── Boot: build the island ────────────────────────────────────────── */

  useEffect(() => {
    const s = readSave();
    saveRef.current = s;
    setSaveState(s);
    setAudioPrefs(loadAudioPrefs());
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    let cancelled = false;
    let engine: IslandEngine | null = null;
    const lowEnd = window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    (async () => {
      try {
        const w = await generate((p, label) => !cancelled && setLoad({ p, label }));
        if (cancelled || !canvasRef.current) return;
        setLoad({ p: 0.9, label: "Polishing the car" });
        await new Promise((r) => setTimeout(r, 0));
        engine = new IslandEngine(canvasRef.current, w, (e) => handleRef.current(e), {
          quality: lowEnd ? "low" : "high",
          found: s.found,
          arrows: s.arrows,
          reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        });
        engine.setPaint(s.paint);
        engineRef.current = engine;
        (window as unknown as { __island?: IslandEngine }).__island = engine;
        setQualityState(engine.getQuality());
        setMapImg(paintMap(w));
        engine.start();
        setLoad({ p: 1, label: "Ready" });
        setWorld(w);
        setTimeout(() => !cancelled && setPhase("title"), 450);
      } catch (err) {
        console.error(err);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      engine?.dispose();
      engineRef.current = null;
      disposeAudio();
    };
  }, []);

  useEffect(() => {
    if (phase !== "boot") return;
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 2600);
    return () => clearInterval(id);
  }, [phase]);

  /* ── Radio and the talk show ───────────────────────────────────────── */

  useEffect(() => {
    onNowPlaying(({ station, song }) => {
      if (!station) {
        setNow(null);
        return;
      }
      setNow({ station: station.name, freq: station.freq, color: station.color, song: song?.title, artist: song?.artist });
      setShowNow(true);
    });
    onSubtitle((t, who) => setSubtitle(t ? { text: t, who } : null));
    const { about, process, work, archery, contact, meta } = content;
    setTalkScript([
      `Good evening, island. On the show tonight, a ${meta.role.toLowerCase()} from ${meta.location} who turned his portfolio into a drive.`,
      `${about.heading} ${about.headingHighlight} That is how he describes himself. ${about.body2}`,
      `He works in five steps, the same on the archery range and at the desk. ${process.steps.map((s) => s.phase).join(", ")}.`,
      ...work.shots.map((s) => `Project: ${s.name}. ${s.description} What it taught him: ${s.adjustment}`),
      `A caller asks about archery. ${archery.quote} ${archery.quoteBody}`,
      `${contact.heading} ${contact.headingHighlight} You will find the contact marker in Curepipe. Back after the music.`,
    ]);
  }, [content]);

  useEffect(() => {
    if (!showNow) return;
    const id = setTimeout(() => setShowNow(false), 4200);
    return () => clearTimeout(id);
  }, [showNow, now]);

  const changeStation = useCallback(
    (dir: 1 | -1) => {
      const n = STATIONS.length + 1; // the last slot is off
      const cur = currentStation();
      const idx = cur < 0 ? STATIONS.length : cur;
      const next = (idx + dir + n) % n;
      const st = next === STATIONS.length ? -1 : next;
      tune(st);
      updateSave((s) => ({ ...s, station: st }));
      if (st < 0) {
        setNow({ station: "Radio off", freq: "", color: "#ffffff" });
        setShowNow(true);
      }
    },
    [updateSave],
  );

  /* ── Starting to drive ─────────────────────────────────────────────── */

  const begin = useCallback(() => {
    const e = engineRef.current;
    if (!e || phase !== "title") return;
    unlockAudio();
    sfx.select();
    tune(saveRef.current.station);
    e.beginDrive();
    setPhase("play");
    setTimeout(() => setHint(false), 22000);
    const first = e.world.pois.find((p) => !saveRef.current.found.includes(p.id));
    if (first) e.setTarget({ x: first.x, z: first.z });
    setTimeout(() => {
      if (saveRef.current.found.length === 0)
        text("welcome", "Welcome to the island. Nine places on the map, each one a part of his work. The GPS is set for the first one, right here in Port Louis.");
      else text("*", `Welcome back. ${saveRef.current.found.length} of 9 places seen. Press ${pad ? "Y" : "G"} and the GPS finds the next one.`);
    }, 3600);
  }, [phase, text, pad]);

  /* ── Places ────────────────────────────────────────────────────────── */

  const gpsNext = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    const h = e.hud();
    const left = e.world.pois.filter((p) => !saveRef.current.found.includes(p.id));
    const pool = left.length ? left : e.world.pois;
    pool.sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z));
    const p = pool[0];
    e.setTarget({ x: p.x, z: p.z });
    sfx.select();
    const card = cardsRef.current.find((c) => c.id === p.id);
    setSplash({ title: "GPS set", sub: `${card?.title ?? KIND_LABEL[p.kind]}, ${p.place}`, color: KIND_COLOR[p.kind] });
    setTimeout(() => setSplash(null), 1600);
  }, []);

  const openCard = useCallback(
    (id: string, arrived: boolean) => {
      const e = engineRef.current;
      if (!e) return;
      const first = !saveRef.current.found.includes(id);
      const poi = e.world.pois.find((p) => p.id === id)!;
      if (arrived) e.setMode("card");
      if (first && arrived) {
        updateSave((s) => ({ ...s, found: [...s.found, id] }));
        e.markVisited(id);
        sfx.found();
        const card = cardsRef.current.find((c) => c.id === id);
        setSplash({
          title: poi.kind === "project" ? "Project unlocked" : "New place",
          sub: card?.title ?? "",
          color: KIND_COLOR[poi.kind],
        });
        setTimeout(() => {
          setSplash(null);
          setOverlay({ type: "card", id });
        }, reduce ? 300 : 1900);
      } else {
        sfx.select();
        setOverlay({ type: "card", id });
      }
      const t = e.getTarget();
      if (t && Math.hypot(t.x - poi.x, t.z - poi.z) < 20) e.setTarget(null);
    },
    [reduce, setOverlay, updateSave],
  );

  const closeOverlay = useCallback(() => {
    const e = engineRef.current;
    const o = overlayRef.current;
    if (!o) return;
    sfx.back();
    setOverlay(null);
    if (e && e.mode === "card") e.setMode("drive");
    if (o.type === "card") {
      const found = saveRef.current.found.length;
      if (found === 1) text("first", `Good. Pink markers are his projects, the others are the rest of him. Press ${pad ? "Y" : "G"} any time and the GPS picks the nearest place you have not seen.`);
      if (found === 9 && !saveRef.current.seen.includes("complete")) {
        setTimeout(() => setOverlay({ type: "complete" }), 600);
        text("complete", "That is the whole island. Now you know him. Write to him, he answers.");
      }
    }
  }, [pad, setOverlay, text]);

  /* ── Events from the engine ────────────────────────────────────────── */

  const handleRef = useRef<(e: EngineEvent) => void>(() => {});
  handleRef.current = (ev: EngineEvent) => {
    const e = engineRef.current;
    if (!e) return;
    switch (ev.type) {
      case "poi":
        if (!overlayRef.current && phase === "play") openCard(ev.id, true);
        break;
      case "arrow": {
        updateSave((s) => ({ ...s, arrows: [...new Set([...s.arrows, ev.index])] }));
        sfx.arrow();
        const n = saveRef.current.arrows.length;
        setSplash({ title: `Golden arrow ${n} of 10`, sub: e.world.arrows[ev.index].name, color: "#ffcf5a" });
        setTimeout(() => setSplash(null), 2200);
        if (n === 1) text("arrow", "You found one of his arrows. There are ten, all at landmarks. He loses them everywhere.");
        if (n === 10) text("arrows", "All ten arrows. I have been looking for those for years.");
        break;
      }
      case "countdown":
        setCountdown(ev.n);
        sfx.count(ev.n === 0);
        if (ev.n === 0) setTimeout(() => setCountdown(null), 700);
        break;
      case "checkpoint": {
        sfx.checkpoint();
        const st = content.process.steps[ev.index];
        if (st) setStepToast({ n: st.step, phase: st.phase, distance: st.distance, text: st.description });
        break;
      }
      case "finish": {
        sfx.finish();
        const st = content.process.steps[4];
        if (st) setStepToast({ n: st.step, phase: st.phase, distance: st.distance, text: st.description });
        const prev = saveRef.current.best;
        const isBest = prev === null || ev.time < prev;
        if (isBest) updateSave((s) => ({ ...s, best: ev.time }));
        setRacing(false);
        e.setMode("card");
        setTimeout(() => setOverlay({ type: "result", time: ev.time, best: isBest ? ev.time : prev!, isBest }), 900);
        break;
      }
      case "bump":
        sfx.bump(ev.strength);
        break;
      case "padUsed":
        setPad(true);
        break;
      case "pad":
        setPad(true);
        padAction(ev.button);
        break;
    }
  };

  useEffect(() => {
    if (!stepToast) return;
    const id = setTimeout(() => setStepToast(null), 5200);
    return () => clearTimeout(id);
  }, [stepToast]);

  /* ── Input outside the car: keys and pad buttons ───────────────────── */

  const overlayEl = useRef<HTMLDivElement>(null);

  const navFocus = (dir: 1 | -1) => {
    const root = overlayEl.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-nav]")).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = items[i < 0 ? 0 : (i + dir + items.length) % items.length];
    next.focus();
    next.scrollIntoView({ block: "nearest" });
    sfx.move();
  };

  const openPhone = useCallback(
    (app = "home") => {
      sfx.phone();
      engineRef.current?.setMode(engineRef.current.mode === "intro" ? "intro" : "frozen");
      setOverlay({ type: "phone", app });
    },
    [setOverlay],
  );

  const openMap = useCallback(() => {
    sfx.select();
    setOverlay({ type: "map" });
  }, [setOverlay]);

  const openPause = useCallback(() => {
    sfx.select();
    setOverlay({ type: "pause" });
  }, [setOverlay]);

  const goHome = () => {
    sfx.back();
    if (onExit) onExit();
    else window.location.href = "/";
  };

  const padAction = (b: PadButton) => {
    if (b === "home") return goHome();
    if (phase === "title") {
      if (b === "a" || b === "start" || b === "rt") begin();
      return;
    }
    if (phase !== "play") return;
    const o = overlayRef.current;
    if (o?.type === "game") return;
    if (!o) {
      if (b === "start") openPause();
      else if (b === "select") openMap();
      else if (b === "up") openPhone();
      else if (b === "left") changeStation(-1);
      else if (b === "right") changeStation(1);
      else if (b === "y") gpsNext();
      else if (b === "x") {
        horn(true);
        setTimeout(() => horn(false), 260);
      }
      return;
    }
    if (b === "up" || b === "left") navFocus(-1);
    else if (b === "down" || b === "right") navFocus(1);
    else if (b === "a") (document.activeElement as HTMLElement | null)?.click();
    else if (b === "b") backFrom(o);
    else if (b === "start" && o.type === "pause") closeOverlay();
    else if (b === "select" && o.type === "map") closeOverlay();
  };

  const backFrom = (o: Overlay) => {
    if (o?.type === "phone" && o.app !== "home") {
      sfx.back();
      setOverlay({ type: "phone", app: "home" });
    } else closeOverlay();
  };

  useEffect(() => {
    const down = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (t.tagName === "INPUT" && (t as HTMLInputElement).type !== "range") return;
      setPad(false);
      if (phase === "title") {
        if (ev.code === "Escape" && onExit) return goHome();
        if (!ev.metaKey && !ev.ctrlKey && ev.key !== "Tab") begin();
        return;
      }
      if (phase !== "play") return;
      const o = overlayRef.current;
      if (o?.type === "game") return;
      if (!o) {
        if (ev.code === "Escape") openPause();
        else if (ev.code === "KeyM") openMap();
        else if (ev.code === "KeyP" || ev.code === "Tab") {
          ev.preventDefault();
          openPhone();
        } else if (ev.code === "KeyQ") changeStation(-1);
        else if (ev.code === "KeyE") changeStation(1);
        else if (ev.code === "KeyG") gpsNext();
        else if (ev.code === "KeyH" && !ev.repeat) horn(true);
        return;
      }
      if (ev.code === "Escape" || (ev.code === "Backspace" && t.tagName !== "INPUT")) {
        ev.preventDefault();
        backFrom(o);
      } else if (ev.code === "KeyM" && o.type === "map") closeOverlay();
      else if (ev.code === "KeyP" && o.type === "phone") closeOverlay();
      else if (["ArrowDown", "ArrowRight"].includes(ev.code) && t.tagName !== "INPUT") {
        ev.preventDefault();
        navFocus(1);
      } else if (["ArrowUp", "ArrowLeft"].includes(ev.code) && t.tagName !== "INPUT") {
        ev.preventDefault();
        navFocus(-1);
      }
    };
    const up = (ev: KeyboardEvent) => {
      if (ev.code === "KeyH") horn(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  // The game below pauses the island; the menus freeze the car.
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    e.inputSuspended = overlay?.type === "game";
    if (!overlay && phase === "play" && (e.mode === "frozen" || e.mode === "card")) e.setMode("drive");
    if (overlay && overlay.type !== "card" && overlay.type !== "result" && e.mode === "drive") e.setMode("frozen");
    duckAll(overlay?.type === "game");
  }, [overlay, phase]);

  // Focus the first control when an overlay opens.
  useEffect(() => {
    if (!overlay || overlay.type === "game") return;
    const id = setTimeout(() => {
      const first = overlayEl.current?.querySelector<HTMLElement>("[data-autofocus]") ?? overlayEl.current?.querySelector<HTMLElement>("[data-nav]");
      first?.focus({ preventScroll: true });
    }, 60);
    return () => clearTimeout(id);
  }, [overlay]);

  /* ── The HUD, written straight to the DOM every frame ──────────────── */

  useEffect(() => {
    if (phase !== "play" || !mapImg) return;
    let raf = 0;
    let nightSent = false;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const e = engineRef.current;
      if (!e) return;
      const h = e.hud();
      if (speedRef.current) speedRef.current.textContent = String(Math.round(h.speed * 3.6));
      if (gearRef.current) gearRef.current.textContent = h.gear < 0 ? "R" : h.speed < 0.5 ? "N" : String(h.gear);
      if (clockRef.current) clockRef.current.textContent = fmtClock(h.hour);
      if (placeRef.current && placeRef.current.textContent !== h.place) placeRef.current.textContent = h.place;
      if (raceRef.current) raceRef.current.textContent = h.race ? fmtTime(h.race.time) : "";
      if (raceNextRef.current) raceNextRef.current.textContent = h.race ? `Checkpoint ${Math.min(5, h.race.next + 1)} of 5` : "";
      carSound({ ...h, night: e.nightness(), active: e.mode === "drive" || e.mode === "intro" || e.mode === "card" || e.mode === "frozen" });
      drawMini(miniRef.current, mapImg, h, e, saveRef.current);
      if (!nightSent && e.nightness() > 0.8) {
        nightSent = true;
        text("night", "Lights on. Ebène looks better at night anyway, all those towers.");
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phase, mapImg, text]);

  /* ── Actions ───────────────────────────────────────────────────────── */

  const startRace = () => {
    const e = engineRef.current;
    if (!e) return;
    setOverlay(null);
    setRacing(true);
    e.setTarget(null);
    e.startRace();
  };

  const quitRace = () => {
    engineRef.current?.cancelRace();
    setRacing(false);
    setCountdown(null);
    setOverlay(null);
  };

  const mailto = useMemo(() => {
    const subject = encodeURIComponent("Hello from the island");
    return `mailto:${content.meta.email}?subject=${subject}`;
  }, [content.meta.email]);

  const setPaint = (hex: number) => {
    engineRef.current?.setPaint(hex);
    updateSave((s) => ({ ...s, paint: hex }));
    sfx.select();
  };

  const setGps = (id: string) => {
    const e = engineRef.current;
    const p = e?.world.pois.find((q) => q.id === id);
    if (!e || !p) return;
    e.setTarget({ x: p.x, z: p.z });
    sfx.select();
    setOverlay(null);
  };

  const setQuality = (q: "high" | "low") => {
    engineRef.current?.setQuality(q);
    setQualityState(q);
  };

  const setTimeOfDay = (h: number | null) => {
    const e = engineRef.current;
    if (!e) return;
    if (h !== null) e.setHour(h);
    sfx.select();
  };

  const toggleHold = () => {
    const e = engineRef.current;
    if (!e) return;
    const next = !hold;
    setHold(next);
    e.hourRate = next ? 0 : 1 / 150;
  };

  /* ── Render ────────────────────────────────────────────────────────── */

  const stats = engineRef.current?.hud();
  const card = overlay?.type === "card" ? cards.find((c) => c.id === overlay.id) : null;
  const found = save.found.length;

  return (
    <div className="island fixed inset-0 z-[60] select-none overflow-hidden bg-[#07060a] text-white">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      {/* Loading */}
      <AnimatePresence>
        {phase === "boot" && (
          <motion.div
            key="boot"
            className="island-sunset absolute inset-0 z-40 flex flex-col items-center justify-center px-6"
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
          >
            <div className="island-sun" aria-hidden="true" />
            <p className="island-title relative text-[clamp(3.4rem,13vw,10rem)]">Golden Hour</p>
            <p className="relative mt-3 text-sm uppercase tracking-[0.4em] text-white/75">A portfolio you drive</p>
            <div className="relative mt-14 w-[min(26rem,80vw)]">
              <div className="h-1 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={Math.round(load.p * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Loading the island">
                <div className="h-full rounded-full bg-white transition-[width] duration-300" style={{ width: `${load.p * 100}%` }} />
              </div>
              <p className="mt-3 flex justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
                <span>{failed ? "Could not start the 3D view" : load.label}</span>
                <span>{Math.round(load.p * 100)}%</span>
              </p>
            </div>
            <p className="relative mt-10 max-w-md text-center text-sm text-white/70" aria-live="polite">
              {failed ? (
                <>
                  This needs WebGL, which this browser has switched off.{" "}
                  <button type="button" onClick={goHome} className="underline">
                    Go back to the console
                  </button>
                  .
                </>
              ) : (
                <>Tip: {TIPS[tip]}</>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title, over a slow flight around the island */}
      <AnimatePresence>
        {phase === "title" && (
          <motion.div
            key="title"
            className="absolute inset-0 z-30 flex flex-col items-center justify-end pb-[12vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            onPointerDown={begin}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(0,0,0,0.75),transparent_60%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[14vh] bg-black" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[8vh] bg-black" />
            <motion.p
              className="island-title relative text-[clamp(3.6rem,14vw,12rem)]"
              initial={{ y: 30, opacity: 0, letterSpacing: "0.12em" }}
              animate={{ y: 0, opacity: 1, letterSpacing: "0.01em" }}
              transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            >
              Golden Hour
            </motion.p>
            <p className="relative mt-2 text-xs uppercase tracking-[0.5em] text-white/80 sm:text-sm">
              {content.meta.name} &nbsp;·&nbsp; {content.meta.role}
            </p>
            <motion.button
              type="button"
              className="island-blink relative mt-10 rounded-full border border-white/40 bg-black/30 px-7 py-3 text-sm font-semibold uppercase tracking-[0.3em] backdrop-blur"
              onClick={begin}
              autoFocus
            >
              {touch ? "Tap to drive" : "Press any button"}
            </motion.button>
            <p className="relative mt-4 text-xs text-white/60">Keyboard, mouse, touch or a controller. Sound on.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD */}
      {phase === "play" && (
        <div ref={hudRef} className="pointer-events-none absolute inset-0 z-10">
          {/* top left: where you are and what to do */}
          <div className="absolute left-4 top-4 sm:left-6 sm:top-5">
            <p className="island-title text-[1.6rem] leading-none sm:text-[2rem]">Golden Hour</p>
            <p className="mt-2 hidden max-w-[18rem] text-[13px] leading-snug text-white/85 [text-shadow:0_1px_6px_rgba(0,0,0,0.7)] sm:block">
              {racing
                ? "Race the coast road. Through every ring."
                : found < 9
                  ? `Find all nine places. ${found} of 9 so far.`
                  : "Island complete. Drive anywhere you like."}
            </p>
          </div>
          {/* top right: time and progress */}
          <div className="absolute right-4 top-4 text-right sm:right-6 sm:top-5">
            <p className="font-display text-[2rem] font-bold leading-none tabular-nums [text-shadow:0_2px_10px_rgba(0,0,0,0.6)]">
              <span ref={clockRef}>17:00</span>
            </p>
            <p className="mt-1.5 flex items-center justify-end gap-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/80">
              <span>Places {found}/9</span>
              <span className="text-[#ffcf5a]">Arrows {save.arrows.length}/10</span>
            </p>
          </div>

          {/* race timer */}
          {racing && (
            <div className="absolute left-1/2 top-5 -translate-x-1/2 text-center">
              <p className="font-display text-[2.6rem] font-extrabold leading-none tabular-nums text-[#ffd84a] [text-shadow:0_2px_14px_rgba(0,0,0,0.7)]">
                <span ref={raceRef}>0:00.00</span>
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-white/80">
                <span ref={raceNextRef} />
              </p>
            </div>
          )}

          {/* bottom left: minimap and place */}
          <div className={touch ? "absolute left-4 top-[4.6rem]" : "absolute bottom-4 left-4 sm:bottom-6 sm:left-6"}>
            <div className={`island-mini relative ${touch ? "h-[118px] w-[118px]" : "h-[150px] w-[150px] sm:h-[190px] sm:w-[190px]"}`}>
              <canvas ref={miniRef} width={380} height={380} className="h-full w-full" />
            </div>
            <p className="mt-2 max-w-[190px] truncate text-[13px] font-semibold uppercase tracking-[0.14em] [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
              <span ref={placeRef} />
            </p>
          </div>

          {/* bottom right: speed and radio */}
          <div className={`absolute right-4 text-right sm:right-6 ${touch ? "bottom-[15rem]" : "bottom-4 sm:bottom-6"}`}>
            <p className="leading-none [text-shadow:0_2px_12px_rgba(0,0,0,0.65)]">
              <span ref={speedRef} className="font-display text-[3.4rem] font-extrabold tabular-nums sm:text-[4.2rem]">
                0
              </span>
              <span className="ml-1 font-mono text-xs uppercase tracking-[0.2em] text-white/70">km/h</span>
            </p>
            <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-white/75">
              Gear <span ref={gearRef} className="text-white">N</span>
            </p>
            <p className="mt-2 text-[12px] text-white/70">
              {now?.freq ? `${now.freq} ${now.station}` : "Radio off"} {!touch && <span className="text-white/45">{pad ? "d-pad" : "Q / E"}</span>}
            </p>
          </div>

          {/* controls, for the first stretch */}
          <AnimatePresence>
            {hint && !touch && (
              <motion.p
                className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-4 py-2 text-[12px] text-white/85 backdrop-blur md:block"
                exit={{ opacity: 0 }}
              >
                {pad
                  ? "R2 drive · L2 brake · B drift · Y GPS · Up phone · View map · Menu pause"
                  : "W A S D drive · Space drift · G GPS · M map · P phone · Q E radio · H horn · Esc pause"}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Now playing */}
      <AnimatePresence>
        {phase === "play" && showNow && now && (
          <motion.div
            key={now.station + (now.song ?? "")}
            className="pointer-events-none absolute left-1/2 top-[13vh] z-20 -translate-x-1/2 text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: now.color }}>
              {now.freq ? `${now.freq} FM` : ""}
            </p>
            <p className="island-title text-[clamp(2.2rem,5vw,3.6rem)]" style={{ ["--glow" as string]: now.color }}>
              {now.station}
            </p>
            {now.song && (
              <p className="mt-1 text-sm text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
                {now.song} <span className="text-white/55">by</span> {now.artist}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtitles for the DJ */}
      <AnimatePresence>
        {phase === "play" && subtitle && (
          <motion.p
            className="pointer-events-none absolute bottom-[7.5rem] left-1/2 z-20 w-[min(42rem,88vw)] -translate-x-1/2 text-center text-[15px] leading-snug [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-live="polite"
          >
            <span className="font-semibold text-[#ffb547]">{subtitle.who}: </span>
            {subtitle.text}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Splash: place found, arrow found, GPS set */}
      <AnimatePresence>
        {splash && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-[34vh] z-30 text-center"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            aria-live="assertive"
          >
            <p className="island-title text-[clamp(2.6rem,8vw,6rem)]" style={{ ["--glow" as string]: splash.color }}>
              {splash.title}
            </p>
            <p className="mt-2 text-lg font-semibold [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]">{splash.sub}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Race countdown and steps */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.p
            key={countdown}
            className="island-title pointer-events-none absolute inset-x-0 top-[30vh] z-30 text-center text-[clamp(5rem,16vw,11rem)]"
            style={{ ["--glow" as string]: "#ffd84a" }}
            initial={{ scale: 1.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {countdown === 0 ? "Go" : countdown}
          </motion.p>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {stepToast && (
          <motion.div
            className="pointer-events-none absolute left-4 top-[22vh] z-20 w-[min(22rem,80vw)] rounded-2xl border border-[#ffd84a]/40 bg-black/60 p-4 backdrop-blur-md sm:left-6"
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -30, opacity: 0 }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#ffd84a]">
              Step {stepToast.n} · {stepToast.distance}
            </p>
            <p className="island-title mt-1 text-[2.2rem]" style={{ ["--glow" as string]: "#ffd84a" }}>
              {stepToast.phase}
            </p>
            <p className="mt-1 text-sm leading-snug text-white/85">{stepToast.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Texts from the Spotter */}
      <div className={`pointer-events-none absolute right-4 z-20 flex w-[min(21rem,86vw)] flex-col gap-2 sm:right-6 ${touch ? "top-[13.6rem]" : "top-24"} ${overlay ? "hidden" : ""}`}>
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              className="rounded-2xl border border-white/10 bg-[#101218]/85 p-3 shadow-2xl backdrop-blur-md"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              role="status"
            >
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4fd2ff]">
                <span className="inline-block h-2 w-2 rounded-full bg-[#4fd2ff]" /> {t.from}
              </p>
              <p className="mt-1 text-[13px] leading-snug text-white/90">{t.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Touch controls */}
      {phase === "play" && touch && !overlay && <TouchControls engine={engineRef} onMap={openMap} onPhone={() => openPhone()} onPause={openPause} onRadio={() => changeStation(1)} />}

      {/* Overlays */}
      <div ref={overlayEl}>
        <AnimatePresence>
          {card && overlay?.type === "card" && (
            <CardView
              key={card.id}
              card={card}
              pad={pad}
              best={save.best}
              paint={save.paint}
              onClose={closeOverlay}
              onRace={startRace}
              onRange={() => {
                unlockSound({ holdMusic: true });
                setOverlay({ type: "game" });
              }}
              onPaint={setPaint}
              mailto={mailto}
              email={content.meta.email}
              linkedin={content.meta.linkedin}
              onNext={() => {
                closeOverlay();
                setTimeout(gpsNext, 50);
              }}
            />
          )}
          {overlay?.type === "pause" && (
            <Sheet key="pause" title="Paused" onClose={closeOverlay}>
              <div className="flex flex-col gap-2">
                <MenuButton autofocus onClick={closeOverlay}>Back to the car</MenuButton>
                <MenuButton onClick={openMap}>Map</MenuButton>
                <MenuButton onClick={() => openPhone()}>Phone</MenuButton>
                <MenuButton onClick={() => openPhone("settings")}>Settings</MenuButton>
                {racing && <MenuButton onClick={quitRace}>Leave the race</MenuButton>}
                <MenuButton onClick={goHome}>{onExit ? "Back to the home screen" : "Back to the console"}</MenuButton>
              </div>
              <Controls pad={pad} />
            </Sheet>
          )}
          {overlay?.type === "map" && world && mapImg && (
            <MapView
              key="map"
              world={world}
              mapImg={mapImg}
              cards={cards}
              found={save.found}
              engine={engineRef.current}
              onClose={closeOverlay}
              onGps={setGps}
              pad={pad}
            />
          )}
          {overlay?.type === "phone" && world && (
            <Phone
              key="phone"
              app={overlay.app}
              setApp={(app) => {
                sfx.select();
                setOverlay({ type: "phone", app });
              }}
              onClose={closeOverlay}
              cards={cards}
              found={save.found}
              arrows={save.arrows}
              arrowNames={world.arrows.map((a) => a.name)}
              messages={messages}
              best={save.best}
              stats={stats}
              onMap={openMap}
              onOpen={(id) => openCard(id, false)}
              onGps={setGps}
              mailto={mailto}
              email={content.meta.email}
              linkedin={content.meta.linkedin}
              audio={audioPrefs}
              setAudio={(p) => {
                setAudioPrefs(p);
                setMusicVolume(p.music);
                setSfxVolume(p.sfx);
                setDj(p.dj);
              }}
              quality={quality}
              setQuality={setQuality}
              hold={hold}
              toggleHold={toggleHold}
              setHour={setTimeOfDay}
              onStation={(i) => {
                tune(i);
                updateSave((s) => ({ ...s, station: i }));
              }}
              onReset={() => {
                updateSave(() => blankSave());
                location.reload();
              }}
              onHome={goHome}
              embedded={!!onExit}
            />
          )}
          {overlay?.type === "result" && (
            <Sheet key="result" title={overlay.isBest ? "New best time" : "Race finished"} onClose={closeOverlay} accent="#ffd84a">
              <p className="font-display text-[3.4rem] font-extrabold tabular-nums leading-none text-[#ffd84a]">{fmtTime(overlay.time)}</p>
              <p className="mt-2 text-sm text-white/70">Best: {fmtTime(overlay.best)}</p>
              <ol className="mt-5 space-y-2">
                {content.process.steps.map((s) => (
                  <li key={s.step} className="flex gap-3 text-sm">
                    <span className="w-14 shrink-0 font-mono text-[#ffd84a]">{s.distance}</span>
                    <span>
                      <span className="font-semibold">{s.phase}.</span> <span className="text-white/75">{s.description}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap gap-2">
                <MenuButton autofocus onClick={startRace}>Race again</MenuButton>
                <MenuButton onClick={closeOverlay}>Back to the car</MenuButton>
              </div>
            </Sheet>
          )}
          {overlay?.type === "complete" && (
            <Sheet key="complete" title="Island complete" onClose={closeOverlay} accent="#f1a35a">
              <p className="text-white/85">
                All nine places. You have seen the work, the toolbox, the process and the range. {save.arrows.length < 10 ? `${10 - save.arrows.length} golden arrows are still out there.` : "And every golden arrow."}
              </p>
              <p className="mt-3 text-white/85">{content.contact.body}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a data-nav data-autofocus href={mailto} className="island-menu-btn island-menu-btn--accent">Write to me</a>
                <MenuButton onClick={closeOverlay}>Keep driving</MenuButton>
              </div>
            </Sheet>
          )}
        </AnimatePresence>
      </div>

      {/* The archery range runs the console's game */}
      {overlay?.type === "game" && (
        <div className="console" style={{ minHeight: 0 }}>
          <Game
            player={GUEST}
            bests={{}}
            board={[]}
            onExit={() => {
              setOverlay(null);
              engineRef.current?.setMode("drive");
            }}
            onArrow={() => {}}
            onPractice={() => {}}
            onMatch={() => {}}
          />
        </div>
      )}

      {/* Everything the island holds, for screen readers */}
      <div className="sr-only">
        <h1>
          {content.meta.name}, {content.meta.role}: Golden Hour
        </h1>
        <p>An island you drive around. Every place on the map is a part of the portfolio. Open the phone with P for a list of everything.</p>
      </div>
    </div>
  );
}

/* ── The minimap ───────────────────────────────────────────────────────── */

function drawMini(c: HTMLCanvasElement | null, img: HTMLCanvasElement, h: Hud, e: IslandEngine, save: Save) {
  if (!c) return;
  const ctx = c.getContext("2d")!;
  const S = c.width;
  const R = S / 2;
  const range = 460; // world units from the centre to the edge
  const k = R / range; // canvas px per unit
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath();
  ctx.arc(R, R, R - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#0d2b40";
  ctx.fillRect(0, 0, S, S);
  ctx.translate(R, R);
  ctx.rotate(h.heading + Math.PI);
  ctx.scale(k / MAP_SCALE, k / MAP_SCALE);
  const [mx, my] = toMap(h.x, h.z);
  ctx.translate(-mx, -my);
  ctx.drawImage(img, 0, 0);
  // The GPS route.
  if (h.route && h.route.length > 1) {
    ctx.strokeStyle = h.race ? "#ffd84a" : "#ffb547";
    ctx.lineWidth = 9 / (k / MAP_SCALE);
    ctx.lineJoin = "round";
    ctx.beginPath();
    h.route.forEach(([x, z], i) => {
      const [px, py] = toMap(x, z);
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    });
    ctx.stroke();
  }
  ctx.restore();

  // Places: on the map, or pinned to the edge in their direction.
  const rot = h.heading + Math.PI;
  const place = (x: number, z: number) => {
    const dx = (x - h.x) * k;
    const dz = (z - h.z) * k;
    const c2 = Math.cos(rot);
    const s2 = Math.sin(rot);
    let px = dx * c2 - dz * s2;
    let py = dx * s2 + dz * c2;
    const d = Math.hypot(px, py);
    const max = R - 16;
    if (d > max) {
      px = (px / d) * max;
      py = (py / d) * max;
    }
    return [R + px, R + py] as const;
  };
  for (const p of e.world.pois) {
    const [px, py] = place(p.x, p.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10,10,16,0.85)";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = KIND_COLOR[p.kind];
    ctx.stroke();
    ctx.scale(0.36, 0.36);
    ctx.fillStyle = KIND_COLOR[p.kind];
    ctx.strokeStyle = KIND_COLOR[p.kind];
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    drawGlyph(ctx, p.kind);
    ctx.restore();
    if (save.found.includes(p.id)) {
      ctx.beginPath();
      ctx.arc(px + 10, py - 10, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#8be36a";
      ctx.fill();
    }
  }
  const t = e.getTarget();
  if (t) {
    const [px, py] = place(t.x, t.z);
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
  // You.
  ctx.save();
  ctx.translate(R, R);
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(10, 11);
  ctx.lineTo(0, 5);
  ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.restore();
  // North, wherever it has turned to.
  const [nx, ny] = (() => {
    const a = -(h.heading + Math.PI);
    return [R + Math.sin(a) * (R - 14), R - Math.cos(a) * (R - 14)];
  })();
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(10,10,16,0.8)";
  ctx.beginPath();
  ctx.arc(nx, ny, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText("N", nx, ny + 1);
  // Rim.
  ctx.beginPath();
  ctx.arc(R, R, R - 2, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.stroke();
}

/* ── Small pieces ──────────────────────────────────────────────────────── */

function MenuButton({ children, onClick, autofocus, disabled }: { children: ReactNode; onClick: () => void; autofocus?: boolean; disabled?: boolean }) {
  return (
    <button type="button" data-nav data-autofocus={autofocus ? "" : undefined} className="island-menu-btn" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Sheet({ title, children, onClose, accent = "#ffffff" }: { title: string; children: ReactNode; onClose: () => void; accent?: string }) {
  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        className="max-h-[88vh] w-[min(34rem,100%)] overflow-y-auto rounded-3xl border border-white/10 bg-[#0d0e13]/95 p-6 shadow-2xl sm:p-8"
        initial={{ y: 24, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 12, opacity: 0 }}
      >
        <p className="island-title mb-5 text-[2.6rem]" style={{ ["--glow" as string]: accent }}>
          {title}
        </p>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Controls({ pad }: { pad: boolean }) {
  const rows: [string, string][] = pad
    ? [
        ["Drive / brake", "R2 / L2"],
        ["Steer", "Left stick"],
        ["Drift", "B or R1"],
        ["Horn", "X"],
        ["GPS to the next place", "Y"],
        ["Phone", "D-pad up"],
        ["Radio", "D-pad left / right"],
        ["Map / pause", "View / Menu"],
      ]
    : [
        ["Drive / brake", "W S or arrows"],
        ["Steer", "A D or arrows"],
        ["Drift", "Space"],
        ["Horn", "H"],
        ["GPS to the next place", "G"],
        ["Phone", "P"],
        ["Radio", "Q / E"],
        ["Map / pause", "M / Esc"],
      ];
  return (
    <dl className="mt-6 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 border-t border-white/10 pt-5 text-[13px]">
      {rows.map(([a, b]) => (
        <div key={a} className="contents">
          <dt className="text-white/65">{a}</dt>
          <dd className="text-right font-mono text-white/90">{b}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── A place, up close ─────────────────────────────────────────────────── */

function CardView({
  card,
  pad,
  best,
  paint,
  onClose,
  onRace,
  onRange,
  onPaint,
  onNext,
  mailto,
  email,
  linkedin,
}: {
  card: CardData;
  pad: boolean;
  best: number | null;
  paint: number;
  onClose: () => void;
  onRace: () => void;
  onRange: () => void;
  onPaint: (hex: number) => void;
  onNext: () => void;
  mailto: string;
  email: string;
  linkedin: string;
}) {
  const color = KIND_COLOR[card.kind];
  const [copied, setCopied] = useState(false);
  return (
    <motion.div
      className="absolute inset-0 z-40 flex"
      role="dialog"
      aria-modal="true"
      aria-label={card.title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* letterbox */}
      <motion.div className="pointer-events-none absolute inset-x-0 top-0 bg-black" initial={{ height: 0 }} animate={{ height: "7vh" }} exit={{ height: 0 }} />
      <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 bg-black" initial={{ height: 0 }} animate={{ height: "7vh" }} exit={{ height: 0 }} />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,6,10,0.92)_0%,rgba(6,6,10,0.78)_38%,rgba(6,6,10,0.1)_70%)]" onPointerDown={onClose} />
      <motion.div
        className="relative z-10 my-[7vh] flex w-full max-w-[40rem] flex-col overflow-y-auto px-6 py-8 sm:px-12"
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -20, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.24em]" style={{ color }}>
          {KIND_LABEL[card.kind]} · {card.place}
        </p>
        <p className="mt-2 text-sm text-white/70">{card.kicker}</p>
        <h2 className="island-title mt-2 text-[clamp(2.6rem,6vw,4.6rem)] leading-[0.92]" style={{ ["--glow" as string]: color }}>
          {card.title}
        </h2>
        {card.highlight && <p className="mt-2 text-xl font-semibold text-white/90">{card.highlight}</p>}
        {card.body.map((b, i) => (
          <p key={i} className="mt-4 max-w-[34rem] text-[15px] leading-relaxed text-white/85">
            {b}
          </p>
        ))}
        {card.quote && <blockquote className="mt-5 border-l-2 pl-4 text-lg italic text-white/90" style={{ borderColor: color }}>{card.quote}</blockquote>}
        {card.lesson && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color }}>{card.lesson.title}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-white/85">{card.lesson.body}</p>
          </div>
        )}
        {card.take && (
          <p className="mt-3 text-[14px] text-white/75">
            <span className="font-semibold text-[#4fd2ff]">The Spotter: </span>
            {card.take}
          </p>
        )}
        {card.stats && (
          <dl className="mt-5 flex flex-wrap gap-6">
            {card.stats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-display text-3xl font-extrabold" style={{ color }}>{s.value}</dd>
                <dd className="text-xs uppercase tracking-[0.14em] text-white/60">{s.label}</dd>
              </div>
            ))}
          </dl>
        )}
        {card.tags && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {card.tags.map((t) => (
              <li key={t} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80">{t}</li>
            ))}
          </ul>
        )}
        {card.groups && (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {card.groups.map((g) => (
                <div key={g.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-bold uppercase tracking-[0.14em]" style={{ color }}>{g.title}</p>
                  <p className="text-xs text-white/55">{g.note}</p>
                  <ul className="mt-2 space-y-1">
                    {g.items.map((it) => (
                      <li key={it.name} className="text-[13px]">
                        <span className="font-semibold">{it.name}</span> <span className="text-white/55">{it.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Respray the car</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PAINTS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  data-nav
                  onClick={() => onPaint(p.hex)}
                  aria-pressed={paint === p.hex}
                  className="island-swatch"
                  style={{ ["--swatch" as string]: `#${p.hex.toString(16).padStart(6, "0")}` }}
                >
                  <span className="sr-only">{p.name}</span>
                  <span aria-hidden="true">{p.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          {card.kind === "race" && (
            <MenuButton autofocus onClick={onRace}>
              Start the race{best !== null ? ` (best ${fmtTime(best)})` : ""}
            </MenuButton>
          )}
          {card.kind === "range" && <MenuButton autofocus onClick={onRange}>Shoot at 70 m</MenuButton>}
          {card.kind === "contact" && (
            <>
              <a data-nav data-autofocus href={mailto} className="island-menu-btn island-menu-btn--accent">Write to me</a>
              <a data-nav href={linkedin} target="_blank" rel="noreferrer" className="island-menu-btn">LinkedIn</a>
              <MenuButton
                onClick={() => {
                  navigator.clipboard?.writeText(email).then(() => setCopied(true)).catch(() => {});
                }}
              >
                {copied ? "Copied" : email}
              </MenuButton>
            </>
          )}
          {(card.kind === "project" || card.kind === "about") && <MenuButton autofocus onClick={onNext}>GPS to the next place</MenuButton>}
          <MenuButton autofocus={card.kind === "garage"} onClick={onClose}>
            Back to the car <span className="ml-1 text-white/45">{pad ? "B" : "Esc"}</span>
          </MenuButton>
        </div>
      </motion.div>
      {card.image && (
        <motion.div
          className="pointer-events-none absolute right-[4vw] top-1/2 z-10 hidden w-[min(40vw,38rem)] -translate-y-1/2 lg:block"
          initial={{ opacity: 0, x: 40, rotate: 2 }}
          animate={{ opacity: 1, x: 0, rotate: -1.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.image} alt="" className="w-full rounded-2xl border-4 border-white/90 shadow-[0_30px_80px_rgba(0,0,0,0.6)]" />
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── The full map ──────────────────────────────────────────────────────── */

function MapView({
  world,
  mapImg,
  cards,
  found,
  engine,
  onClose,
  onGps,
  pad,
}: {
  world: World;
  mapImg: HTMLCanvasElement;
  cards: CardData[];
  found: string[];
  engine: IslandEngine | null;
  onClose: () => void;
  onGps: (id: string) => void;
  pad: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [focus, setFocus] = useState<string | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const box = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = box.width * dpr;
      c.height = box.height * dpr;
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);
      const s = Math.min(box.width / mapImg.width, box.height / mapImg.height);
      const ox = (box.width - mapImg.width * s) / 2;
      const oy = (box.height - mapImg.height * s) / 2;
      ctx.fillStyle = "#0b2536";
      ctx.fillRect(0, 0, box.width, box.height);
      ctx.drawImage(mapImg, ox, oy, mapImg.width * s, mapImg.height * s);
      const at = (x: number, z: number) => {
        const [px, py] = toMap(x, z);
        return [ox + px * s, oy + py * s] as const;
      };
      const h = engine?.hud();
      if (h?.route) {
        ctx.strokeStyle = "#ffb547";
        ctx.lineWidth = 4;
        ctx.beginPath();
        h.route.forEach(([x, z], i) => {
          const [px, py] = at(x, z);
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        });
        ctx.stroke();
      }
      ctx.font = "600 12px var(--font-body), system-ui, sans-serif";
      for (const p of world.pois) {
        const [px, py] = at(p.x, p.z);
        const big = focus === p.id;
        ctx.save();
        ctx.translate(px, py);
        ctx.beginPath();
        ctx.arc(0, 0, big ? 18 : 13, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(10,10,16,0.88)";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = KIND_COLOR[p.kind];
        ctx.stroke();
        ctx.scale(big ? 0.5 : 0.36, big ? 0.5 : 0.36);
        ctx.fillStyle = ctx.strokeStyle = KIND_COLOR[p.kind];
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        drawGlyph(ctx, p.kind);
        ctx.restore();
        if (found.includes(p.id)) {
          ctx.beginPath();
          ctx.arc(px + 11, py - 11, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#8be36a";
          ctx.fill();
        }
        if (big) {
          const label = cards.find((c) => c.id === p.id)?.title ?? p.place;
          ctx.fillStyle = "#fff";
          ctx.shadowColor = "rgba(0,0,0,0.9)";
          ctx.shadowBlur = 6;
          ctx.fillText(label, px + 22, py + 4);
          ctx.shadowBlur = 0;
        }
      }
      for (const [i, a] of world.arrows.entries()) {
        if (!engine) break;
        void i;
        void a;
      }
      if (h) {
        const [px, py] = at(h.x, h.z);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-h.heading + Math.PI);
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(8, 9);
        ctx.lineTo(0, 4);
        ctx.lineTo(-8, 9);
        ctx.closePath();
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.restore();
      }
      const t = engine?.getTarget();
      if (t) {
        const [px, py] = at(t.x, t.z);
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
      }
      return { s, ox, oy };
    };
    let geom = draw();
    const onResize = () => (geom = draw());
    window.addEventListener("resize", onResize);
    const click = (ev: PointerEvent) => {
      const box = c.getBoundingClientRect();
      const mx = (ev.clientX - box.left - geom.ox) / geom.s;
      const my = (ev.clientY - box.top - geom.oy) / geom.s;
      const [x, z] = fromMap(mx, my);
      // Snap to a road, so the route has somewhere to go.
      const n = nearestNode(world.graph, x, z);
      engine?.setTarget({ x: world.graph.x[n], z: world.graph.z[n] });
      sfx.select();
      geom = draw();
    };
    c.addEventListener("pointerdown", click);
    return () => {
      window.removeEventListener("resize", onResize);
      c.removeEventListener("pointerdown", click);
    };
  }, [mapImg, world, cards, found, engine, focus]);

  return (
    <motion.div
      className="absolute inset-0 z-40 flex flex-col bg-[#081a26] lg:flex-row"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Map"
    >
      <div className="relative min-h-0 min-w-0 flex-1">
        <canvas ref={ref} className="absolute inset-0 h-full w-full cursor-crosshair" aria-label="The island. Click to set the GPS." />
      </div>
      <div className="max-h-[42vh] overflow-y-auto border-t border-white/10 bg-[#0d0e13]/95 p-5 lg:max-h-none lg:w-[22rem] lg:border-l lg:border-t-0">
        <p className="island-title text-[2.4rem]">Map</p>
        <p className="mb-4 text-xs text-white/60">Pick a place to set the GPS{pad ? "" : ", or click anywhere on the island"}.</p>
        <ul className="flex flex-col gap-1.5">
          {world.pois.map((p) => {
            const c = cards.find((x) => x.id === p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  data-nav
                  onFocus={() => setFocus(p.id)}
                  onMouseEnter={() => setFocus(p.id)}
                  onClick={() => onGps(p.id)}
                  className="island-list-btn"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[p.kind] }} />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[13px] font-semibold">{c?.title ?? p.place}</span>
                    <span className="block text-[11px] text-white/55">
                      {KIND_LABEL[p.kind]} · {p.place}
                    </span>
                  </span>
                  {found.includes(p.id) && <span className="text-[11px] text-[#8be36a]">Seen</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex gap-2">
          <MenuButton onClick={() => engine?.setTarget(null)}>Clear the GPS</MenuButton>
          <MenuButton onClick={onClose}>Close</MenuButton>
        </div>
      </div>
    </motion.div>
  );
}

/* ── The phone ─────────────────────────────────────────────────────────── */

const APPS: { id: string; label: string; color: string }[] = [
  { id: "map", label: "Map", color: "#3fb7a9" },
  { id: "work", label: "Work", color: "#ff5c9a" },
  { id: "garage", label: "Toolbox", color: "#4fd2ff" },
  { id: "messages", label: "Messages", color: "#5ad16b" },
  { id: "contact", label: "Contact", color: "#b98bff" },
  { id: "radio", label: "Radio", color: "#ffb547" },
  { id: "clock", label: "Clock", color: "#ffd84a" },
  { id: "stats", label: "Stats", color: "#f1a35a" },
  { id: "settings", label: "Settings", color: "#9aa3ad" },
];

function AppIcon({ id }: { id: string }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "map":
      return <path {...s} d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2zM9 4v14M15 6v14" />;
    case "work":
      return <path {...s} d="M4 7h16v12H4zM9 7V5h6v2" />;
    case "garage":
      return <path {...s} d="M14 6a4 4 0 0 0-5 5l-5 5 2 2 5-5a4 4 0 0 0 5-5l-2 2-2-2z" />;
    case "messages":
      return <path {...s} d="M4 5h16v11H9l-5 4z" />;
    case "contact":
      return <path {...s} d="M4 6h16v12H4zM4 6l8 7 8-7" />;
    case "radio":
      return <path {...s} d="M4 9h16v10H4zM7 9l9-5M15 14h2M8 14a1 1 0 1 0 0 .1" />;
    case "clock":
      return <path {...s} d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2" />;
    case "stats":
      return <path {...s} d="M5 19V11M10 19V6M15 19v-6M20 19V9" />;
    default:
      return <path {...s} d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />;
  }
}

function Phone(props: {
  app: string;
  setApp: (a: string) => void;
  onClose: () => void;
  cards: CardData[];
  found: string[];
  arrows: number[];
  arrowNames: string[];
  messages: { from: string; text: string }[];
  best: number | null;
  stats?: Hud;
  onMap: () => void;
  onOpen: (id: string) => void;
  onGps: (id: string) => void;
  mailto: string;
  email: string;
  linkedin: string;
  audio: { music: number; sfx: number; dj: boolean };
  setAudio: (p: { music: number; sfx: number; dj: boolean }) => void;
  quality: "high" | "low";
  setQuality: (q: "high" | "low") => void;
  hold: boolean;
  toggleHold: () => void;
  setHour: (h: number | null) => void;
  onStation: (i: number) => void;
  onReset: () => void;
  onHome: () => void;
  embedded: boolean;
}) {
  const { app, setApp } = props;
  const title = APPS.find((a) => a.id === app)?.label ?? "";
  const station = currentStation();
  return (
    <motion.div
      className="absolute inset-0 z-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.target === e.currentTarget && props.onClose()}
    >
      <motion.div
        className="island-phone absolute bottom-0 right-4 flex h-[min(40rem,86vh)] w-[min(21rem,calc(100vw-2rem))] flex-col overflow-hidden sm:bottom-6 sm:right-8"
        initial={{ y: "110%" }}
        animate={{ y: 0 }}
        exit={{ y: "110%" }}
        transition={{ type: "spring", damping: 26, stiffness: 260 }}
        role="dialog"
        aria-modal="true"
        aria-label="Phone"
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-4 font-mono text-[11px] text-white/70">
          <span>Golden Hour</span>
          <span>{props.stats ? fmtClock(props.stats.hour) : ""}</span>
        </div>
        {app !== "home" && (
          <div className="flex items-center gap-2 px-4 pb-2">
            <button type="button" data-nav className="rounded-full px-3 py-1 text-sm text-white/80 hover:bg-white/10 focus-visible:bg-white/15" onClick={() => setApp("home")}>
              ‹ Back
            </button>
            <p className="text-lg font-bold">{title}</p>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {app === "home" && (
            <div className="grid grid-cols-3 gap-x-2 gap-y-4 pt-4">
              {APPS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  data-nav
                  className="island-app"
                  onClick={() => (a.id === "map" ? props.onMap() : setApp(a.id))}
                >
                  <span className="island-app-icon" style={{ background: a.color }}>
                    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                      <AppIcon id={a.id} />
                    </svg>
                  </span>
                  <span className="text-[12px]">{a.label}</span>
                </button>
              ))}
            </div>
          )}
          {app === "work" && (
            <ul className="flex flex-col gap-2">
              {props.cards
                .filter((c) => c.kind === "project" || c.kind === "about")
                .map((c) => (
                  <li key={c.id} className="rounded-2xl bg-white/[0.06] p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                      {c.place} {props.found.includes(c.id) ? "· seen" : ""}
                    </p>
                    <p className="font-semibold">{c.title}</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" data-nav className="island-chip" onClick={() => props.onOpen(c.id)}>Read</button>
                      <button type="button" data-nav className="island-chip" onClick={() => props.onGps(c.id)}>Drive there</button>
                    </div>
                  </li>
                ))}
            </ul>
          )}
          {app === "garage" && (
            <div>
              {props.cards
                .filter((c) => c.kind === "garage")
                .map((c) => (
                  <div key={c.id}>
                    <p className="text-sm text-white/75">{c.body[0]}</p>
                    {c.groups?.map((g) => (
                      <div key={g.title} className="mt-3 rounded-2xl bg-white/[0.06] p-3">
                        <p className="text-sm font-bold text-[#4fd2ff]">{g.title}</p>
                        <p className="text-[12px] text-white/70">{g.items.map((i) => i.name).join(", ")}</p>
                      </div>
                    ))}
                    <button type="button" data-nav className="island-chip mt-3" onClick={() => props.onGps(c.id)}>Drive to the garage</button>
                  </div>
                ))}
            </div>
          )}
          {app === "messages" && (
            <div className="flex flex-col gap-2">
              {props.messages.length === 0 && <p className="text-sm text-white/60">No messages yet.</p>}
              {props.messages.map((m, i) => (
                <div key={i} className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white/[0.08] p-3 text-[13px]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4fd2ff]">{m.from}</p>
                  {m.text}
                </div>
              ))}
            </div>
          )}
          {app === "contact" && (
            <div className="flex flex-col gap-2">
              <a data-nav href={props.mailto} className="island-menu-btn island-menu-btn--accent">Email {props.email}</a>
              <a data-nav href={props.linkedin} target="_blank" rel="noreferrer" className="island-menu-btn">LinkedIn</a>
              <button type="button" data-nav className="island-menu-btn" onClick={() => props.onGps("contact")}>Drive to the contact marker</button>
            </div>
          )}
          {app === "radio" && (
            <ul className="flex flex-col gap-1.5">
              {STATIONS.map((s, i) => (
                <li key={s.id}>
                  <button type="button" data-nav className="island-list-btn" aria-pressed={station === i} onClick={() => props.onStation(i)}>
                    <span className="w-12 shrink-0 font-mono text-[12px]" style={{ color: s.color }}>{s.freq}</span>
                    <span className="flex-1 text-left">
                      <span className="block text-[14px] font-semibold">{s.name}</span>
                      <span className="block text-[11px] text-white/55">{s.tagline}</span>
                    </span>
                    {station === i && <span className="text-[11px] text-[#8be36a]">On</span>}
                  </button>
                </li>
              ))}
              <li>
                <button type="button" data-nav className="island-list-btn" aria-pressed={station < 0} onClick={() => props.onStation(-1)}>
                  <span className="flex-1 text-left text-[14px] font-semibold">Radio off</span>
                </button>
              </li>
            </ul>
          )}
          {app === "clock" && (
            <div className="flex flex-col gap-2">
              {([["Sunrise", 6.1], ["Midday", 12.5], ["Golden hour", 17.2], ["Sunset", 17.85], ["Night", 21]] as const).map(([l, h]) => (
                <button key={l} type="button" data-nav className="island-menu-btn" onClick={() => props.setHour(h)}>{l}</button>
              ))}
              <button type="button" data-nav className="island-menu-btn" aria-pressed={props.hold} onClick={props.toggleHold}>
                {props.hold ? "Let time run" : "Hold the time"}
              </button>
            </div>
          )}
          {app === "stats" && (
            <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-[14px]">
              <dt className="text-white/65">Places seen</dt>
              <dd>{props.found.length} of 9</dd>
              <dt className="text-white/65">Golden arrows</dt>
              <dd>{props.arrows.length} of 10</dd>
              <dt className="text-white/65">Best race</dt>
              <dd>{props.best !== null ? fmtTime(props.best) : "Not yet"}</dd>
              <dt className="text-white/65">Driven</dt>
              <dd>{props.stats ? `${(props.stats.driven / 1000).toFixed(1)} km` : ""}</dd>
              <dt className="text-white/65">Top speed</dt>
              <dd>{props.stats ? `${Math.round(props.stats.top * 3.6)} km/h` : ""}</dd>
              <dt className="col-span-2 mt-3 text-[11px] uppercase tracking-[0.14em] text-white/55">Arrows found</dt>
              <dd className="col-span-2 text-[13px] text-white/80">
                {props.arrows.length ? props.arrows.map((i) => props.arrowNames[i]).join(", ") : "None yet. They glow gold."}
              </dd>
            </dl>
          )}
          {app === "settings" && (
            <div className="flex flex-col gap-4 text-[14px]">
              <label className="flex flex-col gap-1">
                Radio volume
                <input data-nav type="range" min={0} max={1} step={0.05} value={props.audio.music} onChange={(e) => props.setAudio({ ...props.audio, music: +e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                Car and effects
                <input data-nav type="range" min={0} max={1} step={0.05} value={props.audio.sfx} onChange={(e) => props.setAudio({ ...props.audio, sfx: +e.target.value })} />
              </label>
              <button type="button" data-nav className="island-menu-btn" aria-pressed={props.audio.dj} onClick={() => props.setAudio({ ...props.audio, dj: !props.audio.dj })}>
                Radio presenters: {props.audio.dj ? "on" : "off"}
              </button>
              <button type="button" data-nav className="island-menu-btn" onClick={() => props.setQuality(props.quality === "high" ? "low" : "high")}>
                Graphics: {props.quality === "high" ? "high" : "light"}
              </button>
              <button type="button" data-nav className="island-menu-btn" onClick={props.onReset}>Start the island over</button>
              <button type="button" data-nav className="island-menu-btn" onClick={props.onHome}>
                {props.embedded ? "Back to the home screen" : "Back to the console"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Touch ─────────────────────────────────────────────────────────────── */

function TouchControls({
  engine,
  onMap,
  onPhone,
  onPause,
  onRadio,
}: {
  engine: React.MutableRefObject<IslandEngine | null>;
  onMap: () => void;
  onPhone: () => void;
  onPause: () => void;
  onRadio: () => void;
}) {
  const knob = useRef<HTMLSpanElement>(null);
  const base = useRef<{ x: number; id: number } | null>(null);
  const set = (patch: Partial<IslandEngine["virtual"]>) => {
    const e = engine.current;
    if (e) e.virtual = { ...e.virtual, ...patch };
  };
  return (
    <div className="absolute inset-0 z-20 touch-none">
      <div
        className="absolute bottom-0 left-0 h-[45%] w-1/2"
        onPointerDown={(ev) => {
          base.current = { x: ev.clientX, id: ev.pointerId };
          (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
        }}
        onPointerMove={(ev) => {
          if (!base.current || base.current.id !== ev.pointerId) return;
          const dx = Math.max(-1, Math.min(1, (ev.clientX - base.current.x) / 70));
          set({ steer: dx });
          if (knob.current) knob.current.style.transform = `translateX(${dx * 40}px)`;
        }}
        onPointerUp={() => {
          base.current = null;
          set({ steer: 0 });
          if (knob.current) knob.current.style.transform = "";
        }}
        onPointerCancel={() => {
          base.current = null;
          set({ steer: 0 });
        }}
      >
        <div className="absolute bottom-8 left-5 flex h-14 w-36 items-center justify-center rounded-full border border-white/25 bg-black/30 backdrop-blur">
          <span ref={knob} className="block h-10 w-10 rounded-full bg-white/80" />
        </div>
      </div>
      <div className="absolute bottom-6 right-4 flex items-end gap-3">
        <div className="flex flex-col items-center gap-3">
          <TouchPedal label="Drift" onDown={() => set({ handbrake: true })} onUp={() => set({ handbrake: false })} small />
          <TouchPedal label="Brake" onDown={() => set({ brake: 1 })} onUp={() => set({ brake: 0 })} />
        </div>
        <TouchPedal label="Go" onDown={() => set({ throttle: 1 })} onUp={() => set({ throttle: 0 })} accent />
      </div>
      <div className="absolute right-4 top-[4.6rem] flex gap-1.5">
        {[
          ["Map", onMap],
          ["Phone", onPhone],
          ["Radio", onRadio],
          ["Pause", onPause],
        ].map(([l, fn]) => (
          <button key={l as string} type="button" className="rounded-full bg-black/45 px-2.5 py-1.5 text-[11px] font-semibold backdrop-blur" onClick={fn as () => void}>
            {l as string}
          </button>
        ))}
      </div>
    </div>
  );
}

function TouchPedal({ label, onDown, onUp, accent, small }: { label: string; onDown: () => void; onUp: () => void; accent?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      className={`flex select-none items-center justify-center rounded-2xl text-sm font-bold uppercase tracking-wider ${small ? "h-16 w-16" : "h-24 w-20"} ${accent ? "bg-[#f1a35a] text-black" : "bg-white/20 text-white backdrop-blur"}`}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        onDown();
      }}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}
