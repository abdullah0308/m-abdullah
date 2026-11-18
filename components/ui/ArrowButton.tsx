import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

/**
 * The pill-plus-circle CTA from the Winzy and Veluno references: a label pill
 * with a detached round arrow that rotates to point straight on hover.
 *
 *   solid   ginger fill, the one primary action in a view
 *   ghost   hairline outline, for the secondary action beside it
 */
export default function ArrowButton({
  href,
  children,
  tone = "solid",
  external = false,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "solid" | "ghost";
  external?: boolean;
  className?: string;
}) {
  const pill =
    tone === "solid"
      ? "bg-accent text-onAccent"
      : "border border-line2 text-content group-hover:bg-content/5";
  const circle =
    tone === "solid"
      ? "bg-accent text-onAccent"
      : "border border-line2 text-content";

  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`group inline-flex min-w-0 max-w-full items-center gap-1 whitespace-nowrap active:scale-[0.98] transition-transform ${className}`}
    >
      <span className={`min-w-0 truncate rounded-full px-6 py-3.5 text-[0.95rem] font-medium transition-colors ${pill}`}>
        {children}
      </span>
      <span
        aria-hidden
        className={`grid h-[3.1rem] w-[3.1rem] shrink-0 place-items-center rounded-full transition-transform duration-500 ease-expo group-hover:rotate-45 ${circle}`}
      >
        <ArrowUpRight size={18} weight="bold" />
      </span>
    </a>
  );
}
