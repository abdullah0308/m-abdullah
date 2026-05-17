import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Process from "@/components/sections/Process";
import Work from "@/components/sections/Work";
import Archery from "@/components/sections/Archery";
import Contact from "@/components/sections/Contact";
import { SiteProvider } from "@/context/SiteContext";
import { defaultContent } from "@/lib/defaultContent";
import type { ContentData } from "@/lib/defaultContent";
import { getPayload } from "payload";
import config from "@payload-config";

async function getContent(): Promise<ContentData> {
  try {
    const payload = await getPayload({ config });
    const global = await payload.findGlobal({ slug: "site-content" });
    return (global.data as ContentData) ?? defaultContent;
  } catch {
    return defaultContent;
  }
}

export default async function Home() {
  const content = await getContent();

  return (
    <SiteProvider initialContent={content}>
      <Hero />
      <About />
      <Process />
      <Work />
      <Archery />
      <Contact />
    </SiteProvider>
  );
}
