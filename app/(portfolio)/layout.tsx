import type { Metadata } from "next";
import { Inter, Space_Grotesk, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import "../globals.css";
import CustomCursor from "@/components/layout/CustomCursor";
import Navigation from "@/components/layout/Navigation";
import FloatingParticles from "@/components/layout/FloatingParticles";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700"],
});

const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Abdullah Mohamed · Always Calibrating",
  description: "I don't aim for perfect. I aim for better.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", type: "image/x-icon" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} ${playfair.variable}`}>
      <body className="bg-charcoal-deep text-white antialiased">
        <FloatingParticles />
        <CustomCursor />
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  );
}
