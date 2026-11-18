"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  Binoculars,
  Code,
  Coffee,
  GameController,
  Leaf,
  Lightning,
  Mountains,
  Planet,
  Rocket,
  Target,
  UserCircle,
  Waves,
} from "@phosphor-icons/react/dist/ssr";
import { ABDULLAH_FACE } from "@/components/ui/Face";
import Image from "next/image";

/* ── Colours ───────────────────────────────────────────────────────────── */

/** Each player's colour: the accent the whole console takes while they play. */
export const ACCENTS = {
  ginger: { name: "Ginger", rgb: "234 145 64", ink: "244 168 96", on: "24 17 10" },
  sky: { name: "Sky", rgb: "112 172 238", ink: "152 198 248", on: "6 16 30" },
  lime: { name: "Lime", rgb: "176 198 92", ink: "198 216 116", on: "18 22 8" },
  rose: { name: "Rose", rgb: "236 120 148", ink: "246 152 174", on: "30 10 16" },
  gold: { name: "Gold", rgb: "232 192 76", ink: "242 208 112", on: "26 20 6" },
  teal: { name: "Teal", rgb: "76 198 182", ink: "114 216 202", on: "6 22 20" },
} as const;
export type AccentKey = keyof typeof ACCENTS;

export function accentStyle(key: AccentKey): CSSProperties {
  const a = ACCENTS[key];
  return {
    ["--accent-rgb" as string]: a.rgb,
    ["--accent-ink-rgb" as string]: a.ink,
    ["--on-accent-rgb" as string]: a.on,
  };
}

/* ── Avatars ───────────────────────────────────────────────────────────── */

export const AVATAR_ICONS = {
  target: Target,
  lightning: Lightning,
  planet: Planet,
  mountains: Mountains,
  waves: Waves,
  rocket: Rocket,
  leaf: Leaf,
  coffee: Coffee,
  code: Code,
  controller: GameController,
} as const;
export type AvatarIcon = keyof typeof AVATAR_ICONS;

/* ── Players ───────────────────────────────────────────────────────────── */

export interface Player {
  id: string;
  kind: "owner" | "spotter" | "visitor" | "guest";
  name: string;
  accent: AccentKey;
  icon?: AvatarIcon;
}

export const OWNER: Player = { id: "abdullah", kind: "owner", name: "Abdullah", accent: "ginger" };
/**
 * Player two: a friend of Abdullah's who stays anonymous. In archery the
 * spotter stands behind the archer with a scope and calls where each arrow
 * landed; that is the part they play here.
 */
export const SPOTTER: Player = { id: "spotter", kind: "spotter", name: "The Spotter", accent: "sky" };
export const GUEST: Player = { id: "guest", kind: "guest", name: "Guest", accent: "teal" };

/** A round picture of a player: Abdullah's photo, or an icon on their colour. */
export function Avatar({ player, className = "h-12 w-12", iconSize = 24 }: { player: Player; className?: string; iconSize?: number }) {
  if (player.kind === "owner") {
    return (
      <span className={`relative block shrink-0 overflow-hidden rounded-full bg-[#23272e] ${className}`}>
        <Image src={ABDULLAH_FACE} alt="" fill sizes="160px" className="object-cover" />
      </span>
    );
  }
  const Icon = player.kind === "spotter" ? Binoculars : player.kind === "guest" ? UserCircle : AVATAR_ICONS[player.icon ?? "target"];
  const a = ACCENTS[player.accent];
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 25%, rgb(${a.ink}), rgb(${a.rgb}) 55%, rgb(${a.rgb} / 0.6))`,
        color: `rgb(${a.on})`,
      }}
    >
      <Icon size={iconSize} weight="fill" />
    </span>
  );
}

/* ── Visitor accounts, kept on this device ─────────────────────────────── */

const ACCOUNTS_KEY = "am-console-accounts";
export const MAX_ACCOUNTS = 4;

const NAMES_A = ["Quiet", "Night", "Steady", "Golden", "Lucky", "Swift", "Patient", "Bright", "Calm", "Wild"];
const NAMES_B = ["Fletcher", "Archer", "Spotter", "Bowyer", "Shooter", "Pixel", "Builder", "Coder", "Arrow", "Scout"];
export const randomName = () =>
  `${NAMES_A[Math.floor(Math.random() * NAMES_A.length)]} ${NAMES_B[Math.floor(Math.random() * NAMES_B.length)]}`;

function readAccounts(): Player[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (p): p is Player =>
          p &&
          typeof p.id === "string" &&
          typeof p.name === "string" &&
          p.kind === "visitor" &&
          p.accent in ACCENTS &&
          (p.icon === undefined || p.icon in AVATAR_ICONS)
      )
      .slice(0, MAX_ACCOUNTS);
  } catch {
    return [];
  }
}

/**
 * Visitors can add a profile, the way a console lets anyone add a user: a
 * name, an icon and a colour. There is no sign-up and nothing leaves the
 * browser; the profile only holds their colour, their milestones and their
 * best score, and pre-fills the contact form with their name.
 */
export function useAccounts() {
  const [accounts, setAccounts] = useState<Player[]>([]);
  useEffect(() => setAccounts(readAccounts()), []);

  const write = (next: Player[]) => {
    try {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked: the profile lasts for this visit */
    }
    setAccounts(next);
  };

  const add = useCallback((name: string, icon: AvatarIcon, accent: AccentKey): Player | null => {
    const have = readAccounts();
    if (have.length >= MAX_ACCOUNTS) return null;
    const player: Player = {
      id: `v-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      kind: "visitor",
      name: name.trim().slice(0, 18) || randomName(),
      icon,
      accent,
    };
    write([...have, player]);
    return player;
  }, []);

  const remove = useCallback((id: string) => {
    write(readAccounts().filter((p) => p.id !== id));
    try {
      localStorage.removeItem(`am-console-milestones:${id}`);
      localStorage.removeItem(`am-console-best:${id}`);
    } catch {
      /* fine */
    }
  }, []);

  return { accounts, add, remove };
}

/* ── Best score in the game, per player ────────────────────────────────── */

/** Best practice score; 70 m is the main one and keeps the original key. */
const bestKey = (id: string, distance = 70) => (distance === 70 ? `am-console-best:${id}` : `am-console-best:${id}:${distance}`);

export function readBest(id: string, distance = 70): number {
  try {
    const n = parseInt(localStorage.getItem(bestKey(id, distance)) ?? "", 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Saves `score` if it beats the stored best. Returns true when it did. */
export function saveBest(id: string, score: number, distance = 70): boolean {
  if (score <= readBest(id, distance)) return false;
  try {
    localStorage.setItem(bestKey(id, distance), String(score));
  } catch {
    /* fine */
  }
  return true;
}
