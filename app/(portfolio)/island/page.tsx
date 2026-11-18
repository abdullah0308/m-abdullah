import type { Metadata } from "next";
import IslandApp from "@/components/island/IslandApp";
import { SiteProvider } from "@/context/SiteContext";
import { getContent } from "@/lib/getContent";

/**
 * Golden Hour: the portfolio as an island you drive around. A local
 * experiment beside the console, not linked from it and not indexed.
 */
export const metadata: Metadata = {
  title: "Golden Hour",
  description: "The portfolio as an island you drive around.",
  robots: { index: false, follow: false },
};

export default async function Island() {
  const content = await getContent();
  return (
    <SiteProvider initialContent={content}>
      <IslandApp />
    </SiteProvider>
  );
}
