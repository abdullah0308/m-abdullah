"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Folder, FolderOpen } from "@phosphor-icons/react/dist/ssr";
import { useSiteContent } from "@/context/SiteContext";
import { useReduceMotion } from "@/lib/useReduceMotion";
import Reveal from "@/components/ui/Reveal";
import { Window } from "./chrome";
import { Heading } from "./sections";

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** The projects as folders. `columns` sets the grid at each size. */
export function WorkFolders({
  open,
  onOpen,
  columns = "grid-cols-2 sm:grid-cols-4",
  idPrefix = "q-work",
}: {
  open: number;
  onOpen: (i: number) => void;
  columns?: string;
  idPrefix?: string;
}) {
  const { content } = useSiteContent();

  return (
    <ul role="tablist" aria-label="Projects" className={`grid gap-2 ${columns}`}>
      {content.work.shots.map((s, i) => {
        const on = i === open;
        const Icon = on ? FolderOpen : Folder;
        return (
          <li key={s.number} role="presentation">
            <button
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${i}`}
              aria-selected={on}
              aria-controls={`${idPrefix}-panel`}
              onClick={() => onOpen(i)}
              className={`flex w-full flex-col items-center gap-2 rounded-xl px-2 py-3.5 text-center transition-colors ${
                on ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <Icon size={46} weight="fill" className={on ? "text-accentInk" : "text-content/70"} />
              <span className={`text-sm leading-tight ${on ? "text-content" : "text-muted"}`}>{s.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One open project: the picture, what it was, what it taught. Flocon's
 * review survives only as a code comment signed "F.".
 */
export function WorkDetail({ open, idPrefix = "q-work" }: { open: number; idPrefix?: string }) {
  const { content } = useSiteContent();
  const reduce = useReduceMotion();
  const shot = content.work.shots[open] ?? content.work.shots[0];

  return (
    <div id={`${idPrefix}-panel`} role="tabpanel" aria-labelledby={`${idPrefix}-tab-${open}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={open}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduce ? 0 : 0.3 }}
        >
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-surface">
            <Image
              src={shot.image}
              alt={`${shot.name}, representative screen`}
              fill
              sizes="(max-width: 1024px) 100vw, 640px"
              className="object-cover"
            />
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="q-serif text-3xl sm:text-4xl">{shot.name}</h3>
              <p className="mt-1 text-sm text-muted">{shot.type}</p>
              <p className="mt-4 leading-relaxed text-content/85">{shot.description}</p>
            </div>
            <div>
              <p className="q-serif text-2xl italic">What it taught me</p>
              <p className="mt-2 leading-relaxed text-muted">{shot.adjustment}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {shot.tags.map((tag) => (
                  <li key={tag} className="rounded-full border border-white/20 px-3 py-1 text-sm text-muted">
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 border-t border-white/10 pt-4 font-mono text-[0.8rem] leading-relaxed text-accentInk">
            {"// QA, F.: "}
            {shot.review}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** The stacked page's work section: folders, then the open one in a window. */
export default function Work() {
  const { content } = useSiteContent();
  const { work } = content;
  const [open, setOpen] = useState(0);
  const shot = work.shots[open] ?? work.shots[0];

  return (
    <section id="work" className="relative px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <Heading line={work.heading} />
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">{work.subheading}</p>
        </Reveal>
        <Reveal className="mt-10">
          <WorkFolders open={open} onOpen={setOpen} />
        </Reveal>
        <Reveal delay={0.1} className="mt-6">
          <Window title={`work/${slug(shot.name)}`}>
            <WorkDetail open={open} />
          </Window>
        </Reveal>
      </div>
    </section>
  );
}
