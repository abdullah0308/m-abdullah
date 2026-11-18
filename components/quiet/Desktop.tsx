"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  ArrowUpRight,
  BracketsCurly,
  Crosshair,
  EnvelopeSimple,
  FileMd,
  FileText,
  Folder,
  ImageSquare,
  PawPrint,
  TerminalWindow,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { useSiteContent } from "@/context/SiteContext";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { meow, warmMeows } from "@/lib/meow";
import Logo from "@/components/layout/Logo";
import { EASE } from "@/components/ui/Reveal";
import { Backdrop, Clock } from "./chrome";
import CodeRain from "./CodeRain";
import { StickyNote, TerminalBody } from "./Hero";
import { AboutBody, Heading, PawPrints, ProcessList, StackBody } from "./sections";
import { WorkDetail, WorkFolders } from "./Work";
import { ArcheryNotes, Ears, MailForm, RangeSlider, SecretPhoto } from "./rest";

/* ── What can be opened ────────────────────────────────────────────────── */

const APPS = {
  terminal: { title: "abdullah: zsh", label: "Terminal", Icon: TerminalWindow, w: 440 },
  about: { title: "about.txt", label: "about.txt", Icon: FileText, w: 860 },
  process: { title: "process.md", label: "process.md", Icon: FileMd, w: 800 },
  work: { title: "work", label: "Work", Icon: Folder, w: 980 },
  stack: { title: "stack.json", label: "stack.json", Icon: BracketsCurly, w: 960 },
  archery: { title: "range", label: "Archery", Icon: ImageSquare, w: 820 },
  contact: { title: "New message", label: "Mail", Icon: EnvelopeSimple, w: 600 },
  secret: { title: "flocon.jpg", label: "do not open", Icon: Folder, w: 292 },
} as const;

type AppId = keyof typeof APPS;
const DOCK: AppId[] = ["terminal", "about", "process", "work", "stack", "archery", "contact"];
const MENU: { id: AppId; label: string }[] = [
  { id: "about", label: "About" },
  { id: "process", label: "Process" },
  { id: "work", label: "Work" },
  { id: "stack", label: "Stack" },
  { id: "archery", label: "Archery" },
  { id: "contact", label: "Contact" },
];
const ICONS: AppId[] = ["about", "process", "work", "stack", "archery", "contact", "terminal", "secret"];

interface Win {
  id: AppId;
  x: number;
  y: number;
  z: number;
}
type Handles = Map<AppId, { x: MotionValue<number>; y: MotionValue<number> }>;

/* ── A draggable window ────────────────────────────────────────────────── */

function DeskWindow({
  win,
  bounds,
  handles,
  onFocus,
  onClose,
  children,
}: {
  win: Win;
  bounds: RefObject<HTMLDivElement | null>;
  handles: RefObject<Handles>;
  onFocus: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const app = APPS[win.id];
  const reduce = useReduceMotion();
  const controls = useDragControls();
  const root = useRef<HTMLDivElement>(null);
  // Drag offsets. Kept as motion values so Flocon can push the window too.
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    const map = handles.current;
    map.set(win.id, { x, y });
    root.current?.focus({ preventScroll: true });
    return () => {
      map.delete(win.id);
    };
  }, [handles, win.id, x, y]);

  return (
    <motion.div
      ref={root}
      role="dialog"
      aria-label={app.label}
      tabIndex={-1}
      data-window={win.id}
      className="q-window pointer-events-auto absolute flex flex-col !bg-[rgb(15_18_16/0.9)] focus-visible:outline-none"
      style={{
        left: win.x,
        top: win.y,
        width: `min(${app.w}px, calc(100vw - 2rem))`,
        maxHeight: "calc(100dvh - 9rem)",
        zIndex: win.z,
        x,
        y,
      }}
      drag
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0.05}
      dragConstraints={bounds}
      onPointerDown={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
    >
      {win.id === "contact" && <Ears />}
      {win.id === "about" && <PawPrints />}

      {/* title bar: drag from here */}
      <div
        onPointerDown={(e) => controls.start(e)}
        data-grab=""
        className="flex h-9 shrink-0 touch-none select-none items-center gap-3 border-b border-white/10 px-3"
      >
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Close ${app.label}`}
          className="group grid h-5 w-5 place-items-center rounded-full border border-white/25 text-transparent transition-colors hover:border-transparent hover:bg-danger hover:text-ink focus-visible:text-content"
        >
          <X size={10} weight="bold" />
        </button>
        <span className="truncate font-mono text-xs text-muted">{app.title}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </motion.div>
  );
}

/* ── Window contents that need a little state or layout of their own ───── */

function WorkWindow() {
  const [open, setOpen] = useState(0);
  return (
    <div className="grid grid-cols-[13.5rem_1fr] gap-6 p-6">
      <WorkFolders open={open} onOpen={setOpen} columns="grid-cols-2 content-start" idPrefix="d-work" />
      <WorkDetail open={open} idPrefix="d-work" />
    </div>
  );
}

function ArcheryWindow() {
  return (
    <div className="grid grid-cols-[17rem_1fr] gap-7 p-6">
      <RangeSlider />
      <div>
        <p className="q-serif mb-6 text-5xl">
          Seventy <span className="italic text-accentInk">metres</span> of focus.
        </p>
        <ArcheryNotes />
      </div>
    </div>
  );
}

function ProcessWindow() {
  const { content } = useSiteContent();
  return (
    <div className="px-7 py-6">
      <Heading line={content.process.heading} className="!text-5xl" />
      <p className="mb-2 mt-3 text-muted">{content.process.subheading}</p>
      <ProcessList />
    </div>
  );
}

function body(id: AppId) {
  switch (id) {
    case "terminal":
      return (
        <div className="p-4">
          <TerminalBody />
        </div>
      );
    case "about":
      return (
        <div className="p-7">
          <AboutBody />
        </div>
      );
    case "process":
      return <ProcessWindow />;
    case "work":
      return <WorkWindow />;
    case "stack":
      return (
        <div className="p-7">
          <StackBody />
        </div>
      );
    case "archery":
      return <ArcheryWindow />;
    case "contact":
      return <MailForm id="d" />;
    case "secret":
      return (
        <div className="p-2">
          <SecretPhoto />
        </div>
      );
  }
}

/* ── Flocon, unseen ────────────────────────────────────────────────────── */

interface Trail {
  id: number;
  prints: { x: number; y: number; rot: number }[];
}

/**
 * Every so often a line of paw prints crosses the wallpaper, one print at a
 * time, and fades. They pass underneath the windows. She is not shown; this
 * is only where she has been.
 */
function PawTrail({ enabled }: { enabled: boolean }) {
  const [trails, setTrails] = useState<Trail[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let n = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const walk = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const fromLeft = Math.random() < 0.5;
      const slope = (Math.random() - 0.5) * 0.45;
      const y0 = H * (0.3 + Math.random() * 0.4);
      const steps = Math.max(8, Math.round(W / 150));
      const prints = Array.from({ length: steps }, (_, i) => {
        const along = ((i + 0.6) / steps) * W;
        return {
          x: fromLeft ? along : W - along,
          // alternate feet either side of the line of travel
          y: y0 + slope * along + (i % 2 ? 13 : -13),
          rot: (fromLeft ? 90 : -90) + (Math.atan(slope) * 180) / Math.PI * (fromLeft ? 1 : -1),
        };
      });
      const id = n++;
      setTrails((t) => [...t, { id, prints }]);
      timers.push(setTimeout(() => setTrails((t) => t.filter((tr) => tr.id !== id)), steps * 240 + 5600));
    };
    timers.push(setTimeout(walk, 6500));
    const every = setInterval(walk, 24000);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(every);
    };
  }, [enabled]);

  return (
    <div aria-hidden data-trail className="pointer-events-none absolute inset-0 z-[1]">
      {trails.map((trail) =>
        trail.prints.map((p, i) => (
          <span
            key={`${trail.id}-${i}`}
            className="q-print text-content"
            style={{ left: p.x, top: p.y, transform: `rotate(${p.rot}deg)`, animationDelay: `${i * 0.24}s` }}
          >
            <PawPrint size={20} weight="fill" />
          </span>
        ))
      )}
    </div>
  );
}

/* ── The desktop ───────────────────────────────────────────────────────── */

/** Shifts its children against the pointer, by up to about `depth` pixels. */
function Drift({
  sx,
  sy,
  depth,
  className,
  children,
}: {
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  depth: number;
  className?: string;
  children: ReactNode;
}) {
  const x = useTransform(sx, (v) => v * depth * 2);
  const y = useTransform(sy, (v) => v * depth * 2);
  return (
    <motion.span className={className} style={{ x, y }}>
      {children}
    </motion.span>
  );
}

const WORDS = [
  { text: "Built", className: "left-0 top-[9%]", italic: false },
  { text: "with", className: "left-[19%] top-[27%]", italic: true },
  { text: "aim.", className: "right-0 top-[33%]", italic: false },
];

/**
 * The quiet version on a large screen: an actual desktop.
 *
 * The wallpaper is Abdullah under a shaft of light, with code falling behind
 * him and three words set large across it. Everything else is a file: the
 * icons in the corner, the menu bar and the dock all open windows, which can
 * be dragged by their title bars, stacked, and closed (the first control in
 * the title bar, or Escape).
 *
 * Flocon is never on screen. She walks across the wallpaper when nobody is
 * looking, typed the last line in the terminal, and once per visit pushes
 * whichever window you are reading.
 */
export default function Desktop() {
  const { content } = useSiteContent();
  const { meta, hero } = content;
  const reduce = useReduceMotion();

  // Only do the live parts (windows, canvas, timers) when this layout is the
  // one on screen; below `lg` it is hidden by CSS and the stacked page shows.
  const [live, setLive] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setLive(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // The words drift a few pixels against the pointer, each at its own depth.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 60, damping: 18 });
  const sy = useSpring(py, { stiffness: 60, damping: 18 });

  const [wins, setWins] = useState<Win[]>([]);
  const [toast, setToast] = useState(false);
  const bounds = useRef<HTMLDivElement>(null);
  const handles = useRef<Handles>(new Map());
  const zTop = useRef(10);
  const cascade = useRef(0);
  const winsRef = useRef<Win[]>([]);
  winsRef.current = wins;
  const readingSince = useRef(0);
  const lastTouch = useRef(0);
  const pushed = useRef(false);

  const open = useCallback((id: AppId) => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const width = Math.min(APPS[id].w, W - 32);
    const z = ++zTop.current;
    let x: number;
    let y: number;
    if (id === "terminal") {
      x = 236;
      y = Math.max(40, H - 470);
    } else if (id === "secret") {
      x = Math.max(16, W - width - 190);
      y = Math.max(30, H - 600);
    } else {
      const k = cascade.current++ % 5;
      x = Math.max(8, (W - width) / 2 + (k - 2) * 30);
      y = 16 + k * 24;
      if (!readingSince.current) readingSince.current = Date.now();
    }
    setWins((prev) =>
      prev.some((w) => w.id === id) ? prev.map((w) => (w.id === id ? { ...w, z } : w)) : [...prev, { id, x, y, z }]
    );
    if (id === "secret") meow();
  }, []);

  const close = useCallback((id: AppId) => setWins((prev) => prev.filter((w) => w.id !== id)), []);

  // The terminal is already running when you arrive; a hash opens its window.
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => open("terminal"), 600);
    const hash = window.location.hash.slice(1);
    if (hash in APPS) open(hash as AppId);
    return () => clearTimeout(t);
  }, [live, open]);

  // Once per visit, a while after you have settled into a window, she pushes it.
  useEffect(() => {
    if (!live || reduce) return;
    const watch = setInterval(() => {
      if (pushed.current || !readingSince.current) return;
      const now = Date.now();
      if (now - readingSince.current < 15000 || now - lastTouch.current < 4000) return;
      const reading = winsRef.current.filter((w) => w.id !== "terminal" && w.id !== "secret");
      if (!reading.length) return;
      const top = reading.reduce((a, b) => (a.z > b.z ? a : b));
      const h = handles.current.get(top.id);
      if (!h) return;
      pushed.current = true;
      animate(h.x, h.x.get() + 28, { type: "spring", stiffness: 420, damping: 9 });
      animate(h.y, h.y.get() + 10, { type: "spring", stiffness: 420, damping: 12 });
      meow();
      setToast(true);
      setTimeout(() => setToast(false), 5200);
    }, 1000);
    return () => clearInterval(watch);
  }, [live, reduce]);

  const isOpen = (id: AppId) => wins.some((w) => w.id === id);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      onPointerDown={() => {
        lastTouch.current = Date.now();
      }}
      onPointerMove={(e) => {
        if (reduce) return;
        px.set(e.clientX / window.innerWidth - 0.5);
        py.set(e.clientY / window.innerHeight - 0.5);
      }}
    >
      <Backdrop active="top" />
      {live && <CodeRain className="absolute inset-0 z-0 h-full w-full opacity-60" />}
      <PawTrail enabled={live && !reduce} />

      {/* menu bar */}
      <header className="absolute inset-x-0 top-0 z-[60] border-b border-white/10 bg-[rgb(9_11_10/0.6)] backdrop-blur-md">
        <nav aria-label="Primary" className="flex h-10 items-center gap-5 px-5 text-[0.8rem]">
          <Logo className="h-5 w-5" />
          <ul className="flex items-center gap-5">
            {MENU.map(({ id, label }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => open(id)}
                  className={`transition-colors ${isOpen(id) ? "text-content" : "text-muted hover:text-content"}`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-5">
            <a href="/" className="text-muted underline decoration-white/20 underline-offset-4 transition-colors hover:text-content">
              Compare with Flocon&apos;s cut
            </a>
            <Clock />
          </div>
        </nav>
      </header>

      {/* the wallpaper's own furniture: words, note, pitch, icons */}
      <div className="absolute inset-x-8 bottom-24 top-14 z-[2]">
        <h1 className="sr-only">
          {meta.name}, {meta.role} in {meta.location}. Built with aim.
        </h1>
        <p aria-hidden className="q-serif text-[clamp(7rem,13.5vw,15rem)]">
          {WORDS.map((w, i) => (
            <Drift key={w.text} sx={sx} sy={sy} depth={-(14 + i * 9)} className={`absolute block ${w.className}`}>
              <motion.span
                className={`block ${w.italic ? "italic text-accentInk" : ""}`}
                initial={reduce ? false : { opacity: 0, y: 44 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 1.1, ease: EASE, delay: 0.15 + i * 0.16 }}
              >
                {w.text}
              </motion.span>
            </Drift>
          ))}
        </p>

        <div className="absolute right-[2%] top-[1%]">
          <StickyNote />
        </div>

        <div className="absolute bottom-0 right-0 max-w-[24rem]">
          <p className="text-lg leading-relaxed text-content/85">
            {hero.subtext} {hero.subtextHighlight}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <button
              type="button"
              onClick={() => open("work")}
              className="group flex items-center gap-2 rounded-full bg-accent py-3 pl-6 pr-4 font-medium text-onAccent transition-transform active:scale-[0.98]"
            >
              {hero.ctaWork}
              <ArrowUpRight size={16} weight="bold" className="transition-transform duration-500 ease-expo group-hover:rotate-45" />
            </button>
            <button
              type="button"
              onClick={() => open("contact")}
              className="text-sm underline decoration-white/25 decoration-1 underline-offset-[6px] transition-colors hover:decoration-accent"
            >
              Get in touch
            </button>
          </div>
          <p className="mt-5 text-sm text-muted">Everything here is a file. Open one, drag it around.</p>
        </div>

        {/* desktop icons */}
        <ul aria-label="Files on the desktop" className="absolute bottom-0 left-0 grid grid-cols-2 gap-x-1 gap-y-0.5">
          {ICONS.map((id) => {
            const { Icon, label } = APPS[id];
            return (
              <li key={id}>
                <button
                  type="button"
                  data-icon={id}
                  onClick={() => open(id)}
                  onPointerEnter={id === "secret" ? warmMeows : undefined}
                  onFocus={id === "secret" ? warmMeows : undefined}
                  className="flex w-[5.5rem] flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition-colors hover:bg-white/10"
                >
                  <Icon size={38} weight="fill" className={isOpen(id) ? "text-accentInk" : "text-content/80"} />
                  <span className="text-xs leading-tight text-content/85">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* how far a window may be dragged: never under the menu bar, but well
          off the sides and the bottom, as on a real desktop */}
      <div ref={bounds} aria-hidden className="pointer-events-none absolute -inset-x-[40%] -bottom-[60%] top-11" />

      {/* windows */}
      <div className="pointer-events-none absolute inset-x-2 bottom-[5.25rem] top-11 z-[20]">
        <AnimatePresence>
          {live &&
            wins.map((w) => (
              <DeskWindow
                key={w.id}
                win={w}
                bounds={bounds}
                handles={handles}
                onFocus={() => open(w.id)}
                onClose={() => close(w.id)}
              >
                {body(w.id)}
              </DeskWindow>
            ))}
        </AnimatePresence>
      </div>

      {/* the one time she makes herself known */}
      <AnimatePresence>
        {toast && (
          <motion.p
            key="toast"
            role="status"
            className="absolute bottom-24 left-1/2 z-[70] -translate-x-1/2 whitespace-nowrap rounded-full bg-content px-5 py-2.5 text-sm font-medium text-ink shadow-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            Something just pushed that window. It was not the wind.
          </motion.p>
        )}
      </AnimatePresence>

      {/* dock */}
      <nav
        aria-label="Dock"
        className="q-window absolute bottom-3 left-1/2 z-[60] flex -translate-x-1/2 items-end gap-1 !rounded-2xl p-1.5"
      >
        {DOCK.map((id) => {
          const { Icon, label } = APPS[id];
          const on = isOpen(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => open(id)}
              aria-label={`Open ${label}`}
              className={`group relative grid h-12 w-12 place-items-center rounded-xl transition-[transform,background-color] duration-300 ease-expo hover:-translate-y-1.5 hover:bg-white/10 ${
                on ? "text-accentInk" : "text-content"
              }`}
            >
              {id === "archery" ? <Crosshair size={22} /> : <Icon size={22} weight={on ? "fill" : "regular"} />}
              {on && <span aria-hidden className="absolute bottom-0.5 h-0.5 w-3 rounded-full bg-accent" />}
              <span className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded-md bg-content px-2 py-1 text-xs text-ink group-hover:block group-focus-visible:block">
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
