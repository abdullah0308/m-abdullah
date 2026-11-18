"use client";

import { useEffect, useRef } from "react";

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
  return [...navigator.getGamepads()].find((p): p is Gamepad => !!p && p.connected) ?? null;
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

/**
 * A buzz on pads that can, nothing on those that cannot. Chromium browsers
 * expose `vibrationActuator.playEffect("dual-rumble")`; Firefox has
 * `hapticActuators[].pulse`. Returns false when there is no way to rumble.
 */
export function rumble(strong: number, weak: number, ms: number, force = false): boolean {
  if (!rumbleOn && !force) return false;
  const pad = connectedPad() as (Gamepad & { vibrationActuator?: Actuator; hapticActuators?: Actuator[] }) | null;
  if (!pad) return false;
  const a = pad.vibrationActuator;
  if (a?.playEffect) {
    a.playEffect("dual-rumble", { startDelay: 0, duration: ms, strongMagnitude: Math.min(1, strong), weakMagnitude: Math.min(1, weak) }).catch(() => {});
    return true;
  }
  const h = pad.hapticActuators?.[0];
  if (h?.pulse) {
    h.pulse(Math.min(1, Math.max(strong, weak)), ms).catch(() => {});
    return true;
  }
  return false;
}

/** The triggers' own motors, on pads that have them (otherwise nothing). */
export function triggerRumble(left: number, right: number, ms: number) {
  if (!rumbleOn) return;
  const a = (connectedPad() as (Gamepad & { vibrationActuator?: Actuator }) | null)?.vibrationActuator;
  if (!a?.playEffect || (a.effects && !a.effects.includes("trigger-rumble"))) return;
  a.playEffect("trigger-rumble", { startDelay: 0, duration: ms, leftTrigger: left, rightTrigger: right, strongMagnitude: 0, weakMagnitude: 0 }).catch(() => {});
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
