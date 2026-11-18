"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Milestones: small rewards for exploring the console, in the way consoles
 * reward players. Each is earned once per player, announced with a toast,
 * and kept in localStorage under that player, so every profile on a device
 * has its own collection.
 */
export const MILESTONES = [
  { id: "power", title: "Powered on", how: "Pick a player and start." },
  { id: "tour", title: "The full tour", how: "Look at every tile on both tabs." },
  { id: "reader", title: "Read the manual", how: "Open five different cards." },
  { id: "spotter", title: "Second opinion", how: "Play as the Spotter." },
  { id: "account", title: "Signed in", how: "Make a profile of your own." },
  { id: "pad", title: "Proper controls", how: "Connect a gamepad." },
  { id: "round", title: "First end", how: "Shoot all six arrows in 70 m." },
  { id: "gold", title: "In the gold", how: "Land an arrow in the ten ring." },
  { id: "perfect", title: "Sixty out of sixty", how: "Six tens at 70 m." },
  { id: "beat", title: "Beat the Spotter", how: "Win a match against the Spotter." },
] as const;

export type MilestoneId = (typeof MILESTONES)[number]["id"];

const keyFor = (player: string) => `am-console-milestones:${player}`;
// What has been earned this visit, for browsers where storage is blocked.
const session = new Map<string, Set<MilestoneId>>();

function read(player: string): MilestoneId[] {
  const mem = [...(session.get(player) ?? [])];
  try {
    const raw = JSON.parse(localStorage.getItem(keyFor(player)) ?? "[]");
    const known = new Set<string>(MILESTONES.map((m) => m.id));
    const stored = Array.isArray(raw) ? raw.filter((id): id is MilestoneId => known.has(id)) : [];
    return [...new Set([...stored, ...mem])];
  } catch {
    return mem;
  }
}

/**
 * `earned` is what the current player has; `award` grants one and returns
 * true only the first time, which is the caller's cue to show the toast.
 */
export function useMilestones(player: string | null) {
  const [earned, setEarned] = useState<MilestoneId[]>([]);

  // After mount: the server cannot know what this browser has earned.
  useEffect(() => setEarned(player ? read(player) : []), [player]);

  const award = useCallback(
    (id: MilestoneId): boolean => {
      if (!player) return false;
      const have = read(player);
      if (have.includes(id)) return false;
      const mem = session.get(player) ?? new Set<MilestoneId>();
      mem.add(id);
      session.set(player, mem);
      const next = [...have, id];
      try {
        localStorage.setItem(keyFor(player), JSON.stringify(next));
      } catch {
        /* storage blocked: milestones last for this visit only */
      }
      setEarned(next);
      return true;
    },
    [player]
  );

  return { earned, award };
}
