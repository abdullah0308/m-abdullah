"use client";

import { useSiteContent } from "@/context/SiteContext";
import { useVoice } from "@/context/VoiceContext";
import { HUMAN_NOTES } from "@/lib/catCopy";
import type { FloconFace } from "@/components/flocon/assets";
import EditableText from "./EditableText";
import Face from "./Face";

/**
 * A note in the margin from whoever is not narrating. In Abdullah's version
 * Flocon comments on each section (content.companion, editable in /admin);
 * in Flocon's cut the roles swap and Abdullah gets the margin.
 */
export default function MarginNote({
  section,
  face = "neutral",
  className = "",
}: {
  section: string;
  face?: FloconFace;
  className?: string;
}) {
  const { isEditing } = useSiteContent();
  const { isCat } = useVoice();
  const swapped = isCat && !isEditing && !!HUMAN_NOTES[section];

  return (
    <aside className={`flex max-w-[24rem] items-start gap-3 ${className}`}>
      <Face who={swapped ? "abdullah" : "flocon"} face={face} className="h-11 w-11" sizes="44px" />
      <p className="text-[0.95rem] leading-snug text-content">
        <span className="mb-0.5 block font-mono text-[0.7rem] text-note">
          {swapped ? "Abdullah, in the margin" : "Flocon, in the margin"}
        </span>
        {swapped ? HUMAN_NOTES[section] : <EditableText path={`companion.${section}`} />}
      </p>
    </aside>
  );
}
