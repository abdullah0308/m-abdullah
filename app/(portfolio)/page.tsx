import ConsoleApp from "@/components/console/ConsoleApp";
import { SiteProvider } from "@/context/SiteContext";
import { getContent } from "@/lib/getContent";

/**
 * The home page is the console: the portfolio staged as a game console's home
 * screen. It powers on, asks who is playing, then shows tiles along the top,
 * the focused one filling the screen, its cards underneath. A keyboard, a
 * mouse, touch or a real gamepad drives it.
 *
 * The two other versions (the poster site and the quiet desktop) are parked
 * in drafts/ and not built.
 */
export default async function Home() {
  const content = await getContent();

  return (
    <SiteProvider initialContent={content}>
      <div className="console">
        <ConsoleApp />
      </div>
    </SiteProvider>
  );
}
