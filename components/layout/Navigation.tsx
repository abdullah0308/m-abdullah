"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ── Archery-themed icon set ── */
const IconAbout = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const IconProcess = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
const IconSkills = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);
const IconArchery = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3c0 10 0 10 0 18" />
    <path d="M6 3c6 2.5 6 13.5 0 18" />
    <line x1="8" y1="12" x2="19" y2="12" />
    <polyline points="16 9 19 12 16 15" />
  </svg>
);
const IconContact = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <polyline points="2 8 12 14 22 8" />
  </svg>
);

const navLinks = [
  { label: "About",       href: "#about",   Icon: IconAbout   },
  { label: "How I Think", href: "#process", Icon: IconProcess },
  { label: "Skills",      href: "#skills",  Icon: IconSkills  },
  { label: "Archery",     href: "#archery", Icon: IconArchery },
  { label: "Contact",     href: "#contact", Icon: IconContact },
];

const PILL_SHADOW = [
  "0 1px 0 rgba(255,255,255,0.07) inset",
  "0 -1px 0 rgba(0,0,0,0.55) inset",
  "0 0 0 1px rgba(80,232,244,0.13)",
  "0 4px 6px rgba(0,0,0,0.35)",
  "0 14px 40px rgba(0,0,0,0.55)",
  "0 0 36px rgba(80,232,244,0.05)",
].join(", ");

export default function Navigation() {
  const [activeSection, setActiveSection] = useState("");
  const [mobileOpen,    setMobileOpen]    = useState(false);

  // Clear active highlight when back near the top (hero)
  useEffect(() => {
    const onScroll = () => { if (window.scrollY < 80) setActiveSection(""); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActiveSection(e.target.id); }),
      { threshold: 0.3, rootMargin: "-60px 0px -60px 0px" }
    );
    navLinks.forEach(({ href }) => {
      const el = document.getElementById(href.replace("#", ""));
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleLink = (href: string) => {
    setMobileOpen(false);
    setTimeout(() => {
      document.getElementById(href.replace("#", ""))?.scrollIntoView({ behavior: "smooth" });
    }, 260);
  };

  return (
    <>
      {/* ── Desktop pill nav ── */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 hidden md:block">
        <div
          className="relative flex items-center h-[58px] select-none overflow-hidden"
          style={{
            borderRadius: 9999,
            background: "linear-gradient(180deg, #0f1d2c 0%, #060e18 100%)",
            boxShadow: PILL_SHADOW,
            minWidth: 680,
          }}
        >
          {/* Left teal accent glow */}
          <div
            className="absolute left-0 top-0 bottom-0 w-24 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at left center, rgba(80,232,244,0.22) 0%, transparent 75%)",
              borderRadius: "9999px 0 0 9999px",
            }}
          />
          {/* Right teal accent glow */}
          <div
            className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at right center, rgba(80,232,244,0.18) 0%, transparent 75%)",
              borderRadius: "0 9999px 9999px 0",
            }}
          />

          {/* Logo section */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="relative flex items-center justify-center shrink-0 w-[84px] h-full group"
            aria-label="Go to top"
          >
            <Image src="/images/AM Web Logo.svg" alt="AM" width={40} height={28} className="h-7 w-auto transition-opacity duration-200 group-hover:opacity-70" />
          </button>

          {/* Left separator */}
          <div className="h-7 w-px shrink-0" style={{ background: "rgba(80,232,244,0.12)" }} />

          {/* Nav links */}
          <ul className="flex items-center flex-1 justify-center gap-1 px-3">
            {navLinks.map(({ label, href, Icon }) => {
              const id = href.replace("#", "");
              const isActive = activeSection === id;
              return (
                <li key={label}>
                  <button
                    onClick={() => handleLink(href)}
                    className="relative flex flex-col items-center gap-[3px] px-4 py-2 group transition-colors duration-150"
                    style={{ color: isActive ? "#50E8F4" : "rgba(255,255,255,0.45)" }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)"; }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)"; }}
                  >
                    <Icon />
                    <span className="text-[10px] tracking-[0.12em] uppercase font-mono leading-none">{label}</span>
                    {/* Active underline */}
                    {isActive && (
                      <motion.div
                        layoutId="pill-indicator"
                        className="absolute -bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full"
                        style={{ background: "#50E8F4", boxShadow: "0 0 6px rgba(80,232,244,0.8)" }}
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Right separator */}
          <div className="h-7 w-px shrink-0" style={{ background: "rgba(80,232,244,0.12)" }} />

          {/* CTA section */}
          <button
            onClick={() => handleLink("#contact")}
            className="relative flex items-center justify-center shrink-0 w-[120px] h-full group"
          >
            <span
              className="text-[11px] font-mono tracking-[0.18em] uppercase transition-colors duration-150"
              style={{ color: "rgba(80,232,244,0.85)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "#C7F8FE"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "rgba(80,232,244,0.85)"; }}
            >
              Get in Touch
            </span>
          </button>
        </div>
      </div>

      {/* ── Mobile compact pill ── */}
      <div className="fixed top-4 left-4 right-4 z-50 md:hidden">
        <div
          className="relative flex items-center justify-between h-[50px] px-5"
          style={{
            borderRadius: 9999,
            background: "linear-gradient(180deg, #0f1d2c 0%, #060e18 100%)",
            boxShadow: PILL_SHADOW,
          }}
        >
          {/* Left glow */}
          <div className="absolute left-0 top-0 bottom-0 w-16 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at left center, rgba(80,232,244,0.2) 0%, transparent 75%)", borderRadius: "9999px 0 0 9999px" }} />

          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="shrink-0">
            <Image src="/images/AM Web Logo.svg" alt="AM" width={36} height={24} className="h-6 w-auto" />
          </button>

          {/* Hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex flex-col gap-[5px] p-1 shrink-0"
            aria-label="Toggle menu"
          >
            <motion.span className="block h-px w-5 bg-white/70" animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} transition={{ duration: 0.2 }} />
            <motion.span className="block h-px w-5 bg-white/70" animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }} transition={{ duration: 0.2 }} />
            <motion.span className="block h-px w-5 bg-white/70" animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} transition={{ duration: 0.2 }} />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed top-20 left-4 right-4 z-50 md:hidden"
            style={{
              borderRadius: 16,
              background: "linear-gradient(180deg, #0f1d2c 0%, #060e18 100%)",
              boxShadow: PILL_SHADOW,
              border: "1px solid rgba(80,232,244,0.1)",
            }}
          >
            <ul className="flex flex-col py-3">
              {navLinks.map(({ label, href, Icon }) => {
                const id = href.replace("#", "");
                const isActive = activeSection === id;
                return (
                  <li key={label}>
                    <button
                      onClick={() => handleLink(href)}
                      className="w-full flex items-center gap-4 px-6 py-4 transition-colors duration-150"
                      style={{ color: isActive ? "#50E8F4" : "rgba(255,255,255,0.55)" }}
                    >
                      <Icon />
                      <span className="text-sm tracking-wide">{label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#50E8F4", boxShadow: "0 0 6px rgba(80,232,244,0.8)" }} />
                      )}
                    </button>
                  </li>
                );
              })}
              <li className="mx-4 mt-2 mb-1">
                <button
                  onClick={() => handleLink("#contact")}
                  className="w-full text-center py-3 text-xs font-mono tracking-[0.18em] uppercase"
                  style={{ border: "1px solid rgba(80,232,244,0.3)", color: "#50E8F4" }}
                >
                  Get in Touch
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
