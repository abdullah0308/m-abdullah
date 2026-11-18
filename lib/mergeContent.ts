import { defaultContent, type ContentData } from "@/lib/defaultContent";

type Dict = Record<string, unknown>;

const isPlainObject = (v: unknown): v is Dict =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Deep-merges saved CMS values over the defaults.
 *
 * Objects merge key by key so a content shape that predates a new field still
 * renders, the missing key falls through to its default instead of becoming
 * `undefined` in the middle of a heading.
 *
 * A saved array keeps its own length and order (merging by index would
 * resurrect deleted items: drop a project from four to three and index 3 would
 * reappear from defaults). But each saved item that has an identity key
 * (`number`, `step`, `face`, `title`) is merged over the default item with the
 * same key, so items saved before a field existed (a project's image or
 * Flocon's review, a step's distance) still get it. Matching by identity, not
 * position, means a reordered or trimmed list never borrows another item's
 * fields. An empty saved array is treated as "not set": that only comes from
 * a bad write, and an empty Work section is worse than the defaults.
 */
const ID_KEYS = ["number", "step", "face", "title"] as const;

function matchDefault(baseItems: unknown[], item: Dict): Dict | undefined {
  for (const key of ID_KEYS) {
    if (!(key in item)) continue;
    const hit = baseItems.find((b) => isPlainObject(b) && b[key] === item[key]);
    if (hit) return hit as Dict;
  }
  return undefined;
}

function deepMerge<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) {
    if (!Array.isArray(override) || override.length === 0) return base;
    return override.map((item) => {
      if (!isPlainObject(item)) return item;
      const match = matchDefault(base, item);
      return match ? deepMerge(match, item) : item;
    }) as unknown as T;
  }

  if (isPlainObject(base)) {
    if (!isPlainObject(override)) return base;
    const out: Dict = { ...(base as unknown as Dict) };
    for (const key of Object.keys(base as unknown as Dict)) {
      if (key in override) {
        out[key] = deepMerge((base as unknown as Dict)[key], override[key]);
      }
    }
    return out as unknown as T;
  }

  // Primitives: take the override only when it is actually present and of a
  // usable type. An empty string is allowed, clearing a field is intentional.
  if (override === undefined || override === null) return base;
  if (typeof override !== typeof base) return base;
  return override as T;
}

export function mergeContent(saved: unknown): ContentData {
  const base = structuredClone(defaultContent) as unknown as ContentData;
  if (!isPlainObject(saved)) return base;
  return deepMerge(base, saved);
}
