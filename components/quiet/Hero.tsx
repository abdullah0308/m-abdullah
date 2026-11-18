"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSiteContent } from "@/context/SiteContext";
import { useReduceMotion } from "@/lib/useReduceMotion";
import ArrowButton from "@/components/ui/ArrowButton";
import { EASE } from "@/components/ui/Reveal";
import { Window } from "./chrome";

/**
 * What the terminal types. Lines starting with "$" are typed a key at a
 * time; the rest print at once, as output does. The last command is where
 * Flocon comes in: she is never on screen, but she has been on the keyboard.
 */
const SESSION = [
  "$ whoami",
  "abdullah. developer, metabox technology, mauritius.",
  '$ git commit -m "fix: tighter grouping"',
  "[main 4a1b40f] 3 files changed",
  "$ npm run buildddddjjjjjkkkk;;;;",
  "zsh: command not found",
  "# sorry. something just walked across the keyboard.",
];
const TOTAL = SESSION.reduce((n, l) => n + (l.startsWith("$") ? l.length : 1), 0);

export function TerminalBody() {
  const reduce = useReduceMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) {
      setStep(TOTAL);
      return;
    }
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      n += 1;
      setStep(n);
      if (n >= TOTAL) return;
      // which line are we in, and are we at its end? (a beat after each line)
      let left = n;
      let pause = 34;
      for (const line of SESSION) {
        const cost = line.startsWith("$") ? line.length : 1;
        if (left === cost) pause = line.startsWith("$") ? 420 : 260;
        if (left <= cost) break;
        left -= cost;
      }
      timer = setTimeout(next, pause);
    };
    timer = setTimeout(next, 1100);
    return () => clearTimeout(timer);
  }, [reduce]);

  // Turn the step count back into what is on screen.
  let left = step;
  const shown: string[] = [];
  for (const line of SESSION) {
    if (left <= 0) break;
    const cost = line.startsWith("$") ? line.length : 1;
    shown.push(line.startsWith("$") ? line.slice(0, Math.min(left, line.length)) : line);
    left -= cost;
  }

  return (
    <>
      {/* the whole session, once, for screen readers; the typing is decoration */}
      <p className="sr-only">{SESSION.join(" ")}</p>
      <pre aria-hidden className="min-h-[11.5rem] whitespace-pre-wrap break-words font-mono text-[0.78rem] leading-relaxed sm:text-[0.82rem]">
        {shown.map((line, i) => (
          <span
            key={i}
            className={`block ${
              line.startsWith("$") ? "text-content" : line.startsWith("#") ? "text-accentInk" : "text-muted"
            }`}
          >
            {line}
            {i === shown.length - 1 && <span className="q-caret ml-0.5 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] bg-content/80" />}
          </span>
        ))}
      </pre>
    </>
  );
}

function Terminal() {
  return (
    <Window title="abdullah: zsh" bodyClassName="p-4 sm:p-5">
      <TerminalBody />
    </Window>
  );
}

/** A note stuck to the screen. The second-to-last line is the first trace of the cat. */
export function StickyNote() {
  const items = [
    { text: "Ship the new site", done: true },
    { text: "70 m practice", done: true },
    { text: "Feed Flocon", done: true },
    { text: "Feed Flocon again (she insists)", done: false },
  ];
  return (
    <div className="w-52 rotate-2 rounded-sm bg-[#ece5a4] p-4 text-[0.82rem] leading-snug text-[#1b1c12] shadow-[0_18px_30px_-14px_rgba(0,0,0,0.7)]">
      <p className="font-semibold">To do</p>
      <ul className="mt-2 space-y-1">
        {items.map((it) => (
          <li key={it.text} className={it.done ? "text-[#1b1c12]/55 line-through" : ""}>
            {it.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

const WORDS = [
  { text: "Built", className: "lg:left-0 lg:top-[13%]", italic: false },
  { text: "with", className: "lg:left-[19%] lg:top-[30%]", italic: true },
  { text: "aim.", className: "lg:right-0 lg:top-[36%]", italic: false },
];

/**
 * The opening screen. Three words set large and scattered across the
 * wallpaper (Abdullah, under the light, is behind them), a terminal in the
 * lower left, a sticky note in the upper right, and the one-line pitch with
 * its buttons in the lower right. On phones the same pieces stack.
 */
export default function Hero() {
  const { content } = useSiteContent();
  const { meta, hero } = content;
  const reduce = useReduceMotion();

  return (
    <section id="top" className="relative px-4 pb-16 pt-24 sm:px-8 lg:min-h-[100dvh] lg:pb-28 lg:pt-16">
      <div className="relative mx-auto max-w-[1400px] lg:h-[calc(100dvh-11rem)] lg:min-h-[36rem]">
        <h1 className="sr-only">
          {meta.name}, {meta.role} in {meta.location}. Built with aim.
        </h1>

        {/* the three words */}
        <p aria-hidden className="q-serif text-[clamp(4.6rem,24vw,8rem)] lg:text-[clamp(7rem,13.5vw,15rem)]">
          {WORDS.map((w, i) => (
            <motion.span
              key={w.text}
              className={`block lg:absolute ${w.className} ${w.italic ? "pl-[0.5em] italic text-accentInk lg:pl-0" : ""}`}
              initial={reduce ? false : { opacity: 0, y: 44 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 1.1, ease: EASE, delay: 0.15 + i * 0.16 }}
            >
              {w.text}
            </motion.span>
          ))}
        </p>

        {/* the pitch */}
        <motion.div
          className="mt-8 max-w-[24rem] lg:absolute lg:bottom-0 lg:right-0 lg:mt-0"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.9, ease: EASE, delay: 0.7 }}
        >
          <p className="text-base leading-relaxed text-content/85 sm:text-lg">
            {hero.subtext} {hero.subtextHighlight}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ArrowButton href="#work">{hero.ctaWork}</ArrowButton>
            <a
              href="#contact"
              className="text-sm underline decoration-white/25 decoration-1 underline-offset-[6px] transition-colors hover:decoration-accent"
            >
              Get in touch
            </a>
          </div>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted">Based in</dt>
              <dd>{meta.location}</dd>
            </div>
            <div>
              <dt className="text-muted">Building at</dt>
              <dd>{meta.company}</dd>
            </div>
          </dl>
        </motion.div>

        {/* the terminal */}
        <motion.div
          className="mt-12 w-full max-w-[27rem] lg:absolute lg:bottom-0 lg:left-0 lg:mt-0"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.9, ease: EASE, delay: 0.55 }}
        >
          <Terminal />
        </motion.div>

        {/* the note */}
        <motion.div
          className="mt-10 lg:absolute lg:right-[2%] lg:top-[2%] lg:mt-0"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0 : 0.9, delay: 0.9 }}
        >
          <StickyNote />
        </motion.div>
      </div>
    </section>
  );
}
