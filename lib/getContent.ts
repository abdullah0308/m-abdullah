import { getPayload } from "payload";
import config from "@payload-config";
import { mergeContent } from "@/lib/mergeContent";
import type { ContentData } from "@/lib/defaultContent";

/**
 * Saved content is deep-merged over the defaults rather than replacing them,
 * so a CMS record written against an older shape still renders every field the
 * current design asks for. A Payload failure (no database during static
 * export, for instance) falls through to the defaults.
 *
 * Server only. Both versions of the site read the same content through this.
 */
export async function getContent(): Promise<ContentData> {
  try {
    const payload = await getPayload({ config });
    const global = await payload.findGlobal({ slug: "site-content" });
    return mergeContent(global.data);
  } catch {
    return mergeContent(undefined);
  }
}
