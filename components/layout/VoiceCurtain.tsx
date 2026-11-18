"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CURTAIN_COVER_MS, useVoice } from "@/context/VoiceContext";
import Face from "@/components/ui/Face";
import { EASE } from "@/components/ui/Reveal";

/**
 * The page changing hands. When the narrator is switched a curtain in the
 * incoming narrator's colour rises from the bottom, the copy and accent swap
 * behind it, and it carries on up and away. Colours are literal, not tokens:
 * the curtain announces the palette the page is about to take.
 */
export default function VoiceCurtain() {
  const { pending, isCat } = useVoice();
  const toCat = pending === "cat";

  return (
    <>
      <AnimatePresence>
        {pending && (
          <motion.div
            key="voice-curtain"
            aria-hidden
            className="fixed inset-0 z-[85] flex flex-col items-center justify-center gap-5 px-6 text-center text-[#14170a]"
            style={{ background: toCat ? "rgb(166 184 82)" : "rgb(234 145 64)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: CURTAIN_COVER_MS / 1000, ease: EASE }}
          >
            <Face
              who={toCat ? "flocon" : "abdullah"}
              face="neutral"
              className="h-24 w-24 sm:h-32 sm:w-32"
              sizes="128px"
            />
            <p className="mega text-[clamp(3.4rem,14vw,12rem)]">{toCat ? "Flocon's cut" : "Abdullah's cut"}</p>
            <p className="max-w-[28ch] text-base font-medium sm:text-lg">
              {toCat ? "Fine. I will tell it myself." : "Thank you, Flocon. I will take it from here."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <p role="status" className="sr-only">
        {isCat ? "This page is now told by Flocon, the cat." : ""}
      </p>
    </>
  );
}
