"use client";

import { useState } from "react";
import { CaretDown, PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { useSiteContent } from "@/context/SiteContext";
import { useVoice } from "@/context/VoiceContext";
import ArrowButton from "@/components/ui/ArrowButton";
import EditableText from "@/components/ui/EditableText";
import Face from "@/components/ui/Face";
import Reveal from "@/components/ui/Reveal";
import RevealText from "@/components/ui/RevealText";
import type { FloconFace } from "@/components/flocon/assets";

type Errors = Partial<Record<"name" | "message", string>>;

/**
 * The ask, written as a sentence with blanks in it: your name, what you
 * need, and the short version of the project. The site is a static export
 * with no mail backend, so the form is honest about what it does: it builds
 * the email and hands it to the visitor's own mail app. Flocon reacts to
 * each stage (idle, typing, a gap, sent) with a change of expression.
 */
export default function Contact() {
  const { content } = useSiteContent();
  const { contact, meta } = content;
  const { t } = useVoice();

  const [name, setName] = useState("");
  const [need, setNeed] = useState(contact.formNeeds[0] ?? "");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [focused, setFocused] = useState(false);
  const [sent, setSent] = useState(false);

  const hasErrors = Object.keys(errors).length > 0;
  const face: FloconFace = sent ? "shocked" : hasErrors ? "grumpy" : focused ? "curious" : "neutral";
  const status = sent
    ? contact.sentLine
    : hasErrors
      ? t("Flocon found a gap in the form.", "You missed a bit. I noticed.")
      : focused
        ? t("Flocon is reading over your shoulder.", "I am reading over your shoulder.")
        : t("Flocon will make sure it gets read.", "I will make sure he reads it.");

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

  // A blank in the sentence: no box, just a rule to write on.
  const blank =
    "max-w-full rounded-none border-0 border-b-2 bg-transparent px-1 pb-0.5 text-accentInk outline-none transition-colors placeholder:text-muted/70 focus:border-accent focus-visible:outline-none";

  return (
    <section id="contact" className="px-4 pb-24 pt-24 sm:px-8 lg:px-12 lg:pb-32 lg:pt-36">
      <div className="mx-auto max-w-[1760px]">
        <h2 className="mega text-m1 [text-wrap:balance]">
          <RevealText path="contact.heading" className="block" />
          <RevealText path="contact.headingHighlight" className="ink-accent block" delay={0.12} />
        </h2>

        <div className="mt-14 grid gap-14 lg:mt-20 lg:grid-cols-12 lg:gap-8">
          <Reveal className="min-w-0 lg:col-span-8">
            <form
              onSubmit={submit}
              noValidate
              onFocus={() => setFocused(true)}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
              }}
            >
              <div className="font-display text-[clamp(1.5rem,3.2vw,2.85rem)] font-semibold leading-[1.5]">
                <p>
                  {t("Hi Abdullah, I'm", "Dear Abdullah (and Flocon), I'm")}{" "}
                  <label htmlFor="c-name" className="sr-only">
                    Your name
                  </label>
                  <input
                    id="c-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="your name"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "c-name-err" : undefined}
                    style={{ width: `${Math.max(8.5, name.length * 0.62 + 1.5)}ch` }}
                    className={`${blank} ${errors.name ? "border-danger" : "border-line2"}`}
                  />{" "}
                  {t("and I'd like to talk about", "and I need your human for")}{" "}
                  <label htmlFor="c-need" className="sr-only">
                    What you need
                  </label>
                  <span className="inline-flex max-w-full items-baseline whitespace-nowrap">
                  <span className="relative inline-block min-w-0">
                    <select
                      id="c-need"
                      value={need}
                      onChange={(e) => setNeed(e.target.value)}
                      className={`${blank} appearance-none border-line2 pr-[1.1em]`}
                    >
                      {contact.formNeeds.map((n) => (
                        <option key={n} value={n} className="bg-surface text-base text-content">
                          {n}
                        </option>
                      ))}
                    </select>
                    <CaretDown
                      aria-hidden
                      weight="bold"
                      className="pointer-events-none absolute right-1 top-1/2 h-[0.5em] w-[0.5em] -translate-y-1/2 text-accentInk"
                    />
                  </span>
                  .
                  </span>
                </p>
                <p className="mt-2">
                  <label htmlFor="c-msg">{t("The short version:", "Keep it short:")}</label>
                </p>
              </div>

              <textarea
                id="c-msg"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={!!errors.message}
                aria-describedby={`c-msg-help${errors.message ? " c-msg-err" : ""}`}
                placeholder="A booking site for a guesthouse in Grand Baie, ready before the winter season."
                className={`${blank} mt-3 block w-full resize-none text-lg leading-relaxed text-content placeholder:text-muted sm:text-xl ${
                  errors.message ? "border-danger" : "border-line2"
                }`}
              />

              <div className="mt-3 space-y-1 text-sm text-danger" aria-live="polite">
                {errors.name && <p id="c-name-err">{errors.name}</p>}
                {errors.message && <p id="c-msg-err">{errors.message}</p>}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-5">
                <button
                  type="submit"
                  className="group flex items-center gap-2.5 rounded-full bg-accent px-7 py-4 font-medium text-onAccent transition-transform active:scale-[0.98]"
                >
                  Send via email
                  <PaperPlaneTilt
                    size={18}
                    weight="bold"
                    className="transition-transform duration-500 ease-expo group-hover:-translate-y-0.5 group-hover:translate-x-1"
                  />
                </button>
                <div className="flex items-center gap-3">
                  <Face face={face} className="h-12 w-12" sizes="48px" />
                  <p aria-live="polite" className="max-w-[26ch] text-sm leading-snug text-muted">
                    {status}
                  </p>
                </div>
              </div>
              <p id="c-msg-help" className="mt-5 text-sm text-muted">
                <EditableText path="contact.formNote" />
              </p>
            </form>
          </Reveal>

          <Reveal delay={0.12} className="min-w-0 lg:col-span-4">
            <p className="max-w-[44ch] leading-relaxed text-muted">
              <EditableText path="contact.body" />
            </p>
            <a
              href={`mailto:${meta.email}`}
              className="mt-8 inline-block break-all font-display text-[clamp(1.3rem,2vw,1.9rem)] font-semibold leading-tight underline decoration-line2 decoration-1 underline-offset-[8px] transition-colors hover:decoration-accent"
            >
              {meta.email}
            </a>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <ArrowButton href={meta.linkedin} tone="ghost" external>
                {contact.ctaLabel}
              </ArrowButton>
              <div className="text-sm">
                <div className="font-medium">
                  <EditableText path="contact.captionName" />
                </div>
                <div className="text-muted">
                  <EditableText path="contact.captionRole" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
