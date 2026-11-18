"use client";

import { useActiveSection } from "@/lib/useActiveSection";
import { Backdrop, Dock, MenuBar, QUIET_SECTIONS } from "./chrome";
import Desktop from "./Desktop";
import Hero from "./Hero";
import Work from "./Work";
import { About, Process, StackSection } from "./sections";
import { Archery, Contact, Footer } from "./rest";

/**
 * The quiet version of the portfolio, for comparison with the main one.
 *
 * Same content, different staging: a desk at night.
 *
 *   lg and up   an actual desktop (Desktop.tsx): one screen, no scrolling,
 *               every section a file that opens in a draggable window.
 *   below lg    the same windows stacked down a scrolling page, with the
 *               wallpaper changing behind them and the dock as navigation.
 *
 * Both are in the HTML and CSS picks one, so there is no flash while the
 * script works out the screen size, and the stacked copy is always there to
 * be read without a pointer.
 *
 * Flocon is not shown. She is here anyway:
 *   - the sticky note has to feed her twice
 *   - the terminal's last command was typed by her paws
 *   - paw prints cross the top of about.txt, and (desktop) the wallpaper
 *   - each project carries a review comment signed "F."
 *   - stack.json has a key she asked for
 *   - her ears show over the top of the mail window
 *   - now and then a column of falling code spells her name (desktop)
 *   - once per visit she pushes the window you are reading (desktop)
 *   - the accent colour is her eyes, the cursor is her paw, the colophon is "QA: F."
 *   - and the folder marked "do not open" has her photo in it (and a meow)
 */
export default function QuietSite() {
  const active = useActiveSection(QUIET_SECTIONS);

  return (
    <>
      <div className="lg:hidden">
        <Backdrop active={active} />
        <MenuBar active={active} />
        <div className="relative z-10">
          <Hero />
          <About />
          <Process />
          <Work />
          <StackSection />
          <Archery />
          <Contact />
          <Footer />
        </div>
        <Dock active={active} />
      </div>

      <div className="hidden lg:block">
        <Desktop />
      </div>
    </>
  );
}
