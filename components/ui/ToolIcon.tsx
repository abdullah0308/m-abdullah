import {
  siCloudflare,
  siCss,
  siFigma,
  siFramer,
  siGit,
  siHtml5,
  siJavascript,
  siNextdotjs,
  siPayloadcms,
  siPostgresql,
  siReact,
  siTailwindcss,
  siTypescript,
  siVercel,
  siWordpress,
} from "simple-icons";
import { Gauge, PersonArmsSpread } from "@phosphor-icons/react/dist/ssr";

type Brand = { path: string; hex: string; title: string };

/** Real brand marks from Simple Icons, keyed by the names used in content. */
const BRANDS: Record<string, Brand> = {
  "Next.js": siNextdotjs,
  React: siReact,
  TypeScript: siTypescript,
  JavaScript: siJavascript,
  "Tailwind CSS": siTailwindcss,
  CSS: siCss,
  HTML: siHtml5,
  "Framer Motion": siFramer,
  "Payload CMS": siPayloadcms,
  WordPress: siWordpress,
  PostgreSQL: siPostgresql,
  Cloudflare: siCloudflare,
  Vercel: siVercel,
  Figma: siFigma,
  Git: siGit,
};

/** Practices with no brand get a Phosphor glyph instead. */
const PRACTICES: Record<string, typeof Gauge> = {
  Performance: Gauge,
  Accessibility: PersonArmsSpread,
};

// Marks that are black (or near it) in the brand palette would vanish on the
// dark panels; they render in the current text colour instead.
const MONO = new Set(["Next.js", "Payload CMS", "Vercel", "Framer Motion", "WordPress"]);

export default function ToolIcon({
  name,
  size = 24,
  tinted = true,
}: {
  name: string;
  size?: number;
  tinted?: boolean;
}) {
  const brand = BRANDS[name];
  if (brand) {
    const fill = tinted && !MONO.has(name) ? `#${brand.hex}` : "currentColor";
    return (
      <svg role="img" aria-label={name} viewBox="0 0 24 24" width={size} height={size} fill={fill}>
        <path d={brand.path} />
      </svg>
    );
  }
  const Glyph = PRACTICES[name] ?? Gauge;
  return <Glyph size={size} weight="bold" aria-label={name} />;
}

export const ALL_TOOLS = Object.keys(BRANDS);
