"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { meow } from "@/lib/meow";

export type Voice = "human" | "cat";

/** Curtain timings, shared with VoiceCurtain so the swap lands while covered. */
export const CURTAIN_COVER_MS = 620;
export const CURTAIN_HOLD_MS = 780;

interface VoiceContextValue {
  /** Who is telling the page right now. */
  voice: Voice;
  isCat: boolean;
  /** Set while the curtain is up: the narrator being switched to. */
  pending: Voice | null;
  toggle: () => void;
  /** Hand the page to a narrator at once, with no curtain (the console's profile screen). */
  choose: (voice: Voice) => void;
  /** Pick a hard-coded string by narrator. */
  t: (human: string, cat: string) => string;
}

const VoiceContext = createContext<VoiceContextValue>({
  voice: "human",
  isCat: false,
  pending: null,
  toggle: () => {},
  choose: () => {},
  t: (human) => human,
});

export function useVoice() {
  return useContext(VoiceContext);
}

/**
 * The page has two narrators: Abdullah (the default, and what is in the HTML)
 * and Flocon. Switching raises a curtain, swaps the copy and the accent
 * colour behind it (`html[data-voice]`), and lowers it again. Under reduced
 * motion the swap is immediate.
 *
 * Every visit starts with Abdullah: the server markup is his version, so
 * restoring the cat's on load would mean rewriting the page after hydration.
 */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const [voice, setVoice] = useState<Voice>("human");
  const [pending, setPending] = useState<Voice | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busy = useRef(false);

  const apply = useCallback((next: Voice) => {
    setVoice(next);
    if (next === "cat") document.documentElement.setAttribute("data-voice", "cat");
    else document.documentElement.removeAttribute("data-voice");
  }, []);

  const toggle = useCallback(() => {
    if (busy.current) return;
    const next: Voice = voice === "human" ? "cat" : "human";
    if (next === "cat") meow();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(next);
      return;
    }
    busy.current = true;
    setPending(next);
    timers.current.push(
      setTimeout(() => apply(next), CURTAIN_COVER_MS),
      setTimeout(() => {
        setPending(null);
        busy.current = false;
      }, CURTAIN_COVER_MS + CURTAIN_HOLD_MS)
    );
  }, [voice, apply]);

  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  const isCat = voice === "cat";
  const t = useCallback((human: string, cat: string) => (isCat ? cat : human), [isCat]);

  return (
    <VoiceContext.Provider value={{ voice, isCat, pending, toggle, choose: apply, t }}>
      {children}
    </VoiceContext.Provider>
  );
}
