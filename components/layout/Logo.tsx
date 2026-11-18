/**
 * The AM mark, drawn as a CSS mask so it takes `currentColor` and reads in
 * both themes (the source SVG has a white "A" that vanishes on light).
 */
export default function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block bg-current ${className}`}
      style={{
        WebkitMask: "url('/images/AM%20Web%20Logo.svg') center / contain no-repeat",
        mask: "url('/images/AM%20Web%20Logo.svg') center / contain no-repeat",
      }}
    />
  );
}
