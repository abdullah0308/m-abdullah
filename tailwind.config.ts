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
          DEFAULT: "#50E8F4",
          light: "#C7F8FE",
          dark: "#027a82",
          muted: "#014d55",
        },
        charcoal: {
          DEFAULT: "#001a1f",
          light: "#002226",
          mid: "#001215",
          deep: "#001619",
        },
        surface: "#001f24",
        teal: {
          glow: "#50E8F4",
          ice: "#C7F8FE",
          abyss: "#001619",
        },
      },
      fontFamily: {
        sans:    ["var(--font-langits)", "var(--font-yapari)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        title:   ["var(--font-after)", "var(--font-space-grotesk)", "system-ui", "sans-serif"],
        mono:    ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "bounce-slow": "bounce 2s infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
