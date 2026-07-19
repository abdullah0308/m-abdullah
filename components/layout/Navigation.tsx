"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

/* ── Archery-themed icon set (mobile drawer) ── */
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

const easeOut = [0.22, 1, 0.36, 1] as const;

export default function Navigation() {
  const [activeSection, setActiveSection] = useState("");
  const [hovered,       setHovered]       = useState<string | null>(null);
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
      {/* ── Logo, standalone in the top-left corner ── */}
      <motion.button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed top-5 left-6 z-50 hidden md:block"
        aria-label="Go to top"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: easeOut, delay: 0.1 }}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.96 }}
        style={{ filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.6))" }}
      >
        <Image src="/images/AM Logo.svg" alt="AM" width={63} height={32} className="h-8 w-auto" />
      </motion.button>

      {/* ── Desktop glass nav ── */}
      <motion.div
        className="fixed top-5 left-1/2 z-50 hidden md:block w-max"
        initial={{ x: "-50%", y: -28, opacity: 0 }}
        animate={{ x: "-50%", y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: easeOut, delay: 0.25 }}
      >
        <nav
          className="relative flex items-center h-[52px] px-2 select-none"
          style={{
            borderRadius: 9999,
            background: "linear-gradient(180deg, rgba(18,32,44,0.92) 0%, rgba(5,12,20,0.96) 100%)",
            boxShadow: PILL_SHADOW,
          }}
        >
          {/* soft teal edge glows */}
          <div
            className="absolute left-0 top-0 bottom-0 w-24 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at left center, rgba(80,232,244,0.16) 0%, transparent 75%)", borderRadius: "9999px 0 0 9999px" }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at right center, rgba(80,232,244,0.12) 0%, transparent 75%)", borderRadius: "0 9999px 9999px 0" }}
          />

          <ul className="relative flex items-center">
            {navLinks.map(({ label, href }) => {
              const id = href.replace("#", "");
              const isActive = activeSection === id;
              return (
                <li key={label} className="relative">
                  <button
                    onClick={() => handleLink(href)}
                    onMouseEnter={() => setHovered(id)}
                    onMouseLeave={() => setHovered(null)}
                    className="group relative px-5 py-4"
                  >
                    {/* morphing hover highlight — glides between items */}
                    <AnimatePresence>
                      {hovered === id && (
                        <motion.span
                          layoutId="nav-hover"
                          className="absolute inset-x-0.5 inset-y-2"
                          style={{
                            borderRadius: 9999,
                            background: "rgba(80,232,244,0.09)",
                            boxShadow: "inset 0 0 0 1px rgba(80,232,244,0.14)",
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, transition: { duration: 0.18 } }}
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        />
                      )}
                    </AnimatePresence>

                    {/* rolling label */}
                    <span className="relative block overflow-hidden leading-none">
                      <span
                        className={`block text-[11px] font-mono uppercase tracking-[0.16em] leading-none whitespace-nowrap transition-transform duration-300 ease-out group-hover:-translate-y-[110%] ${
                          isActive ? "text-gold" : "text-white/60"
                        }`}
                      >
                        {label}
                      </span>
                      <span
                        aria-hidden
                        className="absolute inset-x-0 top-[110%] block text-[11px] font-mono uppercase tracking-[0.16em] leading-none whitespace-nowrap text-gold-light transition-transform duration-300 ease-out group-hover:-translate-y-[110%]"
                      >
                        {label}
                      </span>
                    </span>

                    {/* sliding active dot */}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute bottom-[7px] h-[3px] w-[3px] rounded-full"
                        style={{ left: "50%", marginLeft: -1.5, background: "#50E8F4", boxShadow: "0 0 8px rgba(80,232,244,1)" }}
                        transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </motion.div>

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
            <Image src="/images/AM Logo.svg" alt="AM" width={47} height={24} className="h-6 w-auto" />
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
              {navLinks.map(({ label, href, Icon }, i) => {
                const id = href.replace("#", "");
                const isActive = activeSection === id;
                return (
                  <motion.li
                    key={label}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05, duration: 0.3, ease: "easeOut" }}
                  >
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
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
