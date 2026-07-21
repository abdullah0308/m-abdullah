import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "../globals.css";
import CustomCursor from "@/components/layout/CustomCursor";
import Navigation from "@/components/layout/Navigation";
import WebGLBackground from "@/components/layout/WebGLBackground";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const geistMono = localFont({
  src: "../fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

const afterFont = localFont({
  src: "../fonts/after-regular.otf",
  variable: "--font-after",
});

const yapariFont = localFont({
  src: [
    { path: "../fonts/YapariTrial-ExtraLight.ttf", weight: "200", style: "normal" },
    { path: "../fonts/YapariTrial-Light.ttf",      weight: "300", style: "normal" },
    { path: "../fonts/YapariTrial-Regular.ttf",    weight: "400", style: "normal" },
    { path: "../fonts/YapariTrial-Medium.ttf",     weight: "500", style: "normal" },
    { path: "../fonts/YapariTrial-SemiBold.ttf",   weight: "600", style: "normal" },
    { path: "../fonts/YapariTrial-Bold.ttf",       weight: "700", style: "normal" },
  ],
  variable: "--font-yapari",
});

const langitsFont = localFont({
  src: "../fonts/langits.otf",
  variable: "--font-langits",
});

const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "https://abdullahmohamed.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Abdullah Mohamed — Web Developer in Mauritius",
    template: "%s | Abdullah Mohamed",
  },
  description:
    "Abdullah Mohamed is a web developer based in Mauritius, building fast, modern websites and web applications with Next.js, React, and Tailwind CSS. Available for projects.",

  keywords: [
    "web developer mauritius",
    "website developer mauritius",
    "web developer",
    "website developer",
    "Abdullah Mohamed",
    "Abdullah",
    "frontend developer mauritius",
    "Next.js developer mauritius",
    "React developer mauritius",
    "freelance web developer mauritius",
    "web design mauritius",
    "UI developer mauritius",
    "MetaBox Technology",
    "portfolio",
    "javascript developer mauritius",
  ],

  authors: [{ name: "Abdullah Mohamed", url: SITE_URL }],
  creator: "Abdullah Mohamed",
  publisher: "Abdullah Mohamed",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_MU",
    url: SITE_URL,
    siteName: "Abdullah Mohamed — Web Developer",
    title: "Abdullah Mohamed — Web Developer in Mauritius",
    description:
      "Web developer based in Mauritius. I build fast, modern websites and web applications with Next.js, React, and Tailwind CSS.",
    images: [
      {
        url: "/images/og-image.jpeg",
        width: 1200,
        height: 630,
        alt: "Abdullah Mohamed — Web Developer in Mauritius",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Abdullah Mohamed — Web Developer in Mauritius",
    description:
      "Web developer based in Mauritius. I build fast, modern websites and web applications with Next.js, React, and Tailwind CSS.",
    images: ["/images/og-image.jpeg"],
  },

  // Favicon source of truth: public/favicon.svg — swap it and run `npm run favicons`
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48 32x32 16x16", type: "image/x-icon" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${geistMono.variable} ${afterFont.variable} ${yapariFont.variable} ${langitsFont.variable}`}
    >
      <body className="bg-charcoal-deep text-white antialiased">
        <Script
          id="posthog-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="Ji Yi init fn mn Ur pn bn cn capture calculateEventProperties Sn register register_once register_for_session unregister unregister_for_session Tn getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync Mn identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty Cn xn createPersonProfile setInternalOrTestUser In hn Pn opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing debug Vr Rt getPageViewId captureTraceFeedback captureTraceMetric an".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('phc_wrMXTC9DkxZmd3MejeZEc7NYia5oPWUT3wunMqY4nkK5', {
        api_host: 'https://us.i.posthog.com',
        defaults: '2026-05-30',
        person_profiles: 'identified_only',
    })
`,
          }}
        />
        <Script
          id="ld-json"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Person",
                  "@id": `${SITE_URL}/#person`,
                  name: "Abdullah Mohamed",
                  givenName: "Abdullah",
                  familyName: "Mohamed",
                  jobTitle: "Web Developer",
                  description:
                    "Web developer based in Mauritius specialising in Next.js, React, Tailwind CSS, and modern web applications. Also a competitive archery athlete.",
                  url: SITE_URL,
                  image: `${SITE_URL}/images/AM.png`,
                  address: {
                    "@type": "PostalAddress",
                    addressCountry: "MU",
                    addressRegion: "Mauritius",
                  },
                  knowsAbout: [
                    "Web Development",
                    "Next.js",
                    "React",
                    "Tailwind CSS",
                    "JavaScript",
                    "TypeScript",
                    "HTML",
                    "CSS",
                    "Figma",
                    "UI Design",
                    "Frontend Development",
                  ],
                  worksFor: {
                    "@type": "Organization",
                    name: "MetaBox Technology",
                  },
                  sameAs: [],
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: "Abdullah Mohamed — Web Developer",
                  description:
                    "Portfolio of Abdullah Mohamed, web developer based in Mauritius",
                  publisher: { "@id": `${SITE_URL}/#person` },
                  inLanguage: "en",
                },
                {
                  "@type": "WebPage",
                  "@id": `${SITE_URL}/#webpage`,
                  url: SITE_URL,
                  name: "Abdullah Mohamed — Web Developer in Mauritius",
                  isPartOf: { "@id": `${SITE_URL}/#website` },
                  about: { "@id": `${SITE_URL}/#person` },
                  description:
                    "Abdullah Mohamed is a web developer in Mauritius. He builds fast, modern websites and web applications using Next.js, React, and Tailwind CSS.",
                  breadcrumb: {
                    "@type": "BreadcrumbList",
                    itemListElement: [
                      {
                        "@type": "ListItem",
                        position: 1,
                        name: "Home",
                        item: SITE_URL,
                      },
                    ],
                  },
                },
              ],
            }),
          }}
        />
        <WebGLBackground />
        <CustomCursor />
        <Navigation />
        {/*
          relative + z-10: without an explicit stacking context, section
          content can fail to paint above the fixed WebGL background canvas
          (a compositor quirk with its continuous rAF redraw) — confirmed by
          disappearing text in the Process section that was fixed by this.
        */}
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
