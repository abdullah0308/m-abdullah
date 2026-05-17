import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#00A7E1",
          light: "#48ACF0",
          dark: "#1D4E89",
          muted: "#163A6A",
        },
        charcoal: {
          DEFAULT: "#1A1A1A",
          light: "#2A2A2A",
          mid: "#111111",
          deep: "#000000",
        },
        surface: "#0B1520",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "bounce-slow": "bounce 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
