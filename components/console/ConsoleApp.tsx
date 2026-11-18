"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  GearSix,
  Medal,
  MusicNotes,
  Plus,
  ShareNetwork,
  Vibrate,
  Shuffle,
  SpeakerHigh,
  SpeakerSlash,
  Trash,
  UsersThree,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { useSiteContent } from "@/context/SiteContext";
import { useReduceMotion } from "@/lib/useReduceMotion";
import Logo from "@/components/layout/Logo";
import ToolIcon, { ALL_TOOLS } from "@/components/ui/ToolIcon";
import { EASE } from "@/components/ui/Reveal";
import { Clock } from "@/components/quiet/chrome";
import { MailForm } from "@/components/quiet/rest";
import Ambient from "./Ambient";
import Boot from "./Boot";
import Game from "./Game";
import { MILESTONES, useMilestones, type MilestoneId } from "./milestones";
import {
  ACCENTS,
  AVATAR_ICONS,
  Avatar,
  GUEST,
  MAX_ACCOUNTS,
  OWNER,
  SPOTTER,
  accentStyle,
  randomName,
  readBest,
  saveBest,
  useAccounts,
  type AccentKey,
  type AvatarIcon,
  type Player,
} from "./players";
import { audioState, duckMusic, loadPrefs, releaseMusic, setMood, setMusic, setSfx, setVolume, sfx, unlockSound } from "./sound";
import { CardDetail, CardFace, cardWidth, useTiles, type Card, type Tile } from "./tiles";
import { haptic, loadRumblePref, markPadInUse, needsDirectRumble, rumble, setRumble, testRumble, useGamepad, type PadAction } from "./useGamepad";
import { dualSenseLight, dualSenseRumble, requestDualSense, restoreDualSense } from "./dualsense";
import PadKeyboard, { type PadKeyboardApi } from "./PadKeyboard";
import { tune as tuneIsland, unlockAudio as unlockIslandAudio } from "@/components/island/audio";

// The island game is a large download (a 3D engine); it loads only when launched.
const IslandApp = dynamic(() => import("@/components/island/IslandApp"), { ssr: false });

/**
 * Launching a game from its tile: the key art fills the screen and holds for
 * a moment, then the game takes over (its own loading screen and title).
 */
function IslandLaunch({ onExit, reduce }: { onExit: () => void; reduce: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), reduce ? 0 : 1300);
    return () => clearTimeout(t);
  }, [reduce]);
  return (
    <motion.div
      className="fixed inset-0 z-[58] bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.35 }}
    >
      <motion.div
        className="absolute inset-0"
        initial={reduce ? false : { scale: 1.12, opacity: 0.4 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      >
        <Image src="/images/play/golden-hour.webp" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30" />
      </motion.div>
      <div className="absolute bottom-[9vh] left-[6vw]">
        <p className="island-title text-[clamp(3.4rem,9vw,8rem)]">Golden Hour</p>
        <p className="mt-3 flex items-center gap-3 text-sm text-white/80">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
          Starting the game
        </p>
      </div>
      {ready && <IslandApp onExit={onExit} />}
    </motion.div>
  );
}

/** What a PS5 controller needs before it can buzz: said on connect, and by the test. */
const DUALSENSE_NOTE =
  "Chrome cannot vibrate a PS5 controller by itself. Plug it in with a USB cable, then choose Turn on vibration in the quick menu (one click, remembered).";

/** A field the on-screen keyboard can type into. */
function isTextField(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (!(el instanceof HTMLInputElement) || el.readOnly || el.disabled) return false;
  return ["text", "email", "search", "tel", "url", ""].includes(el.type);
}

/** Set a field's value the way typing does, so React's onChange sees it. */
function writeField(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** What a field is called: its label, else its placeholder or name. */
function fieldLabel(el: HTMLInputElement | HTMLTextAreaElement) {
  const byFor = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
  const text = (byFor ?? el.closest("label"))?.textContent?.trim();
  return text || el.getAttribute("aria-label") || el.placeholder || el.name || "Text";
}

type Screen = "boot" | "profiles" | "home";
type Row = "tiles" | "cards";
type Overlay =
  | { kind: "card"; card: Card }
  | { kind: "mail" }
  | { kind: "game" }
  | { kind: "island" }
  | { kind: "milestones" }
  | { kind: "menu" }
  | { kind: "add" }
  | { kind: "remove"; player: Player }
  | null;
type Toast = { key: number; title: string; sub: string; medal: boolean };

const TABS = ["Work", "Play"] as const;
const ADD = { id: "add", kind: "guest", name: "Add user", accent: "teal" } as const;

/**
 * Each interface sound, with its matching buzz on the controller (only while
 * the controller is the thing being used, and only if vibration is on).
 */
const fx = {
  move: () => (sfx.move(), haptic("move")),
  select: () => (sfx.select(), haptic("select")),
  back: () => (sfx.back(), haptic("back")),
  edge: () => (sfx.edge(), haptic("edge")),
  tab: () => (sfx.tab(), haptic("tab")),
  open: () => (sfx.open(), haptic("open")),
  milestone: () => (sfx.milestone(), haptic("milestone")),
  boot: () => (sfx.boot(), haptic("boot")),
};

/**
 * Move focus inside a dialog the way a console does: to the nearest control
 * in the direction pressed, not the next one in the page's order. Returns
 * false when there is nothing that way.
 */
function spatial(root: HTMLElement, dir: "left" | "right" | "up" | "down"): boolean {
  const list = focusables(root);
  const cur = document.activeElement as HTMLElement | null;
  if (!cur || !list.includes(cur)) {
    list[0]?.focus();
    return !!list[0];
  }
  const r = cur.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const b = el.getBoundingClientRect();
    const dx = b.left + b.width / 2 - cx;
    const dy = b.top + b.height / 2 - cy;
    const ahead = dir === "left" ? -dx : dir === "right" ? dx : dir === "up" ? -dy : dy;
    if (ahead <= 4) continue;
    // Anything that overlaps the current control across the direction of
    // travel counts as straight ahead, so the nearest row (or column) wins.
    const sideways = dir === "left" || dir === "right";
    const overlap = sideways
      ? Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top)
      : Math.min(r.right, b.right) - Math.max(r.left, b.left);
    const across = overlap > 0 ? 0 : sideways ? Math.abs(dy) : Math.abs(dx);
    const score = ahead + across * 2.2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (!best) return false;
  best.focus();
  best.scrollIntoView({ block: "nearest", inline: "nearest" });
  return true;
}

/* ── Small pieces ──────────────────────────────────────────────────────── */

/** A key cap, for the button guide. */
function Key({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-white/25 px-1.5 py-0.5 font-mono text-[0.7rem] text-content">{children}</kbd>;
}

/**
 * A gamepad's four face buttons as a diamond of dots, with one lit. Every
 * maker letters and marks these differently, so the guide shows position.
 */
function FaceButton({ lit }: { lit: "south" | "east" | "west" | "north" }) {
  const dot = (on: boolean) => `absolute h-1.5 w-1.5 rounded-full ${on ? "bg-accent" : "bg-white/30"}`;
  return (
    <span aria-hidden className="relative inline-block h-5 w-5 align-middle">
      <span className={`${dot(lit === "north")} left-1/2 top-0 -translate-x-1/2`} />
      <span className={`${dot(lit === "west")} left-0 top-1/2 -translate-y-1/2`} />
      <span className={`${dot(lit === "east")} right-0 top-1/2 -translate-y-1/2`} />
      <span className={`${dot(lit === "south")} bottom-0 left-1/2 -translate-x-1/2`} />
    </span>
  );
}

/** A shoulder button or trigger, by its usual label. */
function Shoulder({ children }: { children: ReactNode }) {
  return <span className="rounded-[0.35rem] border border-white/25 px-1 font-mono text-[0.65rem] leading-[1.15rem]">{children}</span>;
}

/** The square on the home row. */
function Thumb({ tile }: { tile: Tile }) {
  if ("icon" in tile.thumb) {
    const Icon = tile.thumb.icon;
    return (
      <span className="grid h-full w-full place-items-center bg-gradient-to-br from-white/20 to-white/5">
        <Icon size={30} weight="fill" />
      </span>
    );
  }
  return <Image src={tile.thumb.src} alt="" fill sizes="112px" className="object-cover" style={{ objectPosition: tile.thumb.pos ?? "50% 50%" }} />;
}

/**
 * The full-screen art behind the home screen: one layer per tile, all
 * loaded, only the focused one visible, so moving along the row crossfades
 * without waiting for an image. The visible one drifts slowly (Ken Burns).
 */
function Art({ tiles, active }: { tiles: Tile[]; active: string }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {tiles.map((tile, i) => {
        const on = tile.id === active;
        const { mode, src, pos } = tile.art;
        return (
          <div
            key={tile.id}
            className={`absolute inset-0 transition-[opacity,transform] duration-[900ms] ease-out motion-reduce:transition-none ${
              on ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"
            }`}
          >
            <div className={`absolute inset-0 ${on ? "c-kb" : ""}`}>
              {mode === "cover" && src && (
                <Image src={src} alt="" fill sizes="100vw" priority={i === 0} className="object-cover" style={{ objectPosition: pos }} />
              )}
              {(mode === "side" || mode === "figure") && src && (
                <div className="c-side absolute inset-0 lg:left-auto lg:w-[56%]">
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 56vw"
                    priority={i === 0}
                    className={mode === "figure" ? "object-contain object-bottom pt-16" : "object-cover"}
                    style={mode === "figure" ? undefined : { objectPosition: pos }}
                  />
                </div>
              )}
              {mode === "scope" && src && (
                <div className="absolute right-[-30%] top-[22%] aspect-square h-[56%] overflow-hidden rounded-full border border-white/25 shadow-[0_0_120px_rgb(0_0_0/0.9)] lg:right-[7%] lg:top-1/2 lg:h-[74%] lg:-translate-y-1/2">
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="60vw"
                    className="object-cover"
                    style={{ transform: "scale(2.6)", transformOrigin: pos }}
                  />
                  {/* the scope's reticle and its dark rim */}
                  <span className="absolute inset-x-0 top-1/2 h-px bg-white/45" />
                  <span className="absolute inset-y-0 left-1/2 w-px bg-white/45" />
                  <span className="absolute inset-0 rounded-full shadow-[inset_0_0_80px_30px_rgb(0_0_0/0.85)]" />
                </div>
              )}
              {mode === "tools" && (
                <div className="absolute inset-y-0 right-0 flex w-full flex-wrap content-center justify-end gap-x-10 gap-y-9 px-8 opacity-40 lg:w-[52%] lg:px-16">
                  {ALL_TOOLS.map((name) => (
                    <ToolIcon key={name} name={name} size={64} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {/* scrims: dark on the left for the copy, dark at the bottom for the cards */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/55 to-transparent max-lg:via-ink/80 max-lg:to-ink/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/30" />
    </div>
  );
}

/** Everything focusable inside a dialog, in order, for stepping with a pad. */
function focusables(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input, select, textarea")].filter(
    (el) => el.offsetParent !== null
  );
}

/* ── The console ───────────────────────────────────────────────────────── */

/**
 * The portfolio as a game console's home screen.
 *
 *   boot       the mark, a burst of light, and "press any button" (which also
 *              lets the browser play sound); shown on every load
 *   profiles   who is playing: Abdullah, the Spotter (an anonymous friend who
 *              tells it their way), visitors' own profiles, or a guest; also
 *              on every load
 *   home       two tabs of tiles; the focused one fills the screen with its
 *              art, title and pitch, and its cards run along the bottom
 *
 * Background music and animated light run behind it. It is driven by a
 * keyboard, a mouse or touch, or a real gamepad, which gets nearly every
 * button (see `act`). Exploring earns milestones, per player.
 *
 * The idea of a console home screen is borrowed; the look, the marks, the
 * music and the sounds are this site's own.
 */
export default function ConsoleApp() {
  const { content } = useSiteContent();
  const reduce = useReduceMotion();
  const { accounts, add, remove } = useAccounts();

  const [screen, setScreen] = useState<Screen>("boot");
  const [player, setPlayer] = useState<Player | null>(null);
  const [profile, setProfile] = useState(0);
  const [tab, setTab] = useState(0);
  const [sel, setSel] = useState<[number, number]>([0, 0]);
  const [row, setRow] = useState<Row>("tiles");
  const [card, setCard] = useState(0);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [music, setMusicOn] = useState(true);
  const [sounds, setSoundsOn] = useState(true);
  const [volume, setVol] = useState(0.6);
  const [pad, setPad] = useState(false);
  const [guide, setGuide] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [best, setBest] = useState(0);
  const [bests, setBests] = useState<Record<number, number>>({});
  const [vibrate, setVibrate] = useState(true);
  // What is being used right now: the pad gets visible focus rings and buzzes.
  const [inputMode, setInputMode] = useState<"pad" | "keys" | "pointer">("pointer");
  const inputRef = useRef(inputMode);
  const noteInput = useCallback((m: "pad" | "keys" | "pointer") => {
    if (inputRef.current === m) return;
    inputRef.current = m;
    markPadInUse(m === "pad");
    setInputMode(m);
  }, []);
  // Browsers keep sound locked until a key, click or tap; a pad press does not count.
  const [soundLocked, setSoundLocked] = useState(false);
  const checkSound = useCallback(() => {
    setTimeout(() => setSoundLocked(audioState() === "locked"), 350);
  }, []);
  // the add-user form
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<AvatarIcon>("target");
  const [newAccent, setNewAccent] = useState<AccentKey>("sky");

  const { earned, award } = useMilestones(player?.id ?? null);
  const tiles = useTiles(player?.kind === "spotter" ? "spotter" : "abdullah", best);
  const lists = [tiles.work, tiles.play];
  const all = useMemo(() => [...tiles.work, ...tiles.play], [tiles.work, tiles.play]);
  const tileIndex = sel[tab];
  const current = lists[tab][tileIndex] ?? lists[tab][0];
  const cards = current.cards;
  const profiles: (Player | typeof ADD)[] = [OWNER, SPOTTER, ...accounts, GUEST, ...(accounts.length < MAX_ACCOUNTS ? [ADD] : [])];

  const seen = useRef(new Set<string>());
  const opened = useRef(new Set<string>());
  const toastKey = useRef(0);
  const pendingAward = useRef<MilestoneId | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  // The on-screen keyboard, for typing into a dialog's text fields with a pad.
  const [kb, setKb] = useState<{ label: string; max: number } | null>(null);
  const [kbValue, setKbValue] = useState("");
  const kbTarget = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const kbApi = useRef<PadKeyboardApi | null>(null);
  const kbOpen = useRef(false);
  kbOpen.current = !!kb;
  // Set when the keyboard or a pad moved the focus, so DOM focus follows it
  // (pointing with a mouse should not yank focus or scroll the rows).
  const steer = useRef(false);

  // The latest state for the input handlers, which are bound once. The
  // setters below also write it straight away, so two quick presses in a row
  // (before React has re-rendered) still see the first one's result.
  const state = useRef({
    screen,
    profile,
    row,
    card,
    overlay,
    cards,
    tab,
    sel,
    lists,
    profiles,
    current,
    primary: undefined as Extract<Card, { kind: "action" }> | undefined,
  });
  const go = useMemo(
    () => ({
      screen: (v: Screen) => {
        state.current.screen = v;
        setScreen(v);
      },
      profile: (v: number) => {
        state.current.profile = v;
        setProfile(v);
      },
      row: (v: Row) => {
        state.current.row = v;
        setRow(v);
      },
      card: (v: number) => {
        state.current.card = v;
        setCard(v);
      },
      overlay: (v: Overlay) => {
        state.current.overlay = v;
        setOverlay(v);
      },
    }),
    []
  );

  /* toasts and milestones */
  const toast = useCallback((title: string, sub: string, medal = false) => {
    const key = toastKey.current++;
    setToasts((list) => [...list.slice(-2), { key, title, sub, medal }]);
    setTimeout(() => setToasts((list) => list.filter((x) => x.key !== key)), medal ? 4600 : 2600);
  }, []);

  const grant = useCallback(
    (id: MilestoneId) => {
      if (!award(id)) return;
      fx.milestone();
      toast(MILESTONES.find((m) => m.id === id)?.title ?? "", "Milestone earned", true);
    },
    [award, toast]
  );

  /* arriving: prefs, then always the boot screen */
  useEffect(() => {
    const p = loadPrefs();
    setMusicOn(p.music);
    setSoundsOn(p.sfx);
    setVol(p.volume);
    setVibrate(loadRumblePref());
  }, []);

  // A new player: their best, their welcome, and any milestone owed.
  useEffect(() => {
    if (!player) return;
    setBest(readBest(player.id));
    setBests({ 18: readBest(player.id, 18), 50: readBest(player.id, 50), 70: readBest(player.id, 70) });
    seen.current = new Set([`${tab}:${sel[tab]}`]);
    opened.current = new Set();
    grant("power");
    if (player.kind === "spotter") grant("spotter");
    if (pad) grant("pad");
    if (pendingAward.current) {
      grant(pendingAward.current);
      pendingAward.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id]);

  // The music follows the focused tile, and steps back during the game.
  useEffect(() => {
    setMood(all.findIndex((t) => t.id === current.id));
  }, [all, current.id]);
  useEffect(() => {
    duckMusic(overlay?.kind === "game" || overlay?.kind === "island");
  }, [overlay]);

  // A game's tile plays the game's own theme while it is focused, as a console
  // does: here, the island's car radio, quietly, in place of the home music.
  useEffect(() => {
    if (screen !== "home" || overlay || current.id !== "golden-hour" || !music || soundLocked) return;
    let started = false;
    const t = setTimeout(() => {
      started = true;
      unlockIslandAudio();
      duckMusic(true);
      tuneIsland(0, { preview: true });
    }, 650);
    return () => {
      clearTimeout(t);
      if (!started) return;
      tuneIsland(-1, { preview: true });
      duckMusic(false);
    };
  }, [screen, overlay, current.id, music, soundLocked]);

  // The console is off until the first press; then it powers on (Boot.tsx)
  // and hands over to "Who is playing?". A second press skips the start-up.
  const [powering, setPowering] = useState(false);
  const poweringRef = useRef(false);
  const finishBoot = useCallback(() => {
    if (state.current.screen !== "boot") return;
    poweringRef.current = false;
    setPowering(false);
    releaseMusic();
    go.screen("profiles");
    go.profile(0);
  }, [go]);
  const start = useCallback(() => {
    if (poweringRef.current) return finishBoot();
    poweringRef.current = true;
    unlockSound({ holdMusic: true });
    sfx.power();
    haptic("boot");
    checkSound();
    if (reduce) finishBoot();
    else setPowering(true);
  }, [checkSound, finishBoot, reduce]);

  const toProfiles = useCallback(() => {
    fx.back();
    go.overlay(null);
    go.profile(Math.max(0, profiles.findIndex((p) => p.id === player?.id)));
    go.screen("profiles");
  }, [player?.id, profiles]);

  const pick = useCallback(
    (index: number) => {
      unlockSound();
      const p = profiles[index];
      if (!p) return;
      if (p.id === "add") {
        fx.open();
        setNewName(randomName());
        setNewIcon("target");
        setNewAccent("sky");
        go.overlay({ kind: "add" });
        return;
      }
      fx.select();
      setPlayer(p as Player);
      go.screen("home");
      go.row("tiles");
      go.overlay(null);
      toast(`Welcome, ${p.name}`, p.kind === "spotter" ? "Telling it my way." : p.kind === "visitor" ? "Your profile, on this device." : "Enjoy the tour.");
    },
    [profiles, toast]
  );

  const focusTile = useCallback(
    (t: number, i: number) => {
      const prev = state.current.sel;
      const next: [number, number] = t === 0 ? [i, prev[1]] : [prev[0], i];
      state.current.tab = t;
      state.current.sel = next;
      setTab(t);
      setSel(next);
      go.card(0);
      seen.current.add(`${t}:${i}`);
      if (seen.current.size >= all.length) grant("tour");
    },
    [all.length, grant]
  );

  /* opening a card */
  const activate = useCallback(
    (c: Card) => {
      unlockSound();
      opened.current.add(`${current.id}:${c.id}`);
      if (opened.current.size >= 5) grant("reader");
      if (c.kind === "link") {
        fx.select();
        if (c.external) window.open(c.href, "_blank", "noopener,noreferrer");
        else window.location.href = c.href;
        return;
      }
      if (c.kind === "action") {
        fx.select();
        go.overlay(c.modal === "game" ? { kind: "game" } : c.modal === "island" ? { kind: "island" } : { kind: "mail" });
        return;
      }
      fx.open();
      go.overlay({ kind: "card", card: c });
    },
    [current.id, grant]
  );

  const primary = cards.find((c): c is Extract<Card, { kind: "action" }> => c.kind === "action");

  /* settings */
  const toggleMusic = useCallback(() => {
    unlockSound();
    setMusicOn((on) => {
      setMusic(!on);
      toast(on ? "Music off" : "Music on", on ? "West button or M to bring it back." : "Each tile has its own key.");
      checkSound();
      return !on;
    });
  }, [checkSound, toast]);

  const toggleSounds = useCallback(() => {
    setSoundsOn((on) => {
      setSfx(!on);
      if (!on) fx.select();
      return !on;
    });
  }, []);

  const nudgeVolume = useCallback(
    (d: number) => {
      unlockSound();
      setVol((v) => {
        const next = setVolume(v + d);
        toast(`Volume ${Math.round(next * 100)}%`, "Triggers, or - and = on a keyboard.");
        return next;
      });
    },
    [toast]
  );

  const toggleVibrate = useCallback(() => {
    setVibrate((on) => {
      setRumble(!on);
      if (!on) rumble(0.4, 0.6, 120, true);
      return !on;
    });
  }, []);

  // A PS5 controller: ask Chrome for it once (a click or key, never a pad button).
  const [directReady, setDirectReady] = useState(false);
  useEffect(() => {
    void restoreDualSense().then(setDirectReady);
  }, []);
  const turnOnVibration = useCallback(async () => {
    const result = await requestDualSense();
    if (result === "ok") {
      setDirectReady(true);
      dualSenseRumble(0.8, 0.9, 450);
      toast("Vibration on", "Your controller will buzz from now on, on this browser.");
    } else if (result === "bluetooth") toast("Plug in the cable", "It only works over USB: over Bluetooth Chrome cannot send the controller anything.");
    else if (result === "unsupported") toast("Not in this browser", "Use Chrome or Edge on a computer.");
    else if (result === "failed") toast("Use the mouse or Enter", "Chrome only opens this with a click or a key, not a controller button.");
  }, [toast]);

  const testVibrate = useCallback(() => {
    const check = testRumble();
    if (!check.pads.length) {
      toast("No controller found", "Connect one and press any button on it, then try again.");
      return;
    }
    if (!check.pads.some((p) => p.canBuzz)) {
      // A PS5 controller the browser cannot vibrate: the direct route needs turning on.
      if (check.pads.some((p) => /054c/i.test(p.id))) toast("Turn on vibration first", DUALSENSE_NOTE);
      else toast("This browser cannot vibrate", "Chrome or Edge can. Firefox cannot vibrate a controller at all.");
      return;
    }
    // What the browser answered: "complete" means the buzz was sent to the pad.
    check.results.then((answers) => {
      const ok = answers.some((a) => a === "complete" || a === "preempted");
      if (ok) toast("Vibration sent", "Felt nothing? Close Steam or any controller app: they can take over the pad.");
      else toast("The browser refused", answers.join(", "));
    });
  }, [toast]);

  const share = useCallback(async () => {
    const url = window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
      fx.select();
      toast("Link copied", url.replace(/^https?:\/\//, ""));
    } catch {
      toast("Could not copy the link", url.replace(/^https?:\/\//, ""));
    }
  }, [toast]);

  const createAccount = useCallback(() => {
    const p = add(newName, newIcon, newAccent);
    if (!p) return;
    pendingAward.current = "account";
    fx.select();
    go.overlay(null);
    setPlayer(p);
    go.screen("home");
    go.row("tiles");
    toast(`Welcome, ${p.name}`, "Your profile, on this device.");
  }, [add, newAccent, newIcon, newName, toast]);

  /* one handler for every way of steering */
  state.current = { screen, profile, row, card, overlay, cards, tab, sel, lists, profiles, current, primary };

  const act = useCallback(
    (action: PadAction) => {
      const s = state.current;
      steer.current = true;
      // the focused tile and its cards, from the live state (not the last render)
      const tileNow = s.lists[s.tab][s.sel[s.tab]] ?? s.lists[s.tab][0];
      const cardsNow = tileNow.cards;
      const primaryNow = cardsNow.find((c): c is Extract<Card, { kind: "action" }> => c.kind === "action");

      if (s.screen === "boot") return start();

      // dialogs: step through what is in them, select, go back
      if (s.overlay && s.overlay.kind !== "game" && s.overlay.kind !== "island") {
        const root = panel.current;
        // The on-screen keyboard has the pad while it is open.
        if (kbOpen.current) {
          kbApi.current?.handle(action);
          return;
        }
        if (action === "back") {
          fx.back();
          go.overlay(null);
          return;
        }
        if (!root) return;
        if (action === "west" && s.overlay.kind === "add") return setNewName(randomName());
        if (action === "left" || action === "up" || action === "right" || action === "down") {
          if (spatial(root, action)) fx.move();
          else fx.edge();
        } else if (action === "select") {
          const el = document.activeElement;
          if (isTextField(el) && root.contains(el)) {
            // Selecting a text field with the pad opens the keyboard on it.
            kbTarget.current = el;
            setKbValue(el.value);
            setKb({ label: fieldLabel(el), max: el.maxLength > 0 ? el.maxLength : 600 });
            fx.open();
            return;
          }
          if (el instanceof HTMLSelectElement) {
            el.selectedIndex = (el.selectedIndex + 1) % el.options.length;
            el.dispatchEvent(new Event("change", { bubbles: true }));
          } else if (el instanceof HTMLElement && root.contains(el) && !(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) el.click();
        }
        return;
      }

      if (s.screen === "profiles") {
        const n = s.profiles.length;
        if (action === "left" || action === "right") {
          fx.move();
          go.profile((s.profile + (action === "left" ? -1 : 1) + n) % n);
        } else if (action === "select") pick(s.profile);
        else if (action === "north") {
          const p = s.profiles[s.profile];
          if (p && p.kind === "visitor") {
            fx.open();
            go.overlay({ kind: "remove", player: p as Player });
          }
        }
        return;
      }

      // home: the whole pad
      switch (action) {
        case "west":
          return toggleMusic();
        case "north":
          fx.open();
          return go.overlay({ kind: "milestones" });
        case "menu":
        case "home":
          fx.open();
          return go.overlay({ kind: "menu" });
        case "create":
          return void share();
        case "l2":
          return nudgeVolume(-0.1);
        case "r2":
          return nudgeVolume(0.1);
        case "r3":
          setGuide((g) => !g);
          return fx.move();
        case "pad":
          return toProfiles();
        case "l1":
        case "r1": {
          const t = action === "l1" ? 0 : 1;
          if (t === s.tab) return fx.edge();
          fx.tab();
          go.row("tiles");
          return focusTile(t, s.sel[t]);
        }
        case "l3":
          fx.move();
          go.row("tiles");
          return focusTile(s.tab, 0);
        case "prevCard":
        case "nextCard": {
          const next = (s.row === "cards" ? s.card : -1) + (action === "prevCard" ? -1 : 1);
          if (next < 0 || next >= cardsNow.length) return fx.edge();
          fx.move();
          go.row("cards");
          return go.card(next);
        }
      }

      if (s.row === "tiles") {
        const list = s.lists[s.tab];
        if (action === "left" || action === "right") {
          const next = s.sel[s.tab] + (action === "left" ? -1 : 1);
          if (next < 0) {
            // off the left of Play: back to the end of Work
            if (s.tab === 1) {
              fx.tab();
              return focusTile(0, s.lists[0].length - 1);
            }
            return fx.edge();
          }
          if (next >= list.length) {
            if (s.tab === 0) {
              fx.tab();
              return focusTile(1, 0);
            }
            return fx.edge();
          }
          fx.move();
          focusTile(s.tab, next);
        } else if (action === "select") {
          // a tile with something to do (play, write) does it straight away
          if (primaryNow) activate(primaryNow);
          else {
            fx.select();
            go.row("cards");
          }
        } else if (action === "down") {
          fx.select();
          go.row("cards");
        } else if (action === "back") toProfiles();
        return;
      }

      // the cards row
      if (action === "left" || action === "right") {
        const next = s.card + (action === "left" ? -1 : 1);
        if (next < 0 || next >= cardsNow.length) return fx.edge();
        fx.move();
        go.card(next);
      } else if (action === "up" || action === "back") {
        fx.back();
        go.row("tiles");
      } else if (action === "select") activate(cardsNow[s.card]);
    },
    [activate, focusTile, nudgeVolume, pick, share, start, toProfiles, toggleMusic]
  );

  /* keep an eye on whether the browser is holding sound back */
  useEffect(() => {
    if (screen === "boot") return;
    const id = setInterval(() => setSoundLocked(audioState() === "locked"), 1000);
    return () => clearInterval(id);
  }, [screen]);

  /* the first key or click after a pad-only start finally lets sound play */
  useEffect(() => {
    const wake = () => {
      if (audioState() !== "locked") return;
      unlockSound();
      checkSound();
    };
    window.addEventListener("keydown", wake, true);
    window.addEventListener("pointerdown", wake, true);
    return () => {
      window.removeEventListener("keydown", wake, true);
      window.removeEventListener("pointerdown", wake, true);
    };
  }, [checkSound]);

  /* keyboard */
  useEffect(() => {
    const KEYS: Record<string, PadAction> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
      Enter: "select",
      " ": "select",
      Escape: "back",
      Backspace: "back",
      q: "l1",
      e: "r1",
      m: "west",
      t: "north",
      o: "menu",
      c: "create",
      h: "r3",
      p: "pad",
      "-": "l2",
      "=": "r2",
      "+": "r2",
      Home: "l3",
      Delete: "north",
      x: "north",
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      noteInput("keys");
      const s = state.current;
      if (s.overlay?.kind === "game" || s.overlay?.kind === "island") return; // the game has the keyboard
      if (s.screen === "boot") {
        if (e.key === "Tab") return;
        e.preventDefault();
        if (e.repeat) return; // a held key powers on; it does not also skip
        return act("select");
      }
      // Inside a dialog, only Escape is ours: Tab, Enter, the arrows and typing
      // belong to its contents (the form fields and buttons). Text fields only
      // exist inside dialogs, so outside one every key is a console key, even
      // in the instant after a dialog closes while focus is still leaving its
      // field.
      if (s.overlay) {
        if (e.key === "Escape") {
          e.preventDefault();
          act("back");
        }
        return;
      }
      const action = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (!action) return;
      e.preventDefault();
      act(action);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, noteInput]);

  /* gamepad */
  useGamepad(
    (a) => {
      noteInput("pad");
      act(a);
    },
    {
    paused: overlay?.kind === "game" || overlay?.kind === "island",
    onConnect: () => {
      setPad(true);
      grant("pad");
      toast("Controller connected", "Nearly every button does something. Press R3 for the guide.");
      // A PS5 controller the browser cannot vibrate: reopen it if allowed before,
      // otherwise say how to turn vibration on, once, rather than after a silent test.
      void restoreDualSense().then((ready) => {
        setDirectReady(ready);
        if (!ready && needsDirectRumble()) setTimeout(() => toast("Vibration needs one click", DUALSENSE_NOTE), 2600);
      });
    },
  }
  );

  /* DOM focus and scroll follow the steering */
  // a layout effect: focus leaves a closing dialog in the same frame, not a frame later
  useLayoutEffect(() => {
    if (screen !== "home" || overlay) return;
    const el = row === "tiles" ? tileRefs.current[tileIndex] : cardRefs.current[card];
    if (!el) return;
    if (steer.current) el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest", inline: "nearest" });
  }, [screen, overlay, row, tab, tileIndex, card, reduce]);

  useEffect(() => {
    if (!overlay || overlay.kind === "game" || overlay.kind === "island") return;
    const t = setTimeout(() => {
      const root = panel.current;
      if (!root) return;
      const first = overlay.kind === "add" ? root.querySelector<HTMLElement>("input") : focusables(root).find((el) => el.getAttribute("aria-label") !== "Close");
      (first ?? root).focus({ preventScroll: true });
    }, 60);
    return () => clearTimeout(t);
  }, [overlay]);

  // The keyboard belongs to one dialog: it closes with it.
  useEffect(() => {
    setKb(null);
  }, [overlay]);

  // Typing on a real keyboard while it is open keeps the two in step.
  useEffect(() => {
    const el = kbTarget.current;
    if (!kb || !el) return;
    const sync = () => setKbValue(el.value);
    el.addEventListener("input", sync);
    return () => el.removeEventListener("input", sync);
  }, [kb]);

  const closeKeyboard = useCallback((done: boolean) => {
    const el = kbTarget.current;
    setKb(null);
    if (!el) return;
    if (done) {
      fx.select();
      // On to the next control below the field, as a console does after "Done".
      el.focus({ preventScroll: true });
      const root = panel.current;
      if (root && !spatial(root, "down")) el.focus({ preventScroll: true });
    } else {
      fx.back();
      el.focus({ preventScroll: true });
    }
  }, []);

  // Best at 70 m for every profile on this device, for the game's leaderboard.
  const board = useMemo(() => {
    if (overlay?.kind !== "game") return [];
    return [OWNER, SPOTTER, ...accounts, GUEST]
      .map((p) => ({ name: p.name, best: readBest(p.id, 70), me: p.id === player?.id }))
      .filter((b) => b.best > 0)
      .sort((a, b) => b.best - a.best);
  }, [overlay, accounts, player?.id, bests]);

  const accent = player?.accent ?? (screen === "profiles" ? ((profiles[profile] as Player | undefined)?.accent ?? "ginger") : "ginger");
  // The controller's light bar takes the player's colour too.
  useEffect(() => {
    if (!directReady) return;
    const [r, g, b] = ACCENTS[accent].rgb.split(" ").map(Number);
    dualSenseLight([r, g, b]);
  }, [accent, directReady]);
  const fade = { duration: reduce ? 0 : 0.5, ease: EASE };
  const visitorName = player?.kind === "visitor" ? player.name : "";

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-y-auto overflow-x-hidden lg:overflow-hidden"
      style={accentStyle(accent)}
      data-input={inputMode}
      onPointerDown={() => noteInput("pointer")}
    >
      <h1 className="sr-only">
        {content.meta.name}, {content.meta.role} in {content.meta.location}
      </h1>
      <Art tiles={all} active={current.id} />
      <Ambient className="absolute inset-0 h-full w-full" />

      {/* top bar */}
      <header className="relative z-10 flex h-16 shrink-0 items-center justify-between gap-4 px-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-5">
          <Logo className="h-6 w-6" />
          <nav aria-label="Tabs" className="flex items-center gap-4">
            {TABS.map((name, t) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  steer.current = false;
                  if (t !== tab) fx.tab();
                  go.row("tiles");
                  focusTile(t, sel[t]);
                }}
                aria-pressed={tab === t}
                className={`font-display text-lg font-semibold transition-opacity ${tab === t ? "opacity-100" : "opacity-55 hover:opacity-90"}`}
              >
                {name}
              </button>
            ))}
            {pad && (
              <span aria-hidden className="hidden items-center gap-1 text-content/55 lg:flex">
                <Shoulder>L1</Shoulder>
                <Shoulder>R1</Shoulder>
              </span>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              fx.open();
              go.overlay({ kind: "milestones" });
            }}
            aria-label={`Milestones: ${earned.length} of ${MILESTONES.length} earned`}
            className="flex h-10 items-center gap-2 rounded-full px-3 text-sm transition-colors hover:bg-white/10"
          >
            <Medal size={20} weight="fill" className="text-accentInk" />
            <span className="tabular-nums">
              {earned.length}/{MILESTONES.length}
            </span>
          </button>
          <button
            type="button"
            onClick={toggleMusic}
            aria-pressed={music}
            aria-label="Background music"
            className={`grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-white/10 ${music ? "" : "opacity-50"}`}
          >
            <MusicNotes size={20} weight={music ? "fill" : "regular"} />
          </button>
          <button
            type="button"
            onClick={toggleSounds}
            aria-pressed={sounds}
            aria-label="Interface sounds"
            className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-white/10"
          >
            {sounds ? <SpeakerHigh size={20} /> : <SpeakerSlash size={20} />}
          </button>
          <button
            type="button"
            onClick={() => {
              fx.open();
              go.overlay({ kind: "menu" });
            }}
            aria-label="Quick menu"
            className="grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-white/10"
          >
            <GearSix size={20} />
          </button>
          <span className="ml-2 hidden text-sm md:inline">
            <Clock />
          </span>
          {player && (
            <button
              type="button"
              onClick={toProfiles}
              aria-label={`Switch player. Now playing: ${player.name}`}
              className="ml-1 rounded-full ring-2 ring-white/25 transition-shadow hover:ring-white/60"
            >
              <Avatar player={player} className="h-9 w-9" iconSize={18} />
            </button>
          )}
        </div>
      </header>

      {/* the row of tiles */}
      <div
        role="tablist"
        aria-label={`${TABS[tab]} tab`}
        className="c-noscroll relative z-10 flex shrink-0 items-start gap-2.5 overflow-x-auto px-4 pb-7 pt-3 sm:px-8 lg:gap-3 lg:px-12"
      >
        {lists[tab].map((item, i) => {
          const on = i === tileIndex;
          return (
            <motion.button
              key={`${tab}-${item.id}`}
              ref={(el) => {
                tileRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tile-${item.id}`}
              aria-selected={on}
              aria-controls="console-panel"
              tabIndex={on ? 0 : -1}
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: EASE, delay: reduce ? 0 : i * 0.03 }}
              onClick={() => {
                unlockSound();
                steer.current = false;
                if (on && row === "tiles") act("select");
                else {
                  fx.move();
                  go.row("tiles");
                  focusTile(tab, i);
                }
              }}
              className={`relative shrink-0 rounded-2xl transition-[width,height,box-shadow,opacity] duration-300 ease-expo focus-visible:outline-none ${
                on
                  ? `h-20 w-20 lg:h-28 lg:w-28 ${row === "tiles" ? "shadow-[0_0_0_3px_rgb(var(--content-rgb))]" : "shadow-[0_0_0_2px_rgb(255_255_255/0.45)]"}`
                  : "h-16 w-16 opacity-80 hover:opacity-100 lg:h-[4.75rem] lg:w-[4.75rem]"
              }`}
            >
              <span className="absolute inset-0 overflow-hidden rounded-2xl bg-surface">
                <Thumb tile={item} />
              </span>
              <span
                className={`pointer-events-none absolute left-0 top-full mt-1.5 whitespace-nowrap text-xs transition-opacity ${
                  on ? "opacity-100" : "opacity-0"
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* the focused tile */}
      <section id="console-panel" role="tabpanel" aria-labelledby={`tile-${current.id}`} className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* Keyed, not wrapped in AnimatePresence "wait": a new tile's words
            appear at once and fade in, however fast the row is moved. Waiting
            for the old ones to leave could leave a stale title on screen. */}
        <motion.div
            key={`${current.id}-${player?.kind}`}
            className="max-w-[44rem] px-4 pt-2 sm:px-8 lg:px-12 lg:pt-4"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
          >
            <p className="text-sm text-accentInk">{current.kicker}</p>
            <h2 className="mega mt-2 text-[clamp(2.4rem,9vw,4rem)] [text-wrap:balance] lg:text-[4.6rem]">{current.title}</h2>
            <p className="mt-4 line-clamp-4 max-w-[46ch] text-base leading-relaxed text-content/85 lg:line-clamp-3 lg:text-lg">{current.blurb}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  steer.current = false;
                  if (primary) activate(primary);
                  else {
                    unlockSound();
                    fx.select();
                    go.row("cards");
                    go.card(0);
                  }
                }}
                className="flex h-12 items-center gap-2 rounded-full bg-content px-7 font-medium text-ink transition-transform active:scale-[0.98]"
              >
                {primary ? primary.title : "Open"}
                <ArrowRight size={16} weight="bold" />
              </button>
            </div>
          </motion.div>

        {/* its cards */}
        <div
          role="group"
          aria-label={`${current.label}: cards`}
          className="c-noscroll mt-auto flex shrink-0 items-stretch gap-3 overflow-x-auto px-4 pb-6 pt-6 sm:px-8 lg:px-12 lg:pb-14"
        >
          {cards.map((c, i) => {
            const on = row === "cards" && i === card;
            const accentCard = c.kind === "action";
            const flush = c.kind === "image";
            return (
              <motion.button
                key={`${current.id}-${player?.kind}-${c.id}`}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                type="button"
                tabIndex={row === "cards" ? (i === card ? 0 : -1) : i === 0 ? 0 : -1}
                initial={reduce ? false : { opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE, delay: reduce ? 0 : 0.08 + i * 0.045 }}
                onClick={() => {
                  steer.current = false;
                  go.row("cards");
                  go.card(i);
                  activate(c);
                }}
                className={`relative h-[10.75rem] shrink-0 overflow-hidden rounded-2xl text-left transition-[transform,box-shadow] duration-300 ease-expo focus-visible:outline-none ${cardWidth(c)} ${
                  flush ? "" : "p-5"
                } ${accentCard ? "bg-accent text-onAccent" : "c-card"} ${
                  on ? "-translate-y-1.5 shadow-[0_0_0_3px_rgb(var(--content-rgb))]" : "hover:-translate-y-1"
                }`}
              >
                <CardFace card={c} />
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* the button guide */}
      {guide && (
        <footer className="absolute inset-x-0 bottom-0 z-10 hidden h-12 items-center justify-between gap-6 px-12 text-sm text-content/70 lg:flex">
          {pad ? (
            <p className="flex items-center gap-4">
              <span className="flex items-center gap-2">
                <FaceButton lit="south" /> Select
              </span>
              <span className="flex items-center gap-2">
                <FaceButton lit="east" /> Back
              </span>
              <span className="flex items-center gap-2">
                <FaceButton lit="west" /> Music
              </span>
              <span className="flex items-center gap-2">
                <FaceButton lit="north" /> Milestones
              </span>
              <span className="flex items-center gap-1.5">
                <Shoulder>L1</Shoulder>
                <Shoulder>R1</Shoulder> Tabs
              </span>
              <span className="flex items-center gap-1.5">
                <Shoulder>L2</Shoulder>
                <Shoulder>R2</Shoulder> Volume
              </span>
              <span>Options: menu</span>
            </p>
          ) : (
            <p className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Key>←</Key>
                <Key>→</Key> Move
              </span>
              <span className="flex items-center gap-1.5">
                <Key>Enter</Key> Select
              </span>
              <span className="flex items-center gap-1.5">
                <Key>Esc</Key> Back
              </span>
              <span className="flex items-center gap-1.5">
                <Key>Q</Key>
                <Key>E</Key> Tabs
              </span>
              <span className="flex items-center gap-1.5">
                <Key>M</Key> Music
              </span>
              <span className="flex items-center gap-1.5">
                <Key>O</Key> Menu
              </span>
              <span>or plug in a gamepad</span>
            </p>
          )}
          <p className="whitespace-nowrap">{pad ? "R3 hides this" : "H hides this"}</p>
        </footer>
      )}

      {/* the game */}
      <AnimatePresence>
        {overlay?.kind === "game" && (
          <Game
            key="game"
            player={player ?? GUEST}
            bests={bests}
            board={board}
            onExit={() => {
              fx.back();
              go.overlay(null);
            }}
            onArrow={(score, distance) => {
              if (score === 10 && distance >= 50) grant("gold");
            }}
            onPractice={(total, distance) => {
              grant("round");
              if (distance === 70 && total === 60) grant("perfect");
              if (player && saveBest(player.id, total, distance)) {
                setBests((b) => ({ ...b, [distance]: total }));
                if (distance === 70) setBest(total);
              }
            }}
            onMatch={(won, vs) => {
              if (won && vs === "spotter") grant("beat");
            }}
          />
        )}
      </AnimatePresence>

      {/* dialogs */}
      <AnimatePresence>
        {overlay && overlay.kind !== "game" && overlay.kind !== "island" && (
          <motion.div
            key="dialog"
            className="fixed inset-0 z-[55] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                fx.back();
                go.overlay(null);
              }
            }}
          >
            <motion.div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label={
                overlay.kind === "card"
                  ? "title" in overlay.card
                    ? overlay.card.title
                    : "Details"
                  : { mail: "Write a message", milestones: "Milestones", menu: "Quick menu", add: "Add user", remove: "Remove profile" }[overlay.kind]
              }
              tabIndex={-1}
              className={`c-panel relative max-h-[88dvh] w-full overflow-y-auto overscroll-contain p-6 focus-visible:outline-none sm:p-9 ${
                overlay.kind === "remove" ? "max-w-[30rem]" : overlay.kind === "menu" ? "max-w-[40rem]" : "max-w-[56rem]"
              }`}
              initial={reduce ? false : { scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={reduce ? undefined : { scale: 0.97 }}
              transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
            >
              <button
                type="button"
                onClick={() => {
                  fx.back();
                  go.overlay(null);
                }}
                aria-label="Close"
                className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/40 transition-colors hover:bg-white/15"
              >
                <X size={18} weight="bold" />
              </button>

              {overlay.kind === "card" && <CardDetail card={overlay.card} />}

              {overlay.kind === "mail" && (
                <div>
                  <h2 className="mega text-m3">Write a message</h2>
                  <p className="mt-2 text-content/70">{content.contact.formNote}</p>
                  <div className="mt-6 overflow-hidden rounded-xl border border-white/12">
                    <MailForm id="c" defaultName={visitorName} />
                  </div>
                </div>
              )}

              {overlay.kind === "milestones" && (
                <div>
                  <h2 className="mega text-m3">Milestones</h2>
                  <p className="mt-2 text-content/70">
                    {player ? `${player.name}: ` : ""}
                    {earned.length} of {MILESTONES.length} earned. They are kept on this device.
                  </p>
                  <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                    {MILESTONES.map((m) => {
                      const got = earned.includes(m.id);
                      return (
                        <li key={m.id} className={`flex items-start gap-3 rounded-xl p-4 ${got ? "bg-white/10" : "bg-white/[0.04]"}`}>
                          <Medal size={26} weight={got ? "fill" : "regular"} className={got ? "text-accentInk" : "text-content/40"} />
                          <span>
                            <span className={`block font-medium ${got ? "" : "text-content/60"}`}>{m.title}</span>
                            <span className="block text-sm text-content/60">{m.how}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {overlay.kind === "menu" && (
                <div>
                  <h2 className="mega text-m3">Quick menu</h2>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={toggleMusic} className="flex items-center gap-3 rounded-xl bg-white/[0.07] p-4 text-left hover:bg-white/[0.12]">
                      <MusicNotes size={24} weight={music ? "fill" : "regular"} />
                      <span>
                        <span className="block font-medium">Music {music ? "on" : "off"}</span>
                        <span className="block text-sm text-content/60">West button or M</span>
                      </span>
                    </button>
                    <button type="button" onClick={toggleSounds} className="flex items-center gap-3 rounded-xl bg-white/[0.07] p-4 text-left hover:bg-white/[0.12]">
                      {sounds ? <SpeakerHigh size={24} /> : <SpeakerSlash size={24} />}
                      <span>
                        <span className="block font-medium">Sounds {sounds ? "on" : "off"}</span>
                        <span className="block text-sm text-content/60">The clicks and chimes</span>
                      </span>
                    </button>
                    <div className="flex items-center gap-2 rounded-xl bg-white/[0.07] p-3 sm:col-span-2">
                      <button type="button" onClick={() => nudgeVolume(-0.1)} aria-label="Volume down" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
                        &minus;
                      </button>
                      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
                        <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${volume * 100}%` }} />
                      </span>
                      <button type="button" onClick={() => nudgeVolume(0.1)} aria-label="Volume up" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
                        +
                      </button>
                      <span className="w-12 text-right text-sm tabular-nums">{Math.round(volume * 100)}%</span>
                    </div>
                    <button type="button" onClick={toggleVibrate} className="flex items-center gap-3 rounded-xl bg-white/[0.07] p-4 text-left hover:bg-white/[0.12]">
                      <Vibrate size={24} weight={vibrate ? "fill" : "regular"} />
                      <span>
                        <span className="block font-medium">Vibration {vibrate ? "on" : "off"}</span>
                        <span className="block text-sm text-content/60">The controller buzzes as you go</span>
                      </span>
                    </button>
                    {pad && !directReady && needsDirectRumble() && (
                      <button type="button" onClick={turnOnVibration} className="flex items-center gap-3 rounded-xl bg-accent/90 p-4 text-left text-onAccent hover:bg-accent">
                        <Vibrate size={24} />
                        <span>
                          <span className="block font-medium">Turn on vibration</span>
                          <span className="block text-sm opacity-75">PS5 controller over USB: allow it once</span>
                        </span>
                      </button>
                    )}
                    <button type="button" onClick={testVibrate} className="flex items-center gap-3 rounded-xl bg-white/[0.07] p-4 text-left hover:bg-white/[0.12]">
                      <Vibrate size={24} />
                      <span>
                        <span className="block font-medium">Test vibration</span>
                        <span className="block text-sm text-content/60">A short, strong buzz</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => go.overlay({ kind: "milestones" })}
                      className="flex items-center gap-3 rounded-xl bg-white/[0.07] p-4 text-left hover:bg-white/[0.12]"
                    >
                      <Medal size={24} weight="fill" />
                      <span className="font-medium">Milestones</span>
                    </button>
                    <button type="button" onClick={toProfiles} className="flex items-center gap-3 rounded-xl bg-white/[0.07] p-4 text-left hover:bg-white/[0.12]">
                      <UsersThree size={24} weight="fill" />
                      <span className="font-medium">Switch player</span>
                    </button>
                    <button type="button" onClick={() => void share()} className="flex items-center gap-3 rounded-xl bg-white/[0.07] p-4 text-left hover:bg-white/[0.12]">
                      <ShareNetwork size={24} weight="fill" />
                      <span>
                        <span className="block font-medium">Copy the link</span>
                        <span className="block text-sm text-content/60">The small left button</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGuide((g) => !g);
                        go.overlay(null);
                      }}
                      className="flex items-center gap-3 rounded-xl bg-white/[0.07] p-4 text-left hover:bg-white/[0.12]"
                    >
                      <span className="grid h-6 w-6 place-items-center">
                        <FaceButton lit="south" />
                      </span>
                      <span className="font-medium">{guide ? "Hide" : "Show"} the button guide</span>
                    </button>
                  </div>
                </div>
              )}

              {overlay.kind === "add" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createAccount();
                  }}
                >
                  <h2 className="mega text-m3">Add user</h2>
                  <p className="mt-2 max-w-[48ch] text-content/70">
                    A profile of your own, kept on this device only: no sign-up, nothing sent anywhere. It keeps your colour, your
                    milestones and your best score.
                  </p>
                  <div className="mt-7 grid gap-8 sm:grid-cols-[auto_1fr] sm:items-start">
                    <Avatar player={{ id: "preview", kind: "visitor", name: newName, icon: newIcon, accent: newAccent }} className="h-28 w-28" iconSize={52} />
                    <div className="grid gap-6">
                      <div className="grid gap-2">
                        <label htmlFor="c-player" className="text-sm font-medium">
                          Name
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="c-player"
                            value={newName}
                            maxLength={18}
                            onChange={(e) => setNewName(e.target.value)}
                            autoComplete="nickname"
                            className="min-w-0 flex-1 rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-content outline-none focus:border-accent"
                          />
                          <button
                            type="button"
                            onClick={() => setNewName(randomName())}
                            aria-label="Pick a random name"
                            title="Random name (west button)"
                            className="grid h-12 w-12 place-items-center rounded-xl border border-white/20 hover:bg-white/10"
                          >
                            <Shuffle size={18} weight="bold" />
                          </button>
                        </div>
                        {inputMode === "pad" && (
                          <p className="text-xs text-content/60">Press the south button on the field to type with the controller.</p>
                        )}
                      </div>
                      <fieldset>
                        <legend className="mb-2 text-sm font-medium">Icon</legend>
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(AVATAR_ICONS) as AvatarIcon[]).map((key) => {
                            const Icon = AVATAR_ICONS[key];
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setNewIcon(key)}
                                aria-pressed={newIcon === key}
                                aria-label={key}
                                className={`grid h-11 w-11 place-items-center rounded-full border transition-colors ${
                                  newIcon === key ? "border-accent bg-accent text-onAccent" : "border-white/20 hover:bg-white/10"
                                }`}
                              >
                                <Icon size={20} weight="fill" />
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                      <fieldset>
                        <legend className="mb-2 text-sm font-medium">Colour</legend>
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setNewAccent(key)}
                              aria-pressed={newAccent === key}
                              aria-label={ACCENTS[key].name}
                              className={`grid h-11 w-11 place-items-center rounded-full ring-offset-2 ring-offset-[rgb(20_22_28)] ${newAccent === key ? "ring-2 ring-white" : ""}`}
                              style={{ background: `rgb(${ACCENTS[key].rgb})`, color: `rgb(${ACCENTS[key].on})` }}
                            >
                              {newAccent === key && <Check size={18} weight="bold" />}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button type="submit" className="flex h-12 items-center gap-2 rounded-full bg-content px-7 font-medium text-ink">
                      <Plus size={16} weight="bold" />
                      Create and play
                    </button>
                    <button type="button" onClick={() => go.overlay(null)} className="h-12 rounded-full border border-white/25 px-7">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {overlay.kind === "remove" && (
                <div>
                  <div className="flex items-center gap-4">
                    <Avatar player={overlay.player} className="h-14 w-14" iconSize={26} />
                    <h2 className="font-display text-2xl font-semibold">Remove {overlay.player.name}?</h2>
                  </div>
                  <p className="mt-4 text-content/70">Their milestones and best score on this device go with it.</p>
                  <div className="mt-7 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        remove(overlay.player.id);
                        fx.back();
                        go.overlay(null);
                        go.profile(0);
                        if (player?.id === overlay.player.id) setPlayer(null);
                      }}
                      className="flex h-12 items-center gap-2 rounded-full bg-danger px-6 font-medium text-ink"
                    >
                      <Trash size={16} weight="bold" />
                      Remove
                    </button>
                    <button type="button" onClick={() => go.overlay(null)} className="h-12 rounded-full border border-white/25 px-6">
                      Keep
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* who is playing */}
      <AnimatePresence>
        {screen === "profiles" && (
          <motion.div
            key="profiles"
            role="dialog"
            aria-modal="true"
            aria-label="Who is playing?"
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-10 overflow-y-auto bg-ink px-6 py-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
          >
            <Ambient className="absolute inset-0 h-full w-full" />
            <h2 className="mega relative text-center text-m2">Who is playing?</h2>
            <div className="relative flex max-w-[64rem] flex-wrap justify-center gap-x-6 gap-y-8 sm:gap-x-10">
              {profiles.map((p, i) => {
                const on = profile === i;
                const isAdd = p.id === "add";
                return (
                  <div key={p.id} className="flex w-28 flex-col items-center sm:w-36">
                    <button
                      type="button"
                      onClick={() => pick(i)}
                      onPointerMove={(e) => e.pointerType === "mouse" && state.current.profile !== i && go.profile(i)}
                      onFocus={() => go.profile(i)}
                      aria-pressed={on}
                      aria-label={isAdd ? "Add user" : `Play as ${p.name}`}
                      className="group flex flex-col items-center gap-3 text-center focus-visible:outline-none"
                    >
                      <span
                        className={`rounded-full transition-[box-shadow,transform,opacity] duration-300 ease-expo ${
                          on ? "scale-110 shadow-[0_0_0_4px_rgb(var(--content-rgb))]" : "opacity-65"
                        }`}
                      >
                        {isAdd ? (
                          <span className="grid h-24 w-24 place-items-center rounded-full border-2 border-dashed border-white/40 sm:h-32 sm:w-32">
                            <Plus size={34} weight="bold" />
                          </span>
                        ) : (
                          <Avatar player={p as Player} className="h-24 w-24 sm:h-32 sm:w-32" iconSize={44} />
                        )}
                      </span>
                      <span className="block font-display text-lg font-semibold leading-tight sm:text-xl">{p.name}</span>
                    </button>
                    <span className="mt-1 min-h-[2.5rem] text-center text-xs text-content/60 sm:text-sm">
                      {p.kind === "owner"
                        ? "The developer."
                        : p.kind === "spotter"
                          ? "A friend. Anonymous."
                          : isAdd
                            ? "Your own profile."
                            : p.kind === "guest"
                              ? "Just looking."
                              : on
                                ? (
                                    <button
                                      type="button"
                                      onClick={() => go.overlay({ kind: "remove", player: p as Player })}
                                      className="underline decoration-white/30 underline-offset-4 hover:text-content"
                                    >
                                      Remove
                                    </button>
                                  )
                                : "On this device."}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="relative text-center text-sm text-content/60">
              <span className="hidden lg:inline">Left and right to choose, Enter or the south button to start.</span>
              <span className="lg:hidden">Tap a player to start.</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* power on */}
      <AnimatePresence>
        {screen === "boot" && (
          <motion.div key="boot" className="fixed inset-0 z-50" exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}>
            <Boot powering={powering} onPress={start} onDone={finishBoot} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* sound is waiting for a key, a click or a tap */}
      <AnimatePresence>
        {soundLocked && music && screen !== "boot" && (
          <motion.div
            key="sound-locked"
            role="status"
            className="c-panel fixed inset-x-0 top-4 z-[65] mx-auto flex w-[min(36rem,92vw)] items-center gap-3 !rounded-full py-2 pl-4 pr-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <SpeakerSlash size={20} className="shrink-0" />
            <p className="min-w-0 flex-1 text-sm leading-snug">
              Sound is waiting. Press any key or click once: browsers do not let a controller turn sound on.
            </p>
            <button
              type="button"
              onClick={() => {
                unlockSound();
                checkSound();
              }}
              className="shrink-0 rounded-full bg-content px-4 py-2 text-sm font-medium text-ink"
            >
              Turn on
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* toasts */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2 lg:bottom-auto lg:top-20">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.p
              key={t.key}
              className="c-panel flex items-center gap-3 !rounded-full py-2.5 pl-3 pr-5"
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
              transition={{ duration: reduce ? 0 : 0.4, ease: EASE }}
            >
              {t.medal ? (
                <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-onAccent">
                  <Medal size={20} weight="fill" />
                </span>
              ) : player ? (
                <Avatar player={player} className="h-9 w-9" iconSize={18} />
              ) : null}
              {t.medal ? (
                <span className="leading-tight">
                  <span className="block text-xs text-content/65">{t.sub}</span>
                  <span className="block font-medium">{t.title}</span>
                </span>
              ) : (
                <span className="leading-tight">
                  <span className="block font-medium">{t.title}</span>
                  <span className="block text-xs text-content/65">{t.sub}</span>
                </span>
              )}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>

      {/* the island game, launched from its tile */}
      <AnimatePresence>
        {overlay?.kind === "island" && (
          <IslandLaunch
            key="island"
            reduce={reduce}
            onExit={() => {
              fx.back();
              go.overlay(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* typing with the pad */}
      <AnimatePresence>
        {kb && (
          <PadKeyboard
            key="keyboard"
            api={kbApi}
            label={kb.label}
            value={kbValue}
            maxLength={kb.max}
            onChange={(v) => {
              setKbValue(v);
              if (kbTarget.current) writeField(kbTarget.current, v);
            }}
            onDone={() => closeKeyboard(true)}
            onClose={() => closeKeyboard(false)}
            onMove={fx.move}
            onType={() => (sfx.move(), haptic("move"))}
            onEdge={fx.edge}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
