"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Crosshair,
  EnvelopeSimple,
  FolderOpen,
  House,
  Path,
  Stack,
  User,
} from "@phosphor-icons/react/dist/ssr";
import { useSiteContent } from "@/context/SiteContext";
import Logo from "@/components/layout/Logo";

export const QUIET_SECTIONS = ["top", "about", "process", "work", "stack", "archery", "contact"] as const;

export const LINKS = [
  { id: "top", label: "Home", Icon: House },
  { id: "about", label: "About", Icon: User },
  { id: "process", label: "Process", Icon: Path },
  { id: "work", label: "Work", Icon: FolderOpen },
  { id: "stack", label: "Stack", Icon: Stack },
  { id: "archery", label: "Archery", Icon: Crosshair },
  { id: "contact", label: "Contact", Icon: EnvelopeSimple },
] as const;

/**
 * The wallpaper. It is fixed behind everything and changes with the section
 * in view: Abdullah under a shaft of light to open, his desk while the page
 * talks about how he works, bare dark behind the work and the tools, the
 * range at night for the sport, and bare dark again for the ask. Layers crossfade;
 * nothing else about them moves.
 */
export function Backdrop({ active }: { active: string }) {
  const { content } = useSiteContent();
  const portrait = active === "top" ? 1 : 0;
  const desk = active === "about" || active === "process" ? 0.38 : 0;
  const range = active === "archery" ? 1 : 0;
  const layer = "absolute inset-0 transition-opacity duration-[1100ms] ease-out";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* the desk */}
      <div className={layer} style={{ opacity: desk }}>
        <Image src={content.about.photo} alt="" fill sizes="100vw" className="object-cover blur-[2px]" />
        <div className="absolute inset-0 bg-[rgb(9_11_10/0.55)]" />
      </div>

      {/* the range */}
      <div className={layer} style={{ opacity: range }}>
        <Image src={content.archery.backdrop} alt="" fill sizes="100vw" className="object-cover object-[30%_62%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgb(9_11_10/0.92)] via-[rgb(9_11_10/0.42)] to-[rgb(9_11_10/0.6)]" />
      </div>

      {/* the shaft of light, always on, a little stronger behind the portrait */}
      <div
        className="absolute left-[14%] top-[-28%] h-[150%] w-[46%] rotate-[24deg] blur-3xl transition-opacity duration-[1100ms] sm:left-[22%]"
        style={{
          opacity: active === "archery" ? 0 : portrait ? 1 : 0.45,
          background:
            "linear-gradient(to bottom, rgb(255 255 255 / 0.2), rgb(255 255 255 / 0.07) 45%, transparent 80%)",
        }}
      />

      {/* Abdullah */}
      <div className={layer} style={{ opacity: portrait }}>
        <Image
          src={content.hero.portrait}
          alt=""
          width={834}
          height={1400}
          priority
          sizes="(max-width: 640px) 80vw, 40vw"
          className="absolute bottom-0 left-[64%] h-[66dvh] w-auto max-w-none -translate-x-1/2 brightness-[0.62] sm:left-[56%] sm:h-[86dvh] sm:brightness-90"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, #000 70%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, #000 70%, transparent 100%)",
          }}
        />
      </div>

      {/* a vignette so windows and type always sit on something dark enough */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 40%, rgb(9 11 10 / 0.7) 100%)" }}
      />
    </div>
  );
}

/** The time on Abdullah's side of the world, as a desktop clock would show it. */
export function Clock() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Indian/Mauritius",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, []);

  // Rendered only after mount: the server cannot know the visitor's "now".
  return (
    <span className="tabular-nums text-muted" title="Local time in Mauritius">
      {now ? `Mauritius, ${now}` : " "}
    </span>
  );
}

/** The bar across the top of the screen: the mark, the sections, the clock. */
export function MenuBar({ active }: { active: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[rgb(9_11_10/0.6)] backdrop-blur-md">
      <nav aria-label="Primary" className="mx-auto flex h-10 max-w-[1400px] items-center gap-5 px-4 text-[0.8rem] sm:px-6">
        <a href="#top" aria-label="Back to top" className="text-content">
          <Logo className="h-5 w-5" />
        </a>
        <ul className="hidden items-center gap-5 md:flex">
          {LINKS.slice(1).map(({ id, label }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={active === id ? "true" : undefined}
                className={`transition-colors ${active === id ? "text-content" : "text-muted hover:text-content"}`}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-5">
          <a href="/" className="text-muted underline decoration-white/20 underline-offset-4 transition-colors hover:text-content">
            Compare with Flocon&apos;s cut
          </a>
          <span className="hidden sm:inline">
            <Clock />
          </span>
        </div>
      </nav>
    </header>
  );
}

/**
 * The dock: the same seven stops as icons, pinned to the bottom edge where a
 * thumb can reach them. It is the navigation on phones, where the menu bar
 * has no room for links.
 */
export function Dock({ active }: { active: string }) {
  return (
    <nav
      aria-label="Sections"
      className="q-window fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-end gap-0.5 !rounded-2xl p-1.5 sm:gap-1"
    >
      {LINKS.map(({ id, label, Icon }) => {
        const on = active === id;
        return (
          <a
            key={id}
            href={`#${id}`}
            aria-label={label}
            aria-current={on ? "true" : undefined}
            className={`group relative grid h-10 w-10 place-items-center rounded-xl transition-[transform,background-color,color] duration-300 ease-expo hover:-translate-y-1 hover:bg-white/10 sm:h-11 sm:w-11 ${
              on ? "bg-white/10 text-accentInk" : "text-content"
            }`}
          >
            <Icon size={20} weight={on ? "fill" : "regular"} />
            <span className="pointer-events-none absolute -top-8 hidden whitespace-nowrap rounded-md bg-content px-2 py-1 text-xs text-ink group-hover:block group-focus-visible:block">
              {label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}

/** A window on the desk: a title bar with a file name, then whatever is in it. */
export function Window({
  title,
  children,
  className = "",
  bodyClassName = "p-5 sm:p-8",
}: {
  title: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`q-window relative ${className}`}>
      <div className="flex h-9 items-center gap-3 border-b border-white/10 px-4">
        <span aria-hidden className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-white/25" />
          <span className="h-2.5 w-2.5 rounded-full border border-white/25" />
          <span className="h-2.5 w-2.5 rounded-full border border-white/25" />
        </span>
        <span className="truncate font-mono text-xs text-muted">{title}</span>
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
