"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Hydration-safe replacement for framer-motion's `useReducedMotion`.
 *
 * The raw hook reads a media query, so it is `false` during server rendering
 * and `true` on the very first client render for a visitor who prefers reduced
 * motion. Components here branch on it, returning a plain element instead of
 * a `motion` one, or omitting an `initial` style, so that divergence made the
 * first client tree disagree with the server HTML, and React threw a hydration
 * mismatch (error #418) and re-rendered the whole page on the client.
 *
 * Deferring to `false` until after mount makes the first client render
 * identical to the server's. The real preference lands one render later, which
 * is early enough that no animation has played: reduced-motion visitors still
 * get static, fully visible content, without the mismatch.
 *
 * Use this everywhere instead of importing `useReducedMotion` directly.
 */
export function useReduceMotion(): boolean {
  const prefers = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return mounted && !!prefers;
}
