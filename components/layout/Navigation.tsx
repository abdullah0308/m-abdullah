"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "How I Think", href: "#process" },
  { label: "Log", href: "#work" },
  { label: "Archery", href: "#archery" },
  { label: "Contact", href: "#contact" },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.3, rootMargin: "-60px 0px -60px 0px" }
    );
    navLinks.forEach(({ href }) => {
      const el = document.getElementById(href.replace("#", ""));
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleLink = (href: string) => {
    const id = href.replace("#", "");
    setMobileOpen(false);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-charcoal-deep/90 backdrop-blur-md border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between h-16">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-3 group"
          aria-label="Go to top"
        >
          <img
            src="/images/AM Web Logo.svg"
            alt="Abdullah Mohamed"
            className="h-8 w-auto"
          />
        </button>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map(({ label, href }) => {
            const id = href.replace("#", "");
            const isActive = activeSection === id;
            return (
              <li key={label} className="relative">
                <button
                  onClick={() => handleLink(href)}
                  className={`text-sm tracking-wide transition-colors duration-200 ${
                    isActive ? "text-gold" : "text-white/60 hover:text-white"
                  }`}
                >
                  {label}
                </button>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-gold"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </li>
            );
          })}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <button
            onClick={() => handleLink("#contact")}
            className="text-sm font-display font-medium px-5 py-2 border border-gold/50 text-gold hover:bg-gold hover:text-charcoal-deep transition-all duration-200"
          >
            Get in Touch
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <motion.span
            className="block h-px w-6 bg-white"
            animate={mobileOpen ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="block h-px w-6 bg-white"
            animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
          <motion.span
            className="block h-px w-6 bg-white"
            animate={mobileOpen ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.2 }}
          />
        </button>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden bg-charcoal-deep/95 backdrop-blur-md border-t border-white/5 overflow-hidden"
          >
            <ul className="px-6 py-6 flex flex-col gap-5">
              {navLinks.map(({ label, href }) => (
                <li key={label}>
                  <button
                    onClick={() => handleLink(href)}
                    className="text-white/70 hover:text-gold text-base tracking-wide transition-colors w-full text-left"
                  >
                    {label}
                  </button>
                </li>
              ))}
              <li className="pt-2">
                <button
                  onClick={() => handleLink("#contact")}
                  className="w-full text-sm font-display font-medium px-5 py-2.5 bg-gold text-charcoal-deep hover:bg-gold-light transition-colors"
                >
                  Get in Touch
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
