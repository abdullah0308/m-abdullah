"use client";

import { useEffect, useState } from "react";

/**
 * Which section currently owns the middle of the viewport. Shared by the nav
 * (active pill) and Flocon's companion (expression + line), so both always
 * agree about where the visitor is.
 *
 * The root margin collapses the observed band to a strip around 40% of the
 * viewport height, so exactly one section intersects at a time and there is no
 * tie-breaking to do.
 */
export function useActiveSection(ids: readonly string[], fallback = "top") {
  const [active, setActive] = useState(fallback);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-40% 0px -59% 0px" }
    );
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

export const SECTION_IDS = [
  "top",
  "about",
  "flocon",
  "process",
  "work",
  "skills",
  "archery",
  "contact",
] as const;
