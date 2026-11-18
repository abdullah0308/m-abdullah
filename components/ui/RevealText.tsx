"use client";

import { motion } from "framer-motion";
import { useSiteContent } from "@/context/SiteContext";
import { useCopy } from "@/lib/useCopy";
import { useReduceMotion } from "@/lib/useReduceMotion";
import EditableText from "./EditableText";
import { EASE } from "./Reveal";

/**
 * Headline text animation: each word rises out of its own mask, staggered,
 * every time the line comes into view (it resets when it leaves, so it
 * replays on the way back down).
 *
 * Reads its string from content by `path`, in the current narrator's voice,
 * and falls back to EditableText inside /admin so editing never fights the
 * split spans. Screen readers get the sentence once, not word by word.
 *
 * Pass `active` to drive it by hand instead of by scroll position (the hero
 * waits for the intro curtain that way).
 */
export default function RevealText({
  path,
  className = "",
  delay = 0,
  active,
}: {
  path: string;
  className?: string;
  delay?: number;
  active?: boolean;
}) {
  const { isEditing } = useSiteContent();
  const reduce = useReduceMotion();
  const text = useCopy(path);

  if (isEditing) return <EditableText path={path} className={className} />;

  const words = text.split(/\s+/).filter(Boolean);
  const manual = active !== undefined;

  return (
    <motion.span
      // a new narrator means new words: remount so they rise in again
      key={text}
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView={reduce || manual ? undefined : "show"}
      // reduced motion resolves a render after mount: force the words visible
      animate={reduce ? "still" : manual ? (active ? "show" : "hidden") : undefined}
      viewport={{ once: false, amount: 0.4 }}
    >
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} aria-hidden>
          {/* padding keeps commas and accents clear of the mask */}
          <span className="-my-[0.14em] inline-block overflow-hidden py-[0.14em] align-bottom">
            <motion.span
              className="inline-block"
              variants={{
                hidden: { y: "120%" },
                still: { y: "0%", transition: { duration: 0 } },
                show: { y: "0%", transition: { duration: 0.8, ease: EASE, delay: delay + i * 0.05 } },
              }}
            >
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </motion.span>
  );
}
