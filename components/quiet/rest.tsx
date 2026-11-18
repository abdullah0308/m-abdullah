"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { CaretDown, Folder, FolderOpen, PaperPlaneTilt, X } from "@phosphor-icons/react/dist/ssr";
import { useSiteContent } from "@/context/SiteContext";
import { useReduceMotion } from "@/lib/useReduceMotion";
import { meow, warmMeows } from "@/lib/meow";
import Reveal, { EASE } from "@/components/ui/Reveal";
import { FLOCON_POSES, faceSrc } from "@/components/flocon/assets";
import { LINKS, Window } from "./chrome";
import { Heading } from "./sections";

/* ── Archery ───────────────────────────────────────────────────────────── */

/** Two frames from an evening at the range, changing every few seconds. */
export function RangeSlider({ aspect = "aspect-[4/5]" }: { aspect?: string }) {
  const { content } = useSiteContent();
  const { archery } = content;
  const reduce = useReduceMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.3 });

  const slides = [archery.imageRight, archery.imageThird];
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    if (reduce || !inView) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 4200);
    return () => clearInterval(t);
  }, [reduce, inView, slides.length]);

  return (
    <div ref={ref}>
      <div className={`relative overflow-hidden rounded-lg bg-surface ${aspect}`}>
        <AnimatePresence initial={false}>
          <motion.div
            key={slide}
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <Image
              src={slides[slide]}
              alt={slide === 0 ? "Looking down the arrow at the targets" : "Abdullah on the shooting line, bow in hand"}
              fill
              sizes="(max-width: 1024px) 352px, 420px"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-2 py-2.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSlide(i)}
            aria-label={`Show photo ${i + 1}`}
            aria-pressed={i === slide}
            className={`h-1.5 w-8 rounded-full transition-colors ${i === slide ? "bg-content" : "bg-white/25"}`}
          />
        ))}
      </div>
    </div>
  );
}

/** The quote, the longer thought, and the three numbers. */
export function ArcheryNotes() {
  const { content } = useSiteContent();
  const { archery } = content;

  return (
    <>
      <blockquote>
        <p className="q-serif text-[clamp(1.6rem,2.4vw,2.2rem)] italic leading-tight">&ldquo;{archery.quote}&rdquo;</p>
        <p className="mt-4 max-w-[52ch] leading-relaxed text-content/80">{archery.quoteBody}</p>
      </blockquote>
      <dl className="mt-7 grid grid-cols-3 gap-5">
        {archery.stats.map((s) => (
          <div key={s.label}>
            <dt className="sr-only">{s.label}</dt>
            <dd className="q-serif text-[clamp(2rem,3vw,2.9rem)]">{s.value}</dd>
            <dd className="mt-1 text-sm text-content/75">{s.label}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/**
 * The stacked page's archery section. The wallpaper becomes the range at
 * night and three words sit large across it.
 */
export function Archery() {
  const { content } = useSiteContent();

  return (
    <section id="archery" className="relative px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <h2 className="sr-only">{content.archery.heading}</h2>
        <p aria-hidden className="q-serif text-[clamp(4rem,19vw,7.5rem)]">
          <span className="block">Seventy</span>
          <span className="block pl-[0.6em] italic text-accentInk">metres</span>
          <span className="block">of focus.</span>
        </p>
        <Reveal className="mt-10 w-full max-w-[22rem]">
          <Window title="range.jpg" bodyClassName="p-2 pb-0">
            <RangeSlider />
          </Window>
        </Reveal>
        <Reveal className="mt-12 max-w-[40rem]">
          <ArcheryNotes />
        </Reveal>
      </div>
    </section>
  );
}

/* ── Contact ───────────────────────────────────────────────────────────── */

type Errors = Partial<Record<"name" | "message", string>>;

/**
 * A new message. The site has no mail backend, so Send builds the email and
 * hands it to the visitor's own mail app. `id` keeps the field ids unique
 * when the form exists in both layouts.
 */
export function MailForm({ id = "q", defaultName = "" }: { id?: string; defaultName?: string }) {
  const { content } = useSiteContent();
  const { contact, meta } = content;

  const [name, setName] = useState(defaultName);
  const [need, setNeed] = useState(contact.formNeeds[0] ?? "");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = "Add your name so Abdullah knows who to reply to.";
    if (message.trim().length < 10) next.message = "A sentence or two about the project, please.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const subject = `${need} enquiry from ${name.trim()}`;
    const body = `${message.trim()}\n\n${name.trim()}`;
    window.location.href = `mailto:${meta.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const row = "grid grid-cols-[4.5rem_1fr] items-center gap-3 border-b border-white/10 px-5 py-3 sm:px-6";
  const field = "w-full bg-transparent text-content outline-none placeholder:text-muted focus-visible:outline-none";

  return (
    <form onSubmit={submit} noValidate>
      <div className={row}>
        <span className="text-sm text-muted">To</span>
        <span className="truncate">{meta.email}</span>
      </div>
      <div className={row}>
        <label htmlFor={`${id}-name`} className="text-sm text-muted">
          From
        </label>
        <input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Your name"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? `${id}-name-err` : undefined}
          className={field}
        />
      </div>
      <div className={row}>
        <label htmlFor={`${id}-need`} className="text-sm text-muted">
          Subject
        </label>
        <span className="relative">
          <select
            id={`${id}-need`}
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            className={`${field} appearance-none pr-8`}
          >
            {contact.formNeeds.map((n) => (
              <option key={n} value={n} className="bg-surface text-content">
                {n}
              </option>
            ))}
          </select>
          <CaretDown aria-hidden size={14} weight="bold" className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-muted" />
        </span>
      </div>
      <div className="px-5 py-4 sm:px-6">
        <label htmlFor={`${id}-msg`} className="sr-only">
          About the project
        </label>
        <textarea
          id={`${id}-msg`}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={!!errors.message}
          aria-describedby={`${id}-msg-help${errors.message ? ` ${id}-msg-err` : ""}`}
          placeholder="A booking site for a guesthouse in Grand Baie, ready before the winter season."
          className={`${field} resize-none leading-relaxed`}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-4 sm:px-6">
        <div className="min-w-0 text-sm" aria-live="polite">
          {errors.name && (
            <p id={`${id}-name-err`} className="text-danger">
              {errors.name}
            </p>
          )}
          {errors.message && (
            <p id={`${id}-msg-err`} className="text-danger">
              {errors.message}
            </p>
          )}
          <p id={`${id}-msg-help`} className="text-muted">
            {sent ? "Your email app should be open with the message ready." : contact.formNote}
          </p>
        </div>
        <button
          type="submit"
          className="group flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-onAccent transition-transform active:scale-[0.98]"
        >
          Send via email
          <PaperPlaneTilt size={17} weight="bold" className="transition-transform duration-500 ease-expo group-hover:translate-x-0.5" />
        </button>
      </div>
    </form>
  );
}

/**
 * A pair of ginger ears over the top edge of a window: the cat is sitting
 * behind it, and that is all anyone gets to see of her. Place it inside a
 * positioned parent whose top edge is the window's.
 */
export function Ears() {
  return (
    <div aria-hidden data-ears className="pointer-events-none absolute -top-[2.1rem] right-12 h-[2.2rem] w-[5.2rem] overflow-hidden">
      <Image
        src={FLOCON_POSES.back.src}
        alt=""
        width={FLOCON_POSES.back.w}
        height={FLOCON_POSES.back.h}
        className="w-full max-w-none"
      />
    </div>
  );
}

export function Contact() {
  const { content } = useSiteContent();
  const { contact, meta } = content;

  return (
    <section id="contact" className="relative px-4 py-20 sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <Heading line={contact.heading} accent={contact.headingHighlight} />
          <p className="mt-6 max-w-[42ch] leading-relaxed text-content/80">{contact.body}</p>
          <a
            href={`mailto:${meta.email}`}
            className="mt-7 inline-block break-all text-xl underline decoration-white/25 decoration-1 underline-offset-[7px] transition-colors hover:decoration-accent"
          >
            {meta.email}
          </a>
          <p className="mt-4 text-sm text-muted">
            <a href={meta.linkedin} target="_blank" rel="noopener noreferrer" className="underline decoration-white/25 underline-offset-4 hover:text-content">
              LinkedIn
            </a>
          </p>
        </Reveal>

        <Reveal delay={0.1} className="relative mt-16 max-w-[40rem]">
          <Ears />
          <Window title="New message" bodyClassName="p-0">
            <MailForm id="q" />
          </Window>
        </Reveal>
      </div>
    </section>
  );
}

/* ── The secret ────────────────────────────────────────────────────────── */

/** What is in the folder marked "do not open". */
export function SecretPhoto() {
  return (
    <>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-[#1b1e24]">
        <Image src={faceSrc("neutral")} alt="Flocon, a white and ginger cat with green eyes" fill sizes="280px" className="object-cover" />
      </div>
      <p className="px-2 pb-1 pt-3 text-sm leading-snug">
        You looked. This is Flocon. She has been on this desk the whole time.
      </p>
    </>
  );
}

/**
 * The foot of the stacked page: the links, the copyright, and the folder.
 * Opening it is the only way to see Flocon in this version.
 */
export function Footer() {
  const { content } = useSiteContent();
  const reduce = useReduceMotion();
  const [open, setOpen] = useState(false);
  const year = new Date().getFullYear();

  const toggle = () => {
    if (!open) meow();
    setOpen((v) => !v);
  };

  return (
    <footer className="relative border-t border-white/10 px-4 pb-28 pt-12 sm:px-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {LINKS.slice(1).map(({ id, label }) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-muted transition-colors hover:text-content">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-5 text-xs text-muted">
            &copy; {year} - {content.meta.name}
          </p>
          <p className="mt-1 text-xs text-muted">QA: F.</p>
        </div>

        <div className="relative">
          <AnimatePresence>
            {open && (
              <motion.div
                key="secret"
                className="absolute bottom-full left-0 z-10 mb-3 w-64 sm:left-auto sm:right-0"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
                transition={{ duration: 0.3, ease: EASE }}
                style={{ transformOrigin: "100% 100%" }}
              >
                <Window title="flocon.jpg" bodyClassName="p-2">
                  <SecretPhoto />
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="absolute right-2 top-1.5 grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-content"
                  >
                    <X size={12} weight="bold" />
                  </button>
                </Window>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={toggle}
            onPointerEnter={warmMeows}
            onFocus={warmMeows}
            aria-expanded={open}
            className="flex flex-col items-center gap-1 rounded-xl px-4 py-3 text-center transition-colors hover:bg-white/5"
          >
            {open ? (
              <FolderOpen size={44} weight="fill" className="text-accentInk" />
            ) : (
              <Folder size={44} weight="fill" className="text-content/70" />
            )}
            <span className="text-sm text-muted">do not open</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
