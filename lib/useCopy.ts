"use client";

import { useSiteContent } from "@/context/SiteContext";
import { useVoice } from "@/context/VoiceContext";
import { CAT_COPY } from "@/lib/catCopy";
import { getPath } from "@/lib/contentUtils";

/**
 * The string at a content path, in the current narrator's voice. Flocon's
 * version wins when she is narrating and has one; inside /admin it is always
 * Abdullah's, because that is the copy being edited.
 */
export function useCopy(path: string): string {
  const { content, isEditing } = useSiteContent();
  const { isCat } = useVoice();
  if (isCat && !isEditing && CAT_COPY[path]) return CAT_COPY[path];
  return String(getPath(content as unknown as Record<string, unknown>, path) ?? "");
}

/**
 * The same lookup as a function, for components that read many paths (or
 * paths built in a loop), where one hook call per string is not possible.
 */
export function useCopyFn(): (path: string) => string {
  const { content, isEditing } = useSiteContent();
  const { isCat } = useVoice();
  return (path: string) => {
    if (isCat && !isEditing && CAT_COPY[path]) return CAT_COPY[path];
    return String(getPath(content as unknown as Record<string, unknown>, path) ?? "");
  };
}
