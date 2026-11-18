import type { Config } from "tailwindcss";

/**
 * Every colour resolves through a CSS variable in app/globals.css, so one
 * utility renders correctly in both themes and inside `.stage` panels, which
 * redefine the variables locally. `<alpha-value>` keeps `text-content/60`
 * working against a variable-backed colour.
 *
 *   ink        page background
 *   surface    card fill
 *   raised     one step above surface (hover, wells)
 *   content    primary text
 *   muted      secondary text, >= 4.5:1 on ink in both themes
 *   accent     ginger fill: CTAs, active nav, highlights
 *   accentInk  ginger as text (darker in light mode for contrast)
 *   eye        Flocon's green, reserved for Flocon
 *   note       margin notes: the colour of whoever is not narrating
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--bg-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        raised: "rgb(var(--raised-rgb) / <alpha-value>)",
        content: "rgb(var(--content-rgb) / <alpha-value>)",
        muted: "rgb(var(--muted-rgb) / <alpha-value>)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        accentInk: "rgb(var(--accent-ink-rgb) / <alpha-value>)",
        onAccent: "rgb(var(--on-accent-rgb) / <alpha-value>)",
        eye: "rgb(var(--eye-rgb) / <alpha-value>)",
        note: "rgb(var(--note-rgb) / <alpha-value>)",
        danger: "rgb(var(--danger-rgb) / <alpha-value>)",
        // Alpha is baked in from --line-alpha, so these skip the `/n` modifier.
        line: "rgb(var(--line-rgb) / var(--line-alpha))",
        line2: "rgb(var(--line-rgb) / var(--line-strong))",
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Fluid poster steps for .mega headings: min / preferred / max.
        m1: ["clamp(3.1rem, 12vw, 11.5rem)", { lineHeight: "0.86" }],
        m2: ["clamp(2.6rem, 8.4vw, 7.5rem)", { lineHeight: "0.88" }],
        m3: ["clamp(2rem, 5.2vw, 4.5rem)", { lineHeight: "0.9" }],
      },
      transitionTimingFunction: {
        expo: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
