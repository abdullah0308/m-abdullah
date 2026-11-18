"use client";

import { ArrowUp, ArrowUpRight, LinkedinLogo } from "@phosphor-icons/react/dist/ssr";
import { useSiteContent } from "@/context/SiteContext";
import { NAV_LINKS } from "@/lib/defaultContent";
import EditableText from "@/components/ui/EditableText";
import RevealText from "@/components/ui/RevealText";
import FooterRange from "./FooterRange";
import Logo from "./Logo";

/**
 * Sign-off as a night range: the page's last section is a target you can
 * shoot, judged by Flocon, beside one closing line and the email. The links
 * live in a slim bar underneath. It runs edge to edge and stays dark in both
 * themes, like the archery section above it.
 */
export default function Footer() {
  const { content } = useSiteContent();
  const { meta } = content;
  const year = new Date().getFullYear();

  return (
    <footer className="stage relative overflow-hidden border-t border-line">
      {/* floodlight over the target */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(36% 58% at 76% 40%, rgb(var(--accent-rgb) / 0.16), transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1760px] gap-14 px-4 pb-14 pt-20 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:px-12 lg:pb-20 lg:pt-28">
        <div className="lg:col-span-5">
          <h2 className="mega text-m2">
            <RevealText path="footer.heading" className="block" />
            <RevealText path="footer.headingHighlight" className="ink-accent block" delay={0.12} />
          </h2>
          <p className="mt-6 max-w-[42ch] text-lg leading-relaxed text-muted">
            <EditableText path="footer.body" />
          </p>

          <div className="mt-10">
            <div className="text-sm text-muted">Rather just talk?</div>
            <a
              href={`mailto:${meta.email}`}
              className="group mt-2 inline-flex flex-wrap items-center gap-3 break-all font-display text-[clamp(1.4rem,2.4vw,2rem)] font-semibold"
            >
              {meta.email}
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-onAccent transition-transform duration-500 ease-expo group-hover:rotate-45">
                <ArrowUpRight size={16} weight="bold" />
              </span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <FooterRange />
        </div>
      </div>

      {/* the shooting line: links sit on it */}
      <div className="relative border-t border-line">
        <div className="mx-auto max-w-[1760px] px-4 py-5 sm:px-8 lg:px-12">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <a href="#top" aria-label="Back to top" className="shrink-0 text-content">
                <Logo className="h-7 w-7" />
              </a>
              <nav aria-label="Footer">
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                  {NAV_LINKS.map(({ label, href }) => (
                    <li key={href}>
                      <a href={href} className="text-muted transition-colors hover:text-content">
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={meta.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="grid h-10 w-10 place-items-center rounded-full border border-line2 text-content transition-colors hover:bg-content/5"
              >
                <LinkedinLogo size={18} weight="bold" />
              </a>
              <a
                href="#top"
                aria-label="Back to top"
                className="grid h-10 w-10 place-items-center rounded-full border border-line2 text-content transition-colors hover:bg-content/5"
              >
                <ArrowUp size={16} weight="bold" />
              </a>
            </div>
          </div>
          {/* right padding keeps the colophon clear of the fixed Flocon circle */}
          <div className="mt-5 flex flex-col gap-1 pr-20 text-xs text-muted sm:flex-row sm:justify-between sm:pr-24">
            <span>
              &copy; {year} - {meta.name}
            </span>
            <span>
              <EditableText path="footer.colophon" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
