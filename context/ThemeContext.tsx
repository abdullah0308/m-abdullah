"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "am-theme";
export const DEFAULT_THEME: Theme = "dark";
export const INTRO_SEEN_KEY = "am-seen";

/**
 * Runs before first paint (inlined in the layout head) so a visitor who chose
 * light never sees the dark palette flash in first. Kept as a string because
 * it is serialised into a <script> tag and cannot close over this module.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  var d = document.documentElement;
  try {
    var t = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (t !== 'dark' && t !== 'light') t = '${DEFAULT_THEME}';
    d.setAttribute('data-theme', t);
  } catch (e) {
    d.setAttribute('data-theme', '${DEFAULT_THEME}');
  }
  // The intro curtain plays once per tab; CSS hides it when this is set.
  try {
    if (sessionStorage.getItem('${INTRO_SEEN_KEY}')) d.setAttribute('data-seen', '');
  } catch (e) {}
})();
`;

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  isDark: true,
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Starts on the default so server and client markup agree; the effect
  // reconciles with storage on the first tick. The inline script has already
  // painted the right palette, so nothing visibly changes.
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    let stored: Theme = DEFAULT_THEME;
    try {
      const v = localStorage.getItem(THEME_STORAGE_KEY);
      if (v === "dark" || v === "light") stored = v;
    } catch {
      /* private mode */
    }
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
    // Colour transitions switch on only after mount, so first paint is instant.
    const raf = requestAnimationFrame(() =>
      document.documentElement.classList.add("theme-ready")
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* the choice just will not persist */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === "dark", toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
