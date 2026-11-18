"use client";

import { useEffect, useRef } from "react";
import { dualSenseReady, dualSenseRumble, restoreDualSense } from "./dualsense";

/**
 * Every button the console listens to, by what it does here. Names are by
 * position on the pad (south, east, west, north), not by any maker's
 * lettering or symbols.
 */
export type PadAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "select" // south face button
  | "back" // east
  | "west" // west: music on and off
  | "north" // north: milestones
  | "l1"
  | "r1" // shoulders: switch tabs
  | "l2"
  | "r2" // triggers: volume down and up
  | "create" // the small left button: share
  | "menu" // the small right button: quick menu
  | "l3" // left stick click: back to the first tile
  | "r3" // right stick click: show or hide the button guide
  | "home" // the centre button: quick menu
  | "pad" // touchpad click: switch player
  | "prevCard"
  | "nextCard"; // right stick: flick along the cards

// The W3C "standard" gamepad mapping: the same indices on every modern pad.
const BUTTONS: [number, PadAction][] = [
  [0, "select"],
  [1, "back"],
  [2, "west"],
  [3, "north"],
  [4, "l1"],
  [5, "r1"],
  [6, "l2"],
  [7, "r2"],
  [8, "create"],
  [9, "menu"],
  [10, "l3"],
  [11, "r3"],
  [12, "up"],
  [13, "down"],
  [14, "left"],
  [15, "right"],
  [16, "home"],
  [17, "pad"],
];
const REPEATS = new Set<PadAction>(["left", "right", "up", "down", "prevCard", "nextCard"]);
const FIRST_REPEAT = 380;
const REPEAT = 130;
const DEADZONE = 0.55;

export function connectedPad(): Gamepad | null {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
  const pads = [...navigator.getGamepads()].filter((p): p is Gamepad => !!p && p.connected);
  // Prefer a pad in the standard layout: the indices below assume it.
  return pads.find((p) => p.mapping === "standard") ?? pads[0] ?? null;
}

/* ── Vibration ─────────────────────────────────────────────────────────── */

const RUMBLE_KEY = "am-console-rumble";
let rumbleOn = true;
// Only buzz when the pad is what is being used: a pad left on the desk should
// not shake every time the mouse clicks something.
let padInUse = false;

export function loadRumblePref() {
  try {
    rumbleOn = localStorage.getItem(RUMBLE_KEY) !== "off";
  } catch {
    /* default on */
  }
  return rumbleOn;
}
export function setRumble(on: boolean) {
  rumbleOn = on;
  try {
    localStorage.setItem(RUMBLE_KEY, on ? "on" : "off");
  } catch {
    /* fine */
  }
}
export function markPadInUse(v: boolean) {
  padInUse = v;
}

type Actuator = {
  type?: string;
  effects?: string[];
  playEffect?: (t: string, o: object) => Promise<unknown>;
  pulse?: (value: number, ms: number) => Promise<unknown>;
};

type HapticPad = Gamepad & { vibrationActuator?: Actuator | null; hapticActuators?: Actuator[] };

/**
 * Every connected pad, not just the first. Windows often lists the same
 * controller twice (the pad itself and a virtual copy made by Steam or a
 * driver), and the copy is usually first and cannot vibrate; sending the
 * buzz only to entry 0 is why a pad could stay still.
 */
function allPads(): HapticPad[] {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return [];
  return [...navigator.getGamepads()].filter((p): p is HapticPad => !!p && p.connected);
}

/**
 * The smallest buzz a hand can feel. Controllers with voice-coil haptics
 * (a DualSense, for one) turn very short, very light effects into nothing,
 * so anything asked for is lifted to at least this.
 */
const MIN_MS = 60;
const MIN_MAG = 0.32;
const lift = (v: number) => (v <= 0 ? 0 : Math.min(1, Math.max(MIN_MAG, v)));

/**
 * A buzz on pads that can, nothing on those that cannot. Chromium browsers
 * expose `vibrationActuator.playEffect("dual-rumble")`; Firefox has
 * `hapticActuators[].pulse`. Returns false when no connected pad can rumble.
 */
export function rumble(strong: number, weak: number, ms: number, force = false): boolean {
  if (!rumbleOn && !force) return false;
  const duration = Math.max(MIN_MS, ms);
  let s = lift(strong);
  let w = lift(weak);
  if (s === 0 && w === 0) return false;
  // Some pads only have the one motor behind "strong": never send it nothing.
  if (s === 0) s = w * 0.6;
  if (w === 0) w = s * 0.5;
  let sent = false;
  let needsDirect = false;
  for (const pad of allPads()) {
    if (buzz(pad, s, w, duration)) sent = true;
    else if (isPlayStation(pad)) needsDirect = true;
  }
  // A PS5 controller the browser cannot vibrate: straight to the controller.
  if (needsDirect && dualSenseRumble(s, w, duration)) sent = true;
  return sent;
}

const isPlayStation = (pad: Gamepad) => /054c/i.test(pad.id);

/** A connected PS5 controller that only the direct route can vibrate. */
export function needsDirectRumble(): boolean {
  return allPads().some((p) => isPlayStation(p) && !p.vibrationActuator?.playEffect && !p.hapticActuators?.[0]?.pulse);
}

/**
 * One buzz on one pad. Always tries "dual-rumble": some Chromium versions
 * report an empty or missing list of effects for pads that rumble perfectly
 * well, so the list is not a reason to skip. Only if the browser refuses does
 * it fall back to the older one-motor `pulse`.
 */
function buzz(pad: HapticPad, s: number, w: number, duration: number, report?: (r: string) => void): boolean {
  const a = pad.vibrationActuator;
  const h = pad.hapticActuators?.[0];
  if (a?.playEffect) {
    a.playEffect("dual-rumble", { startDelay: 0, duration, strongMagnitude: s, weakMagnitude: w })
      .then((r) => report?.(String(r)))
      .catch((err: unknown) => {
        report?.(`refused (${err instanceof Error ? err.name : "error"})`);
        h?.pulse?.(Math.max(s, w), duration).catch(() => {});
      });
    return true;
  }
  if (h?.pulse) {
    h.pulse(Math.max(s, w), duration).then(
      () => report?.("complete"),
      () => report?.("refused"),
    );
    return true;
  }
  return false;
}

export interface RumbleCheck {
  pads: { id: string; canBuzz: boolean; effects: string }[];
  /** what the browser answered for each pad, filled in as the answers come back */
  results: Promise<string[]>;
}

/**
 * The "Test vibration" button: a strong buzz on every pad, and what the
 * browser said about it, so "nothing happened" can be told apart from "the
 * browser refused" and "there is no pad".
 */
export function testRumble(): RumbleCheck {
  const pads = allPads();
  const answers = pads.map(
    (pad) =>
      new Promise<string>((resolve) => {
        const ok = buzz(pad, 1, 1, 600, resolve);
        if (!ok && isPlayStation(pad) && dualSenseRumble(1, 1, 600)) resolve("complete");
        else if (!ok) resolve("no vibration in this browser");
        setTimeout(() => resolve("no answer"), 1500);
      }),
  );
  return {
    pads: pads.map((p) => ({
      id: p.id,
      canBuzz: !!p.vibrationActuator?.playEffect || !!p.hapticActuators?.[0]?.pulse || (isPlayStation(p) && dualSenseReady()),
      effects: p.vibrationActuator?.effects?.join(", ") || "not listed",
    })),
    results: Promise.all(answers),
  };
}

/** Can anything connected vibrate at all? */
export function canRumble(): boolean {
  return allPads().some((p) => !!p.vibrationActuator?.playEffect || !!p.hapticActuators?.[0]?.pulse) || (needsDirectRumble() && dualSenseReady());
}

/** The triggers' own motors, on pads that have them (otherwise nothing). */
export function triggerRumble(left: number, right: number, ms: number) {
  if (!rumbleOn) return;
  for (const pad of allPads()) {
    const a = pad.vibrationActuator;
    if (!a?.playEffect || !a.effects?.includes("trigger-rumble")) continue;
    a.playEffect("trigger-rumble", { startDelay: 0, duration: Math.max(MIN_MS, ms), leftTrigger: left, rightTrigger: right, strongMagnitude: 0, weakMagnitude: 0 }).catch(() => {});
  }
}

/** The console's touch: a short pattern for each kind of moment. */
export function haptic(kind: "move" | "select" | "back" | "edge" | "tab" | "open" | "milestone" | "boot") {
  if (!padInUse || !rumbleOn) return;
  switch (kind) {
    case "move":
      return void rumble(0, 0.18, 28);
    case "select":
      return void rumble(0.25, 0.45, 55);
    case "back":
      return void rumble(0.12, 0.3, 40);
    case "edge":
      return void rumble(0.45, 0, 70);
    case "tab":
      return void rumble(0.15, 0.4, 45);
    case "open":
      return void rumble(0.1, 0.35, 45);
    case "milestone":
      rumble(0.3, 0.6, 80);
      setTimeout(() => rumble(0.3, 0.6, 80), 140);
      setTimeout(() => rumble(0.7, 0.9, 160), 280);
      return;
    case "boot":
      rumble(0.1, 0.3, 120);
      setTimeout(() => rumble(0.35, 0.6, 180), 160);
      return;
  }
}

/* ── The hook ──────────────────────────────────────────────────────────── */

/**
 * Drive the interface from a real controller: the d-pad and both sticks,
 * the four face buttons, both shoulders and triggers, both stick clicks, and
 * the small buttons in the middle. Held directions repeat, as on a console.
 *
 * The Gamepad API has no events for buttons, so this polls once a frame, and
 * only while a pad is connected. `paused` hands the pad over to something
 * that reads it directly (the game).
 */
export function useGamepad(
  onAction: (action: PadAction) => void,
  { onConnect, paused = false }: { onConnect?: (id: string) => void; paused?: boolean } = {}
) {
  const handler = useRef(onAction);
  handler.current = onAction;
  const connected = useRef(onConnect);
  connected.current = onConnect;
  const isPaused = useRef(paused);
  isPaused.current = paused;

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;
    void restoreDualSense();
    let raf = 0;
    // when each action was first pressed, and when it last fired
    const held = new Map<PadAction, { since: number; last: number }>();

    const poll = (now: number) => {
      raf = requestAnimationFrame(poll);
      const pad = connectedPad();
      if (!pad) return;

      const down = new Set<PadAction>();
      for (const [index, action] of BUTTONS) {
        const b = pad.buttons[index];
        // triggers are analog: count them past a third of the way
        if (b && (index === 6 || index === 7 ? b.value > 0.35 : b.pressed)) down.add(action);
      }
      const [lx = 0, ly = 0, rx = 0] = pad.axes;
      if (lx < -DEADZONE) down.add("left");
      if (lx > DEADZONE) down.add("right");
      if (ly < -DEADZONE) down.add("up");
      if (ly > DEADZONE) down.add("down");
      if (rx < -DEADZONE) down.add("prevCard");
      if (rx > DEADZONE) down.add("nextCard");

      // While paused, keep track of what is held (so nothing fires the moment
      // the pause ends because a button was already down), but act on nothing.
      for (const action of down) {
        const h = held.get(action);
        if (!h) {
          held.set(action, { since: now, last: now });
          if (!isPaused.current) handler.current(action);
        } else if (REPEATS.has(action) && now - h.since > FIRST_REPEAT && now - h.last > REPEAT) {
          h.last = now;
          if (!isPaused.current) handler.current(action);
        }
      }
      for (const action of [...held.keys()]) if (!down.has(action)) held.delete(action);
    };

    const start = (e?: Event) => {
      const id = (e as GamepadEvent | undefined)?.gamepad?.id ?? connectedPad()?.id ?? "";
      connected.current?.(id);
      if (!raf) raf = requestAnimationFrame(poll);
    };
    const stop = () => {
      if (connectedPad()) return;
      cancelAnimationFrame(raf);
      raf = 0;
      held.clear();
    };
    window.addEventListener("gamepadconnected", start);
    window.addEventListener("gamepaddisconnected", stop);
    // a pad that was already awake before the page loaded
    if (connectedPad()) start();

    return () => {
      window.removeEventListener("gamepadconnected", start);
      window.removeEventListener("gamepaddisconnected", stop);
      cancelAnimationFrame(raf);
    };
  }, []);
}
