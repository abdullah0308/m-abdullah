import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import MeetFlocon from "@/components/sections/MeetFlocon";
import Process from "@/components/sections/Process";
import Work from "@/components/sections/Work";
import Skills from "@/components/sections/Skills";
import Archery from "@/components/sections/Archery";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/layout/Footer";
import FloconCompanion from "@/components/flocon/FloconCompanion";
import { SiteProvider } from "@/context/SiteContext";
import { getContent } from "@/lib/getContent";

/**
 * The journey, in order: who Abdullah is, who Flocon is, how the work gets
 * thought through, the work itself, the tools, the sport, the ask. Flocon's
 * companion rides along in the corner; the narrator switch in the header
 * hands the whole page to her.
 */
export default async function Home() {
  const content = await getContent();

  return (
    <SiteProvider initialContent={content}>
      <Hero />
      <About />
      <MeetFlocon />
      <Process />
      <Work />
      <Skills />
      <Archery />
      <Contact />
      <Footer />
      <FloconCompanion />
    </SiteProvider>
  );
}
