"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SectionWrapper from "@/components/ui/SectionWrapper";
import RevealText from "@/components/ui/RevealText";

type Skill = {
  index: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  tools: string[];
  bgImage: string;
  bgFallback: string;
  logo: string;
  logoFilter?: string;
  accent: string;
};

const skills: Skill[] = [
  {
    index: "01",
    name: "Figma",
    category: "Design",
    tagline: "Design before code",
    description:
      "I prototype and build design systems before touching the editor. It keeps decisions visual, scope honest, and rework low.",
    tools: ["Auto Layout", "Components", "Variables", "Prototyping"],
    bgImage:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=900&q=80&fit=crop&auto=format",
    bgFallback: "#2D0B55",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/figma/figma-original.svg",
    accent: "#A259FF",
  },
  {
    index: "02",
    name: "HTML",
    category: "Markup",
    tagline: "Structure with intent",
    description:
      "Semantic elements, proper heading hierarchy, ARIA attributes. A well-structured document makes CSS easier and accessibility nearly free.",
    tools: ["Semantic HTML5", "Accessibility", "Web Components", "SEO"],
    bgImage:
      "https://images.unsplash.com/photo-1537884944318-390069bb8665?w=900&q=80&fit=crop&auto=format",
    bgFallback: "#3d1200",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg",
    accent: "#E34F26",
  },
  {
    index: "03",
    name: "CSS",
    category: "Styling",
    tagline: "Design intent made real",
    description:
      "Flexbox and Grid for structure, custom properties for theming, transitions for motion. Primarily through Tailwind — how this site is built.",
    tools: ["Flexbox / Grid", "Custom Properties", "Tailwind CSS", "Animations"],
    bgImage:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&q=80&fit=crop&auto=format",
    bgFallback: "#00214d",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg",
    accent: "#1572B6",
  },
  {
    index: "04",
    name: "JavaScript",
    category: "Logic",
    tagline: "The language I think in",
    description:
      "Modern ES2022+, async/await, closures, DOM. I use JS to handle state, talk to APIs, and build the interactions that make a UI feel alive.",
    tools: ["ES2022+", "Async / Await", "REST APIs", "TypeScript"],
    bgImage:
      "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=900&q=80&fit=crop&auto=format",
    bgFallback: "#1a1400",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg",
    accent: "#F7DF1E",
  },
  {
    index: "05",
    name: "Next.js",
    category: "Framework",
    tagline: "Where it all comes together",
    description:
      "App Router, server components, Payload CMS — including this portfolio. SSR, routing, image optimisation, and API routes all in one place.",
    tools: ["App Router", "Server Components", "SSR / SSG", "Vercel"],
    bgImage:
      "https://images.unsplash.com/photo-1607706189992-eae578626c86?w=900&q=80&fit=crop&auto=format",
    bgFallback: "#080808",
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-plain.svg",
    logoFilter: "invert(1)",
    accent: "#ffffff",
  },
];

export default function Skills() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <SectionWrapper id="skills" className="bg-charcoal-deep/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-12">
          <RevealText variant="label" delay={0}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-gold" />
              <span className="text-gold text-xs tracking-[0.3em] uppercase font-mono">The Stack</span>
            </div>
          </RevealText>
          <RevealText variant="heading">
            <h2 className="font-title text-3xl md:text-4xl lg:text-5xl text-white">
              Tools I reach for.
            </h2>
          </RevealText>
        </div>

        {/* Desktop — horizontal expanding panels */}
        <div
          className="hidden md:flex overflow-hidden"
          style={{ height: 520, gap: 3 }}
          onMouseLeave={() => setActive(null)}
        >
          {skills.map((skill, i) => {
            const isActive = active === i;
            const someActive = active !== null;

            return (
              <motion.div
                key={skill.name}
                className="relative overflow-hidden cursor-pointer flex-shrink-0"
                animate={{
                  flexGrow: someActive ? (isActive ? 5 : 1) : 1,
                }}
                transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ flexGrow: 1, minWidth: 64 }}
                onMouseEnter={() => setActive(i)}
              >
                {/* Background image */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: skill.bgFallback,
                    backgroundImage: `url(${skill.bgImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />

                {/* Dark overlay — darker on inactive, gradient on active */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    background: isActive
                      ? "linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0.25) 100%)"
                      : "rgba(0,0,0,0.72)",
                  }}
                  transition={{ duration: 0.4 }}
                />

                {/* Left accent bar */}
                <motion.div
                  className="absolute left-0 top-0 bottom-0 w-0.5"
                  animate={{ opacity: isActive ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ background: skill.accent }}
                />

                {/* ---- COLLAPSED STATE ---- */}
                <AnimatePresence>
                  {!isActive && (
                    <motion.div
                      key="collapsed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 flex flex-col items-center justify-between py-8"
                    >
                      <span className="font-mono text-[10px] text-white/25">{skill.index}</span>
                      <span
                        className="font-title text-base text-white/70 tracking-widest select-none"
                        style={{
                          writingMode: "vertical-rl",
                          textOrientation: "mixed",
                          transform: "rotate(180deg)",
                        }}
                      >
                        {skill.name}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ---- EXPANDED STATE ---- */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      key="expanded"
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
                      className="absolute inset-0 flex flex-col justify-between p-8"
                    >
                      {/* Top row */}
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-[10px] text-white/20">{skill.index}</span>
                        <img
                          src={skill.logo}
                          alt={skill.name}
                          className="w-10 h-10 object-contain"
                          style={skill.logoFilter ? { filter: skill.logoFilter } : undefined}
                          draggable={false}
                        />
                      </div>

                      {/* Bottom content */}
                      <div>
                        <p
                          className="font-mono text-[10px] tracking-[0.28em] uppercase mb-2"
                          style={{ color: skill.accent }}
                        >
                          {skill.category}
                        </p>
                        <h3 className="font-title text-4xl lg:text-5xl text-white mb-3 leading-none">
                          {skill.name}
                        </h3>
                        <p className="text-white/72 text-sm leading-relaxed mb-5 max-w-[340px]">
                          {skill.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {skill.tools.map((tool) => (
                            <span
                              key={tool}
                              className="font-mono text-[10px] tracking-wider px-2.5 py-1"
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                border: `1px solid rgba(255,255,255,0.12)`,
                                color: "rgba(255,255,255,0.45)",
                              }}
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile — vertical accordion */}
        <div className="flex flex-col md:hidden gap-px" style={{ background: "rgba(80,232,244,0.05)" }}>
          {skills.map((skill, i) => {
            const isOpen = active === i;
            return (
              <div
                key={skill.name}
                className="relative overflow-hidden cursor-pointer"
                onClick={() => setActive(isOpen ? null : i)}
              >
                {/* Background */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundColor: skill.bgFallback,
                    backgroundImage: `url(${skill.bgImage})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.78)" }} />

                {/* Row header */}
                <div className="relative z-10 flex items-center gap-4 px-6 py-5">
                  <span className="font-mono text-[10px] text-white/25 w-5">{skill.index}</span>
                  <img src={skill.logo} alt={skill.name} className="w-7 h-7 object-contain" style={skill.logoFilter ? { filter: skill.logoFilter } : undefined} draggable={false} />
                  <span className="font-title text-xl text-white flex-1">{skill.name}</span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-white/40 text-xl leading-none select-none"
                  >
                    +
                  </motion.span>
                </div>

                {/* Expand */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="relative z-10 overflow-hidden"
                    >
                      <div className="px-6 pb-6 pt-1">
                        <p
                          className="font-mono text-[10px] tracking-widest uppercase mb-2"
                          style={{ color: skill.accent }}
                        >
                          {skill.category}
                        </p>
                        <p className="text-white/72 text-sm leading-relaxed mb-4">
                          {skill.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {skill.tools.map((tool) => (
                            <span
                              key={tool}
                              className="font-mono text-[10px] tracking-wider px-2.5 py-1"
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                color: "rgba(255,255,255,0.45)",
                              }}
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </SectionWrapper>
  );
}
