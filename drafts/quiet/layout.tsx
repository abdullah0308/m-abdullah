import type { Metadata } from "next";
import { Newsreader } from "next/font/google";

/**
 * The quiet version's display face. Declared here, not in the root layout,
 * so only this route preloads it.
 */
const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-serif",
  display: "swap",
});

// A second take on the same content, kept out of search results so the two
// versions never compete with each other.
export const metadata: Metadata = {
  title: "The quiet version",
  robots: { index: false, follow: false },
  alternates: { canonical: "/" },
};

export default function QuietLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${serif.variable} quiet`}>{children}</div>;
}
