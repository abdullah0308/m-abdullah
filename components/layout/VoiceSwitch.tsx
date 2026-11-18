"use client";

import { motion } from "framer-motion";
import { useVoice } from "@/context/VoiceContext";
import { warmMeows } from "@/lib/meow";
import Face from "@/components/ui/Face";

/**
 * Who is telling the page: Abdullah or Flocon. Two portraits in a pill; the
 * ring slides to whoever has the floor. One control, so it is a switch
 * ("Flocon narrates": off / on) rather than two buttons.
 */
export default function VoiceSwitch({ className = "" }: { className?: string }) {
  const { isCat, toggle } = useVoice();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isCat}
      aria-label="Let Flocon the cat tell this page"
      onClick={toggle}
      onPointerEnter={warmMeows}
      onFocus={warmMeows}
      className={`group flex h-11 items-center gap-2 rounded-full border border-line2 bg-surface/80 pl-1.5 pr-1.5 text-sm text-content backdrop-blur transition-colors hover:bg-raised active:scale-[0.98] xl:pr-4 ${className}`}
    >
      <span className="flex items-center gap-1">
        {(["abdullah", "flocon"] as const).map((who) => {
          const on = (who === "flocon") === isCat;
          return (
            <span key={who} className="relative grid h-8 w-8 place-items-center">
              {on && (
                <motion.span
                  layoutId="voice-ring"
                  className="absolute inset-0 rounded-full border-2 border-accent"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Face
                who={who}
                className={`h-6 w-6 transition-opacity duration-300 ${on ? "" : "opacity-45 group-hover:opacity-80"}`}
                sizes="24px"
              />
            </span>
          );
        })}
      </span>
      <span className="hidden whitespace-nowrap xl:inline">
        <span className="text-muted">Told by </span>
        {isCat ? "Flocon" : "Abdullah"}
      </span>
    </button>
  );
}
