"use client";

import { createContext, useContext } from "react";

/**
 * `ready` flips once the intro curtain starts to lift (or straight after
 * mount when the intro is skipped). The hero holds its entrance until then,
 * so the headline rises as the curtain leaves instead of playing unseen
 * behind it.
 */
export const IntroContext = createContext<{ ready: boolean }>({ ready: true });

export function useIntro() {
  return useContext(IntroContext);
}
