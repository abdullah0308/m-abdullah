/**
 * Flocon's cut.
 *
 * The page has two narrators. Abdullah's version is the content tree
 * (lib/defaultContent.ts, overridden by the CMS). When the visitor hands the
 * page to Flocon, any string whose content path appears here is replaced by
 * her telling of it. Paths that are missing simply keep Abdullah's words, so
 * this file can stay partial.
 *
 * It is not CMS content on purpose: the human copy is what gets indexed and
 * edited; the cat's copy is a performance layered over it.
 */
export const CAT_COPY: Record<string, string> = {
  "hero.line1": "Head of QA,",
  "hero.line2": "Nap expert,",
  "hero.line3": "Abdullah's boss.",
  "hero.subtext": "He builds the websites. I sit on the keyboard until they are right.",
  "hero.subtextHighlight": "You are welcome.",
  "hero.ctaWork": "See what I approved",

  "about.heading": "Curious enough to open the laptop.",
  "about.headingHighlight": "Stubborn enough to stay up past my bedtime.",
  "about.body1":
    "He started building things because he wanted to know how they worked. I started watching because the laptop is warm. We both stayed.",
  "about.body2":
    "He treats every problem like a shot: read the wind, control what he can, release, adjust. I treat every problem like a nap. Only one of us ships websites.",
  "about.values.0": "Sit",
  "about.values.1": "Stare",
  "about.values.2": "Repeat",

  "flocon.heading": "It's me.",
  "flocon.headingHighlight": "The talent.",
  "flocon.body":
    "Every project on this page shipped with me on the desk, usually on the keyboard. Flocon is French for snowflake. The ginger was my idea.",
  "flocon.note": "Green eyes, orange ear fill. Perfect, obviously.",
  "flocon.turnaroundHint": "Drag me around. Gently.",

  "process.heading": "Every problem is a nap, interrupted.",
  "process.subheading": "I have watched him do this five hundred times. Here is how it goes.",
  "process.steps.0.description":
    "He stares at the problem. I stare at him. Nothing gets typed. This is apparently the important part.",
  "process.steps.1.description":
    "He makes a plan. I sit on the plan. If the plan survives me, it is a good plan.",
  "process.steps.2.description":
    "Typing, finally. Hours of it. The keyboard gets warm, so I approve.",
  "process.steps.3.description":
    "He ships it and holds his breath. I knock a pen off the desk to keep things honest.",
  "process.steps.4.description":
    "Something landed slightly off. He fixes it without sulking. I respect that. Quietly.",

  "work.heading": "Things I let him ship.",
  "work.subheading": "Four projects. I supervised every one of them, and I have notes.",
  "work.shots.0.description":
    "A shop that takes real money. He built the product pages, the cart and the checkout. I tested the checkout by sitting on the keyboard. It held.",
  "work.shots.1.description":
    "A company website with a tidy cupboard behind it for all the words. I like cupboards. Everything in its place.",
  "work.shots.2.description":
    "An app for counting arrows. He built it for himself, so he argued with himself for weeks. I stayed out of it.",
  "work.shots.3.description":
    "The same websites, in several languages. Miaou, meow and miau all had to work. They do.",

  "skills.heading": "What he reaches for.",
  "skills.subheading": "These live on my desk. I knock them off when a build takes too long.",

  "archery.word": "LOOK",
  "archery.heading": "He also does this.",
  "archery.quote": "He stands very still and stares at one thing. I taught him that.",
  "archery.quoteBody":
    "The same shot, a thousand times, a little better each time. It is the only thing he has more patience for than I have for the bird outside.",

  "contact.heading": "Need a website?",
  "contact.headingHighlight": "Ask my human.",
  "contact.body":
    "He and the team at MetaBox Technology build websites that work: corporate sites, shops, custom web apps. I check each one before it leaves the house.",

  "footer.heading": "Go on, then.",
  "footer.headingHighlight": "Impress me.",
  "footer.body": "Click the target to shoot. Six arrows. I will be judging, as usual.",
  "footer.colophon": "Written and approved by Flocon.",
};

/**
 * Margin notes. In Abdullah's version they are Flocon's (content.companion).
 * In Flocon's cut the roles swap and Abdullah gets the margins.
 */
export const HUMAN_NOTES: Record<string, string> = {
  about: "She was asleep for most of it.",
  flocon: "I did not sign off on this section.",
  process: "For the record, she has never fixed a bug.",
  work: "Her notes were mostly about dinner.",
  skills: "This is why I own three keyboards.",
  archery: "She has never been to the range.",
};
