"use client";

import Image from "next/image";
import { METABOX_LOGO } from "@/lib/defaultContent";
import {
  ArrowUpRight,
  Binoculars,
  Crosshair,
  EnvelopeSimple,
  GameController,
  LinkedinLogo,
  PaperPlaneTilt,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import type { ComponentType } from "react";
import { useSiteContent } from "@/context/SiteContext";
import { getPath } from "@/lib/contentUtils";
import { ABDULLAH_FACE } from "@/components/ui/Face";
import ToolIcon from "@/components/ui/ToolIcon";
import { Avatar, SPOTTER } from "./players";

/* ── The data: what is on the home screen ──────────────────────────────── */

type IconType = ComponentType<{ size?: number; weight?: "regular" | "bold" | "fill" }>;

export type Card =
  | { kind: "text"; id: string; title: string; body: string }
  | { kind: "stat"; id: string; value: string; label: string }
  | { kind: "tools"; id: string; title: string; note: string; items: { name: string; detail: string }[] }
  | { kind: "tags"; id: string; title: string; tags: string[] }
  | { kind: "image"; id: string; title: string; src: string; alt: string }
  | { kind: "take"; id: string; title: string; body: string }
  | { kind: "company"; id: string; title: string; name: string; logo: string }
  | { kind: "step"; id: string; distance: string; title: string; body: string }
  | { kind: "controls"; id: string; title: string; rows: [string, string][] }
  | { kind: "link"; id: string; title: string; label: string; href: string; icon: IconType; external?: boolean }
  | { kind: "action"; id: string; title: string; body: string; icon: IconType; modal: "mail" | "game" };

export interface Tile {
  id: string;
  /** Name under the tile. */
  label: string;
  kicker: string;
  title: string;
  blurb: string;
  /** Full-screen art: a photo to cover the screen, one to sit on the right, a cut-out figure, or the tool marks. */
  art: { mode: "cover" | "side" | "figure" | "tools" | "scope"; src?: string; pos?: string };
  /** The square on the row: a crop of a photo, or an icon. */
  thumb: { src: string; pos?: string } | { icon: IconType };
  cards: Card[];
}

export type Narrator = "abdullah" | "spotter";

/**
 * The Spotter's telling. Abdullah's version is the site content (and the
 * CMS); when the Spotter is the player, the home screen is told by them
 * instead: a friend talking about him. Anything not here keeps his words.
 */
const SPOTTER_TILES: Record<string, { kicker?: string; title?: string; blurb?: string }> = {
  about: {
    kicker: "My friend",
    title: "He reads the manual. Twice.",
    blurb:
      "I have known Abdullah long enough to know he will not ship anything until he understands why it works. Curious enough to start, patient enough to get it right. His words. Accurate.",
  },
  skills: { title: "What he reaches for.", blurb: "His toolbox. I asked to borrow a hammer once. He sent me a link to the docs." },
  process: {
    title: "Five steps. I have watched all of them.",
    blurb: "Same five steps on the range and at the desk. I stand behind him with the scope and call where it landed. He adjusts.",
  },
  contact: {
    title: "Need a website? He is the one to ask.",
    blurb:
      "He and the team at MetaBox Technology build corporate sites, shops and web apps. I can vouch for him. You will have to take my word for who I am.",
  },
  game: { kicker: "I'll spot for you", blurb: "Your turn on the line. Seventy metres, six arrows, and the wind changes every time. I will call where each one lands." },
  archery: { blurb: "Seventy metres, one arrow at a time. He shoots, I spot, then we argue about the wind." },
  spotter: {
    kicker: "That's me",
    title: "Name: classified.",
    blurb:
      "I'm a friend of Abdullah's. On the range I stand behind him with a spotting scope and call where each arrow lands. I do the same with his websites. That is all you are getting.",
  },
};

/** The Spotter's word on each project, by project number. */
const SPOTTER_TAKES: Record<string, string> = {
  "01": "I tried to break the checkout. Twice. It held both times.",
  "02": "Clean, organised, fast. He will explain content modelling if you let him. Do not let him.",
  "03": "He built an app to log his arrows, then made me log mine. My groupings are now on record.",
  "04": "Several languages, one site, no broken menus. I checked the one I can read.",
};

/**
 * Everything on the home screen, in two tabs, built from the same content the
 * other versions use. `Work` is who he is and what he has built; `Play` is
 * the game, the sport, and the friend.
 */
export function useTiles(narrator: Narrator, best: number): { work: Tile[]; play: Tile[] } {
  const { content } = useSiteContent();
  const { meta, hero, about, work, skills, process, archery, contact } = content;
  const spotter = narrator === "spotter";
  const c = (path: string) => String(getPath(content as unknown as Record<string, unknown>, path) ?? "");
  const t = (mine: string, theirs: string) => (spotter ? theirs : mine);
  const voiced = (tile: Tile): Tile => (spotter && SPOTTER_TILES[tile.id] ? { ...tile, ...SPOTTER_TILES[tile.id] } : tile);

  const takeCard = (number: string): Card[] =>
    SPOTTER_TAKES[number] ? [{ kind: "take", id: "take", title: t("The Spotter's take", "My take"), body: SPOTTER_TAKES[number] }] : [];

  const projects: Tile[] = work.shots.map((shot, i) => ({
    id: `work-${i}`,
    label: shot.name,
    kicker: shot.type,
    title: shot.name,
    blurb: c(`work.shots.${i}.description`),
    art: { mode: "cover", src: shot.image },
    thumb: { src: shot.image },
    cards: [
      { kind: "text", id: "lesson", title: t("What it taught me", "What it taught him"), body: shot.adjustment },
      { kind: "tags", id: "stack", title: "Built with", tags: shot.tags },
      ...takeCard(shot.number),
      { kind: "image", id: "screen", title: "Screen", src: shot.image, alt: `${shot.name}, representative screen` },
    ],
  }));

  const workTiles: Tile[] = [
    {
      id: "about",
      label: "About",
      kicker: "Player one",
      title: c("about.heading"),
      blurb: `${c("about.headingHighlight")} ${c("about.body1")}`,
      art: { mode: "figure", src: hero.portrait },
      thumb: { src: ABDULLAH_FACE },
      cards: [
        { kind: "text", id: "how", title: t("How I work", "How he works"), body: c("about.body2") },
        { kind: "company", id: "company", title: t("Currently building at", "He currently works at"), name: meta.company, logo: METABOX_LOGO.white },
        ...hero.stats.map((s, i): Card => ({ kind: "stat", id: `stat-${i}`, value: s.value, label: s.label })),
        { kind: "tags", id: "values", title: "On repeat", tags: about.values },
      ],
    },
    ...projects,
    {
      id: "skills",
      label: "Toolbox",
      kicker: "Toolbox",
      title: c("skills.heading"),
      blurb: c("skills.subheading"),
      art: { mode: "tools" },
      thumb: { icon: Wrench },
      cards: skills.groups.map((g): Card => ({ kind: "tools", id: g.title, title: g.title, note: g.note, items: g.items })),
    },
    {
      id: "process",
      label: "Process",
      kicker: "Five steps, seventy metres",
      title: c("process.heading"),
      blurb: c("process.subheading"),
      art: { mode: "side", src: archery.imageRight, pos: "50% 40%" },
      thumb: { src: archery.imageRight, pos: "70% 42%" },
      cards: process.steps.map((s, i): Card => ({
        kind: "step",
        id: s.step,
        distance: s.distance,
        title: s.phase,
        body: c(`process.steps.${i}.description`),
      })),
    },
    {
      id: "contact",
      label: "Contact",
      kicker: meta.company,
      title: `${c("contact.heading")} ${c("contact.headingHighlight")}`,
      blurb: c("contact.body"),
      art: { mode: "side", src: archery.imageThird, pos: "50% 30%" },
      thumb: { icon: EnvelopeSimple },
      cards: [
        { kind: "action", id: "mail", title: "Write a message", body: contact.formNote, icon: PaperPlaneTilt, modal: "mail" },
        { kind: "link", id: "email", title: "Email", label: meta.email, href: `mailto:${meta.email}`, icon: EnvelopeSimple },
        { kind: "link", id: "linkedin", title: "LinkedIn", label: meta.name, href: meta.linkedin, icon: LinkedinLogo, external: true },
      ],
    },
  ];

  const playTiles: Tile[] = [
    {
      id: "game",
      label: "70 m",
      kicker: "Game",
      title: "70 m",
      blurb:
        "An archery game made for a controller. Aim with the stick, draw with the trigger, hold your breath, read the windsock, let go. Practise at 18, 50 or 70 m, take on the Spotter, or pass the pad to a friend.",
      art: { mode: "cover", src: archery.imageRight, pos: "62% 50%" },
      thumb: { icon: GameController },
      cards: [
        { kind: "action", id: "play", title: "Play", body: "Practice, a match, or two players.", icon: Crosshair, modal: "game" },
        ...(best > 0 ? [{ kind: "stat", id: "best", value: `${best}`, label: "Your best at 70 m" } as Card] : []),
        {
          kind: "controls",
          id: "pad",
          title: "With a controller",
          rows: [
            ["Left stick", "Aim"],
            ["Right trigger", "Draw, let go to shoot"],
            ["Left trigger", "Hold your breath"],
            ["East button", "Game menu"],
          ],
        },
        {
          kind: "controls",
          id: "keys",
          title: "With a keyboard",
          rows: [
            ["Arrows or WASD", "Aim"],
            ["Space", "Draw, let go to shoot"],
            ["Shift", "Hold your breath"],
            ["Esc", "Game menu"],
          ],
        },
        {
          kind: "take",
          id: "tip",
          title: t("The Spotter's tip", "My tip"),
          body: "Watch the wind flag before you draw, not after. And do not hold at full draw for long: your arms will start to shake.",
        },
      ],
    },
    {
      id: "archery",
      label: "Archery",
      kicker: "Beyond the screen",
      title: c("archery.heading"),
      blurb: c("archery.quote"),
      art: { mode: "side", src: archery.backdrop, pos: "30% 58%" },
      thumb: { src: archery.backdrop, pos: "28% 62%" },
      cards: [
        { kind: "text", id: "why", title: "Why it matters", body: c("archery.quoteBody") },
        ...archery.stats.map((s, i): Card => ({ kind: "stat", id: `stat-${i}`, value: s.value, label: s.label })),
        { kind: "image", id: "line", title: "On the line", src: archery.imageThird, alt: "Abdullah on the shooting line at night, bow in hand" },
        { kind: "image", id: "field", title: "The field", src: archery.imageRight, alt: "Looking down the arrow at the targets across the field" },
      ],
    },
    {
      id: "spotter",
      label: "The Spotter",
      kicker: "Player two",
      title: "The Spotter.",
      blurb:
        "A friend. In archery the spotter watches through the scope and calls where every arrow landed. They do the same for my work. Who are they? They would rather not say.",
      // the targets, seen through a spotting scope: the Spotter is never shown
      art: { mode: "scope", src: archery.imageRight, pos: "64% 36%" },
      thumb: { icon: Binoculars },
      cards: [
        {
          kind: "text",
          id: "job",
          title: "The job",
          body: "Stand behind the archer, eye on the scope, call the shot: score, clock position, what the wind did. Short, honest, every time.",
        },
        { kind: "stat", id: "identity", value: "???", label: "Name, on the record" },
        {
          kind: "text",
          id: "why",
          title: "Why a spotter",
          body: "Every shot is better with someone saying where it really landed. That goes for websites too.",
        },
        { kind: "take", id: "hello", title: t("A word from them", "A word from me"), body: "Pick me on the player screen and I will tell you about him myself." },
      ],
    },
  ];

  return { work: workTiles.map(voiced), play: playTiles.map(voiced) };
}

/* ── How a card looks in the row ───────────────────────────────────────── */

const cardTitle = "font-display text-lg font-semibold leading-tight";

export function CardFace({ card }: { card: Card }) {
  switch (card.kind) {
    case "text":
      return (
        <>
          <h3 className={cardTitle}>{card.title}</h3>
          <p className="mt-2 line-clamp-5 text-sm leading-relaxed text-content/75">{card.body}</p>
        </>
      );
    case "stat":
      return (
        <div className="flex h-full flex-col justify-end">
          <p className="mega text-[3.4rem] leading-[0.85]">{card.value}</p>
          <p className="mt-2 text-sm text-content/75">{card.label}</p>
        </div>
      );
    case "tools":
      return (
        <>
          <h3 className={cardTitle}>{card.title}</h3>
          <ul className="mt-3 space-y-1.5">
            {card.items.map((it) => (
              <li key={it.name} className="flex items-center gap-2.5 text-sm">
                <ToolIcon name={it.name} size={16} />
                {it.name}
              </li>
            ))}
          </ul>
        </>
      );
    case "tags":
      return (
        <>
          <h3 className={cardTitle}>{card.title}</h3>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {card.tags.map((tag) => (
              <li key={tag} className="rounded-full border border-white/25 px-3 py-1 text-sm">
                {tag}
              </li>
            ))}
          </ul>
        </>
      );
    case "image":
      return (
        <>
          <Image src={card.src} alt={card.alt} fill sizes="320px" className="object-cover" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-sm font-medium">
            {card.title}
          </span>
        </>
      );
    case "take":
      return (
        <>
          <div className="flex items-center gap-3">
            <Avatar player={SPOTTER} className="h-10 w-10" iconSize={20} />
            <h3 className={cardTitle}>{card.title}</h3>
          </div>
          <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-content/80">{card.body}</p>
        </>
      );
    case "company":
      return (
        <div className="flex h-full flex-col justify-between">
          <span className="block text-sm text-content/70">{card.title}</span>
          {/* MetaBox's own white logo, which carries the name */}
          <Image src={card.logo} alt={card.name} width={678} height={178} className="h-auto w-full" />
        </div>
      );
    case "step":
      return (
        <>
          <p className="font-mono text-sm text-accentInk">{card.distance}</p>
          <h3 className="mega mt-1 text-[2.1rem]">{card.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-content/75">{card.body}</p>
        </>
      );
    case "controls":
      return (
        <>
          <h3 className={cardTitle}>{card.title}</h3>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {card.rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium">{k}</dt>
                <dd className="text-content/70">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      );
    case "link": {
      const Icon = card.icon;
      return (
        <div className="flex h-full flex-col justify-between">
          <span className="flex items-center justify-between">
            <Icon size={28} weight="fill" />
            <ArrowUpRight size={18} weight="bold" />
          </span>
          <p>
            <span className="block text-sm text-content/70">{card.title}</span>
            <span className="block break-all font-display text-lg font-semibold leading-tight">{card.label}</span>
          </p>
        </div>
      );
    }
    case "action": {
      const Icon = card.icon;
      return (
        <div className="flex h-full flex-col justify-between">
          <Icon size={30} weight="fill" />
          <div>
            <h3 className={cardTitle}>{card.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm opacity-80">{card.body}</p>
          </div>
        </div>
      );
    }
  }
}

/** Width of a card in the row, by what it holds. */
export function cardWidth(card: Card): string {
  switch (card.kind) {
    case "stat":
      return "w-[11rem]";
    case "text":
    case "take":
    case "step":
    case "controls":
      return "w-[19rem]";
    default:
      return "w-[15rem]";
  }
}

/* ── How a card looks opened up ────────────────────────────────────────── */

export function CardDetail({ card }: { card: Card }) {
  switch (card.kind) {
    case "image":
      return (
        <div className="relative aspect-[14/9] w-full overflow-hidden rounded-xl bg-black">
          <Image src={card.src} alt={card.alt} fill sizes="(max-width: 900px) 100vw, 880px" className="object-contain" />
        </div>
      );
    case "tools":
      return (
        <div>
          <h3 className="mega text-m3">{card.title}</h3>
          <p className="mt-2 text-content/70">{card.note}</p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {card.items.map((it) => (
              <li key={it.name} className="flex items-start gap-3">
                <span className="mt-1">
                  <ToolIcon name={it.name} size={22} />
                </span>
                <span>
                  <span className="block text-lg font-medium leading-tight">{it.name}</span>
                  <span className="block text-content/70">{it.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "stat":
      return (
        <div className="py-6 text-center">
          <p className="mega text-[clamp(6rem,22vw,12rem)]">{card.value}</p>
          <p className="mt-3 text-xl text-content/75">{card.label}</p>
        </div>
      );
    case "step":
      return (
        <div>
          <p className="font-mono text-accentInk">{card.distance}</p>
          <h3 className="mega mt-2 text-m2">{card.title}</h3>
          <p className="mt-5 max-w-[46ch] text-xl leading-relaxed text-content/85">{card.body}</p>
        </div>
      );
    case "take":
      return (
        <div className="flex items-start gap-5">
          <Avatar player={SPOTTER} className="h-20 w-20" iconSize={40} />
          <div>
            <h3 className="font-display text-2xl font-semibold">{card.title}</h3>
            <p className="mt-3 max-w-[44ch] text-xl leading-relaxed text-content/85">{card.body}</p>
          </div>
        </div>
      );
    case "controls":
      return (
        <div>
          <h3 className="mega text-m3">{card.title}</h3>
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-lg">
            {card.rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-medium">{k}</dt>
                <dd className="text-content/75">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      );
    case "text":
      return (
        <div>
          <h3 className="mega text-m3">{card.title}</h3>
          <p className="mt-5 max-w-[50ch] text-xl leading-relaxed text-content/85">{card.body}</p>
        </div>
      );
    default:
      return (
        <div className="min-h-[9rem]">
          <CardFace card={card} />
        </div>
      );
  }
}
