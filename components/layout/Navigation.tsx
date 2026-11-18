"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { NAV_LINKS } from "@/lib/defaultContent";
import { SECTION_IDS, useActiveSection } from "@/lib/useActiveSection";
import { FLOCON_POSES } from "@/components/flocon/assets";
import { EASE } from "@/components/ui/Reveal";
import ThemeToggle from "./ThemeToggle";
import VoiceSwitch from "./VoiceSwitch";
import Logo from "./Logo";

/**
 * A plain bar: the mark on the left, the six stops as text links (the current
 * one underlined in the accent), then the narrator switch, the theme toggle
 * and the one contact action. It is transparent over the hero and takes a
 * blurred backing once the page moves.
 *
 * Below lg the links move into a full-screen sheet set in the poster type.
 */
export default function Navigation() {
  const active = useActiveSection(SECTION_IDS);
  const admin = usePathname()?.startsWith("/admin") ?? false;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  // The sheet owns the viewport; scrolling the page behind it leaves you
  // somewhere unexpected when it closes.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-500 ${
          scrolled ? "border-line bg-ink/80 backdrop-blur-md" : "border-transparent"
        }`}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-[4.25rem] max-w-[1760px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-12"
        >
          <a href="#top" className="text-content" aria-label="Back to top">
            <Logo className="h-7 w-7" />
          </a>

          <ul className="hidden items-center gap-7 lg:flex">
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = active === href.slice(1);
              return (
                <li key={href}>
                  <a
                    href={href}
                    aria-current={isActive ? "true" : undefined}
                    className={`relative py-2 text-sm transition-colors ${
                      isActive ? "text-content" : "text-muted hover:text-content"
                    }`}
                  >
                    {label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-mark"
                        className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-accent"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            {!admin && <VoiceSwitch />}
            <ThemeToggle />
            <a
              href="#contact"
              className="hidden h-11 items-center gap-2 rounded-full bg-accent pl-5 pr-4 text-sm font-medium text-onAccent transition-transform active:scale-[0.98] md:inline-flex"
            >
              Get in touch
              <ArrowUpRight size={14} weight="bold" />
            </a>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="flex h-11 items-center gap-2.5 rounded-full border border-line2 bg-surface/80 px-4 text-sm text-content backdrop-blur lg:hidden"
            >
              Menu
              <span aria-hidden className="grid gap-[5px]">
                <span className="block h-px w-4 bg-current" />
                <span className="block h-px w-4 bg-current" />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-ink px-4 pb-8 sm:px-8"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="flex h-[4.25rem] shrink-0 items-center justify-between">
              <Logo className="h-7 w-7" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-11 items-center gap-2.5 rounded-full border border-line2 px-4 text-sm"
              >
                Close
                <span aria-hidden className="relative block h-4 w-4">
                  <span className="absolute left-0 top-1/2 block h-px w-4 rotate-45 bg-current" />
                  <span className="absolute left-0 top-1/2 block h-px w-4 -rotate-45 bg-current" />
                </span>
              </button>
            </div>

            <ul className="mt-6">
              {[...NAV_LINKS, { label: "Get in touch", href: "#contact" }].map(({ label, href }, i) => (
                <li key={href} className="overflow-hidden">
                  <motion.a
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`mega block py-[0.06em] text-[clamp(2.9rem,15.5vw,6rem)] ${
                      href === "#contact" ? "ink-accent" : "text-content"
                    }`}
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{ delay: 0.18 + i * 0.05, duration: 0.6, ease: EASE }}
                  >
                    {label}
                  </motion.a>
                </li>
              ))}
            </ul>

            {/* Flocon at the bottom edge of the sheet, half out of frame. */}
            <div aria-hidden className="pointer-events-none absolute -bottom-24 right-4 w-36">
              <Image src={FLOCON_POSES.q34.src} alt="" width={FLOCON_POSES.q34.w} height={FLOCON_POSES.q34.h} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
