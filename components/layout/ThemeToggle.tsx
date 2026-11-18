"use client";

import { Moon, Sun } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-line2 bg-surface/80 text-content backdrop-blur transition-colors hover:bg-raised active:scale-95 ${className}`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={isDark ? "moon" : "sun"}
          initial={{ y: 18, opacity: 0, rotate: -40 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -18, opacity: 0, rotate: 40 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="grid place-items-center"
        >
          {isDark ? <Moon size={18} weight="bold" /> : <Sun size={18} weight="bold" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
