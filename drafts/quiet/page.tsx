import QuietSite from "@/components/quiet/QuietSite";
import { SiteProvider } from "@/context/SiteContext";
import { getContent } from "@/lib/getContent";

/**
 * The quiet version: the same content as the home page, staged as a desk at
 * night. Flocon is never shown here; she only leaves traces.
 */
export default async function Quiet() {
  const content = await getContent();

  return (
    <SiteProvider initialContent={content}>
      <QuietSite />
    </SiteProvider>
  );
}
