"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "@/context/ThemeContext";
import { VoiceProvider } from "@/context/VoiceContext";
import { IntroContext } from "@/context/IntroContext";
import ScrollProgress from "@/components/motion/ScrollProgress";
import Navigation from "@/components/layout/Navigation";
import IntroCurtain from "@/components/layout/IntroCurtain";
import VoiceCurtain from "@/components/layout/VoiceCurtain";

/**
 * Client boundary for the whole site. The root layout stays a server
 * component (metadata, JSON-LD); `children` passes through as a prop, so page
 * content still renders on the server.
 *
 * The z-index contract, in one place:
 *   1   grain overlay (body::after)
 *   10  page content and footer
 *   30  work preview that follows the pointer
 *   40  Flocon companion (mounted by the page, inside the content provider)
 *   50  header
 *   60  scroll progress
 *   70  menu sheet
 *   80  skip link
 *   85  narrator curtain
 *   90  intro curtain
 */
export default function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const admin = pathname.startsWith("/admin");
  // The home page is the console: one full-screen app with its own players
  // and narration; it takes nothing from the poster site's chrome. Only the
  // editor still uses that chrome. (The poster and quiet versions are parked
  // in drafts/.)
  const consoleApp = !admin;
  const [ready, setReady] = useState(false);
  const lift = useCallback(() => setReady(true), []);

  // No intro in the editor: the page is ready as soon as it mounts.
  useEffect(() => {
    if (admin) setReady(true);
  }, [admin]);

  if (consoleApp) {
    return (
      <ThemeProvider>
        <main id="main">{children}</main>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <VoiceProvider>
        <IntroContext.Provider value={{ ready }}>
          {!admin && <IntroCurtain onLift={lift} />}
          <ScrollProgress />
          <Navigation />

          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-full focus:bg-content focus:px-4 focus:py-2 focus:text-sm focus:text-ink"
          >
            Skip to content
          </a>

          <main id="main" className="relative z-10">
            {children}
          </main>

          <VoiceCurtain />
        </IntroContext.Provider>
      </VoiceProvider>
    </ThemeProvider>
  );
}
