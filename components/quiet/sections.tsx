"use client";

import Image from "next/image";
import { METABOX_LOGO } from "@/lib/defaultContent";
import { motion } from "framer-motion";
import { PawPrint } from "@phosphor-icons/react/dist/ssr";
import { useSiteContent } from "@/context/SiteContext";
import { useReduceMotion } from "@/lib/useReduceMotion";
import Reveal from "@/components/ui/Reveal";
import ToolIcon from "@/components/ui/ToolIcon";
import { Window } from "./chrome";

/*
  The contents of each window, written once and used twice: stacked down the
  page on phones (the section components at the bottom of this file), and
  inside draggable windows on the desktop (Desktop.tsx).
*/

/** Section heading in the display serif: a roman line, then an italic one. */
export function Heading({ line, accent, className = "" }: { line: string; accent?: string; className?: string }) {
  return (
    <h2 className={`q-serif text-[clamp(2.6rem,6.2vw,5.6rem)] ${className}`}>
      {line}
      {accent && (
        <>
          {" "}
          <span className="italic text-accentInk">{accent}</span>
        </>
      )}
    </h2>
  );
}

// Five prints crossing the top of a window, left foot, right foot.
const PRINTS = [
  { right: "34%", top: "-0.9rem", rot: 62 },
  { right: "27%", top: "0.6rem", rot: 74 },
  { right: "19%", top: "-0.7rem", rot: 66 },
  { right: "12%", top: "0.9rem", rot: 80 },
  { right: "4%", top: "-0.4rem", rot: 70 },
];

/** Paw prints across a window's title bar: something has walked over it. */
export function PawPrints() {
  const reduce = useReduceMotion();
  return (
    <div aria-hidden data-paws className="pointer-events-none absolute inset-x-0 top-0 h-9">
      {PRINTS.map((p, i) => (
        <motion.span
          key={i}
          className="absolute text-content"
          style={{ right: p.right, top: p.top, rotate: p.rot }}
          initial={reduce ? false : { opacity: 0 }}
          whileInView={reduce ? undefined : { opacity: 0.2 }}
          animate={reduce ? { opacity: 0.2 } : undefined}
          viewport={{ once: false, amount: 0.6 }}
          transition={{ duration: 0.4, delay: reduce ? 0 : 0.5 + i * 0.22 }}
        >
          <PawPrint size={17} weight="fill" />
        </motion.span>
      ))}
    </div>
  );
}

/** about.txt: the two-line statement, the paragraphs, the company, the verbs. */
export function AboutBody() {
  const { content } = useSiteContent();
  const { about, meta } = content;

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-7">
        <Heading line={about.heading} accent={about.headingHighlight} className="!text-[clamp(2.1rem,3.6vw,3.4rem)]" />
        <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-content/85">{about.body1}</p>
      </div>
      <div className="lg:col-span-5 lg:pt-2">
        <p className="leading-relaxed text-muted">{about.body2}</p>
        <div className="mt-7">
          <p className="text-sm text-muted">Currently building at</p>
          <Image src={METABOX_LOGO.white} alt={meta.company} width={678} height={178} className="mt-3 h-10 w-auto" />
        </div>
        <ul className="mt-6 flex flex-wrap gap-2">
          {about.values.map((v) => (
            <li key={v} className="rounded-full border border-white/20 px-4 py-1.5 text-sm">
              {v}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** process.md: five steps, each with its distance down the range. */
export function ProcessList() {
  const { content } = useSiteContent();

  return (
    <ol>
      {content.process.steps.map((s) => (
        <li
          key={s.step}
          className="grid gap-x-8 gap-y-1 border-b border-white/10 py-5 last:border-b-0 sm:grid-cols-[4.5rem_10rem_1fr] sm:items-baseline"
        >
          <span className="font-mono text-sm text-accentInk">{s.distance}</span>
          <h3 className="q-serif text-3xl italic">{s.phase}</h3>
          <p className="max-w-[58ch] leading-relaxed text-muted">{s.description}</p>
        </li>
      ))}
    </ol>
  );
}

/** stack.json: four groups of tools. The last key was not Abdullah's idea. */
export function StackBody() {
  const { content } = useSiteContent();

  return (
    <>
      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {content.skills.groups.map((g) => (
          <div key={g.title}>
            <h3 className="q-serif text-3xl italic">{g.title}</h3>
            <p className="mt-1 text-sm text-muted">{g.note}</p>
            <ul data-tools className="mt-5 space-y-4">
              {g.items.map((it) => (
                <li key={it.name} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-content">
                    <ToolIcon name={it.name} size={18} />
                  </span>
                  <span>
                    <span className="block font-medium leading-tight">{it.name}</span>
                    <span className="block text-sm text-muted">{it.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-9 border-t border-white/10 pt-5 font-mono text-[0.8rem] text-muted">
        <span className="text-content">&quot;tuna_opener&quot;</span>: null{" "}
        <span className="text-accentInk">{"// requested by F. Repeatedly."}</span>
      </p>
    </>
  );
}

/* ── The stacked page (phones and tablets) ─────────────────────────────── */

export function About() {
  return (
    <section id="about" className="relative px-4 py-20 sm:px-8">
      <Reveal className="mx-auto max-w-[1180px]">
        <Window title="about.txt">
          <PawPrints />
          <AboutBody />
        </Window>
      </Reveal>
    </section>
  );
}

export function Process() {
  const { content } = useSiteContent();
  const { process } = content;

  return (
    <section id="process" className="relative px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <Heading line={process.heading} />
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">{process.subheading}</p>
        </Reveal>
        <Reveal delay={0.1} className="mt-10">
          <Window title="process.md" bodyClassName="px-5 py-2 sm:px-8">
            <ProcessList />
          </Window>
        </Reveal>
      </div>
    </section>
  );
}

export function StackSection() {
  const { content } = useSiteContent();
  const { skills } = content;

  return (
    <section id="stack" className="relative px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <Heading line={skills.heading} />
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">{skills.subheading}</p>
        </Reveal>
        <Reveal delay={0.1} className="mt-10">
          <Window title="stack.json">
            <StackBody />
          </Window>
        </Reveal>
      </div>
    </section>
  );
}
