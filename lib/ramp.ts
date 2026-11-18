/**
 * A clamped linear ramp for scroll-linked values: 0..1 progress in, a number
 * between `a` and `b` out, moving only while progress is between `from` and
 * `to`.
 *
 * Use it as the transformer for useTransform (a function, not a pair of
 * range arrays) whenever the output drives `opacity`, `clipPath` or `filter`.
 * framer-motion hands range-array versions of those to a native scroll
 * timeline, and for a `target` section it binds that timeline to the whole
 * page, so the value tracks page progress instead of the section's.
 */
export const ramp = (from: number, to: number, a: number, b: number) => (v: number) => {
  const p = Math.min(1, Math.max(0, (v - from) / (to - from)));
  return a + (b - a) * p;
};
