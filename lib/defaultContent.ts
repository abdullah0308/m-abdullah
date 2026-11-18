/**
 * Source of truth for every string on the site.
 *
 * The Payload global `site-content` stores an arbitrary JSON blob that is
 * deep-merged *over* this object at request time (see lib/mergeContent.ts), so
 * adding a key here is always safe: existing CMS data simply falls through to
 * the new default instead of rendering `undefined`.
 *
 * Dotted paths into this tree ("hero.subtext", "process.steps.0.phase") are
 * what <EditableText path=...> writes back, so renaming a key is a breaking
 * change for any content already saved under the old name.
 */
export const defaultContent = {
  meta: {
    name: "Abdullah Mohamed",
    role: "Web Developer",
    location: "Mauritius",
    email: "hello@m-abdullah.com",
    linkedin: "https://www.linkedin.com/in/abdullah-mohamed-05426931a/",
    company: "MetaBox Technology",
    companyLogo: "/images/metabox-logo-white.svg",
    availability: "Available for projects",
  },

  hero: {
    label: "Developer in Mauritius",
    firstName: "Abdullah",
    lastName: "Mohamed",
    // The three poster lines of the headline. The first letter O in the last
    // line is drawn as a portrait (Flocon for Abdullah, Abdullah for Flocon).
    line1: "Developer,",
    line2: "Archer,",
    line3: "Flocon's human.",
    tagline: ["I don't aim for perfect.", "I aim for better."],
    subtext: "I build fast, honest websites with Next.js and React.",
    subtextHighlight: "Flocon reviews every one of them.",
    cta1: "See the work",
    // The hero button. A new key: older saved content still holds a label
    // written for the previous design under cta1.
    ctaWork: "See the work",
    cta2: "Get in touch",
    bgImage: "/images/AM.webp",
    portrait: "/images/abdullah-cutout.webp",
    rotating: ["Next.js", "React", "TypeScript", "Payload CMS", "Tailwind"],
    stats: [
      { value: "5+", label: "Years building" },
      { value: "20+", label: "Sites shipped" },
      { value: "70m", label: "Longest shot" },
    ],
    badge: "Available for projects",
    floconCard: "Head of QA. Approves every pixel, rejects most of them.",
  },

  about: {
    label: "The Archer",
    heading: "Curious enough to start.",
    headingHighlight: "Patient enough to get it right.",
    body1:
      "I started building things because I wanted to understand how they worked. Not just use them. That impulse is still what drives me.",
    body2:
      "I approach problems the way I approach archery: understand the variables, control what you can, release with intention, and adjust based on where it lands.",
    values: ["Iterate", "Adjust", "Repeat"],
    photo: "/images/mbx-photo.jpg",
  },

  flocon: {
    heading: "Meet Flocon.",
    headingHighlight: "Co-pilot, critic, keyboard warmer.",
    body: "Every project on this page shipped with Flocon on the desk, usually on the keyboard. Flocon is French for snowflake. The ginger was not consulted.",
    name: "Flocon",
    breed: "Domestic shorthair",
    build: "Lean, slender",
    coat: "Bicolor white and ginger",
    eyes: "Vivid green",
    role: "Head of QA",
    note: "Green eyes and orange ear fill non-negotiable.",
    turnaroundHint: "Drag or use the tabs to switch views",
    moods: [
      { face: "neutral", label: "Reading your PR" },
      { face: "curious", label: "Mid code review" },
      { face: "profile", label: "Watching the build" },
      { face: "grumpy", label: "Found a typo" },
      { face: "lookup", label: "Waiting on CI" },
      { face: "shocked", label: "It worked first try" },
    ],
  },

  // One line per section, spoken by the companion in the corner.
  companion: {
    top: "Hi, I'm Flocon. I'll walk you through this.",
    about: "Abdullah is methodical. I have watched. A lot.",
    flocon: "Yes, this whole section is about me.",
    process: "Five steps. I watch them all from the start line.",
    work: "I reviewed all of these. Strictly.",
    skills: "So many tools. Not one of them opens tuna.",
    archery: "I don't do archery. I supervise.",
    contact: "Go on. I'm listening.",
  },

  process: {
    label: "How I Think",
    heading: "Every problem is a shot.",
    subheading: "Deliberate, measured, and always followed by adjustment.",
    steps: [
      {
        step: "01",
        phase: "Target",
        distance: "14m",
        description:
          "Understand the problem. Define what good looks like. Identify what I don't know before I touch a single line.",
      },
      {
        step: "02",
        phase: "Aim",
        distance: "28m",
        description:
          "Structure the approach. Research what I need. Plan before I build. A clear definition is worth more than three fast solutions.",
      },
      {
        step: "03",
        phase: "Draw",
        distance: "42m",
        description:
          "Build with focus. Every decision serves a purpose. No feature without a reason.",
      },
      {
        step: "04",
        phase: "Release",
        distance: "56m",
        description:
          "Ship, test, observe. The real feedback loop starts here. Not in the planning doc.",
      },
      {
        step: "05",
        phase: "Adjust",
        distance: "70m",
        description:
          "Read where it landed. Improve from what actually happened, not what was assumed. Every deviation is data.",
      },
    ],
  },

  work: {
    label: "Calibration Log",
    heading: "Shots taken.",
    subheading:
      "Four projects, and the adjustment each one forced. The adjustment is the useful part.",
    shots: [
      {
        number: "01",
        name: "E-Commerce Platform",
        type: "WordPress, WooCommerce",
        year: "2024",
        description:
          "Built a WooCommerce store from scratch. Product pages, cart, checkout, payment. The plugin handles a lot but you still have to know what you're doing.",
        adjustment:
          "Performance on WooCommerce takes real work. Test with real data early, not at the end.",
        tags: ["WordPress", "WooCommerce", "PHP"],
        image: "/images/work/ecommerce.webp",
        review: "Checkout flow passed. I tested it by sitting on the keyboard.",
      },
      {
        number: "02",
        name: "Corporate Website",
        type: "Next.js, Payload CMS",
        year: "2025",
        description:
          "Built in Next.js with Payload as the CMS. Developers can actually work with Payload without things falling apart. Good fit for structured content.",
        adjustment:
          "Content modeling matters more than the design does. You find that out after the first content migration.",
        tags: ["Next.js", "Payload CMS", "TypeScript"],
        image: "/images/work/corporate.webp",
        review: "Clean schemas. I approve of things that are organised.",
      },
      {
        number: "03",
        name: "Archery Training App",
        type: "Next.js",
        year: "2025",
        description:
          "A web app to track training sessions, log arrow groupings, and spot patterns over time. Scratched my own itch. Harder than expected to design for a sport you're also practicing.",
        adjustment:
          "Being the user and the developer at once is useful. You can't lie to yourself about what's confusing.",
        tags: ["Next.js", "TypeScript", "PostgreSQL"],
        image: "/images/work/archery-club-app.webp",
        review: "No cat mode yet. Filed as a bug.",
      },
      {
        number: "04",
        name: "Multilingual Websites",
        type: "WordPress, WPML",
        year: "2024",
        description:
          "Sites in multiple languages for clients operating across different markets. More decisions at the content and structure level than I expected going in.",
        adjustment:
          "Translation is not just text. Structure, navigation, and content relationships all have to work in every language.",
        tags: ["WordPress", "WPML", "PHP"],
        image: "/images/work/multilingual-sites.webp",
        review: "Miaou, meow, and miau all render correctly.",
      },
    ],
  },

  skills: {
    label: "The Quiver",
    heading: "What I reach for.",
    subheading:
      "Tools I've shipped production work with, grouped by what they actually do.",
    groups: [
      {
        title: "Build",
        note: "Where most of the hours go.",
        items: [
          { name: "Next.js", detail: "App Router, server components, SSG" },
          { name: "React", detail: "Hooks, state, composition" },
          { name: "TypeScript", detail: "Typed end to end" },
          { name: "JavaScript", detail: "ES2022+, async, DOM" },
        ],
      },
      {
        title: "Style",
        note: "Design intent made real.",
        items: [
          { name: "Tailwind CSS", detail: "Design tokens, variants" },
          { name: "CSS", detail: "Grid, custom properties, motion" },
          { name: "HTML", detail: "Semantics, a11y, SEO" },
          { name: "Framer Motion", detail: "Interaction and scroll motion" },
        ],
      },
      {
        title: "Ship",
        note: "Getting it out and keeping it up.",
        items: [
          { name: "Payload CMS", detail: "Schemas, globals, auth" },
          { name: "WordPress", detail: "WooCommerce, WPML, PHP" },
          { name: "PostgreSQL", detail: "Modelling and queries" },
          { name: "Cloudflare", detail: "Static export, edge deploys" },
        ],
      },
      {
        title: "Decide",
        note: "Before the editor opens.",
        items: [
          { name: "Figma", detail: "Systems, components, prototypes" },
          { name: "Git", detail: "Branching, review, history" },
          { name: "Performance", detail: "Core Web Vitals, budgets" },
          { name: "Accessibility", detail: "Contrast, keyboard, ARIA" },
        ],
      },
    ],
  },

  archery: {
    label: "Beyond the screen",
    heading: "Discipline in motion.",
    word: "FOCUS",
    quote: "Precision is not a destination. It's a practice.",
    quoteBody:
      "You can repeat the same shot a thousand times and still find room to improve it. That's how I approach building. Not to be done. To be better.",
    backdrop: "/images/hero-bg.jpeg",
    imageLeft: "/images/hero-bg.jpeg",
    imageRight: "/images/archery-aim.jpeg",
    imageThird: "/images/archery-full.jpeg",
    stats: [
      { value: "6", label: "Years shooting" },
      { value: "1000s", label: "Arrows logged" },
      { value: "1", label: "Adjustment at a time" },
    ],
  },

  contact: {
    label: "MetaBox Technology",
    heading: "Want a website?",
    headingHighlight: "Get in touch.",
    body: "At MetaBox Technology we build websites that actually work: clean code, real performance, built to last. Corporate site, store, or custom web app.",
    ctaLabel: "LinkedIn",
    captionName: "Abdullah Mohamed",
    captionRole: "Developer at MetaBox Technology",
    photo: "/images/mbx-photo.jpg",
    formNeeds: ["Website", "E-commerce", "Web app", "Something else"],
    formNote: "Opens your email app with the message ready to send.",
    sentLine: "Your email app should be open. Flocon is watching the inbox.",
  },

  footer: {
    note: "Built in Mauritius with Next.js, Tailwind, and Framer Motion.",
    colophon: "Reviewed and approved by Flocon.",
    heading: "One last shot.",
    headingHighlight: "Your turn.",
    body: "Click the target to release an arrow. Read where it lands, adjust, go again. That is the whole process.",
    releaseLabel: "Release an arrow",
    collectLabel: "Collect arrows",
    ready: "Six arrows. Make them count.",
    bullseye: "Bullseye. I will allow it.",
    close: "Close. Adjust and release.",
    middle: "Every deviation is data.",
    wide: "I have seen better. From kittens.",
    miss: "You missed the whole target.",
    done: "Quiver empty. Collect and go again.",
    great: "Now that is a score. I am impressed.",
    perfect: "Sixty out of sixty. I have no notes.",
  },
};

/**
 * Deliberately not `as const`: CMS values overwrite these at runtime, so the
 * useful type here is the widened shape (string, string[]) rather than the
 * literal one. Narrowing it to literals only makes every merged value fail to
 * assign back.
 */
export type ContentData = typeof defaultContent;

export const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Flocon", href: "#flocon" },
  { label: "Process", href: "#process" },
  { label: "Work", href: "#work" },
  { label: "Skills", href: "#skills" },
  { label: "Archery", href: "#archery" },
] as const;

/**
 * MetaBox Technology's own logo, as published on metabox.mu: the coloured
 * version for light backgrounds and the white one for dark backgrounds.
 * A design asset rather than editable copy, so it lives here and not in the
 * CMS-backed content tree.
 */
export const METABOX_LOGO = {
  colour: "/images/metabox-logo.svg",
  white: "/images/metabox-logo-white.svg",
} as const;
