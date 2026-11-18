/**
 * Advance widths of the display face (Archivo, weight 800, width 62%) in
 * thousandths of an em, measured in a browser. Uppercase only, because the
 * poster type is always set in capitals.
 *
 * Knowing how wide a string will be lets the hero size its headline to fill
 * the page width exactly with plain CSS (`100cqw / widthInEm`), with no
 * measuring script and no layout jump after hydration. It also keeps working
 * when the copy is edited in the CMS.
 */
const ADVANCE: Record<string, number> = {
  A: 500, B: 482, C: 505, D: 503, E: 452, F: 395, G: 532, H: 504, I: 243,
  J: 426, K: 501, L: 411, M: 677, N: 508, O: 543, P: 472, Q: 543, R: 498,
  S: 454, T: 458, U: 495, V: 473, W: 703, X: 487, Y: 480, Z: 463,
  "0": 427, "1": 361, "2": 417, "3": 424, "4": 414, "5": 426, "6": 427,
  "7": 373, "8": 415, "9": 427,
  " ": 117, ".": 212, ",": 212, "'": 199, "’": 198, "!": 258, "?": 409,
  "&": 534, "-": 240, ":": 221, ";": 221, "/": 271,
};

/** Width of `text`, set in capitals, in em. Unknown glyphs count as 0.5em. */
export function emWidth(text: string): number {
  let w = 0;
  for (const ch of text.toUpperCase()) w += ADVANCE[ch] ?? 500;
  return w / 1000;
}

/**
 * The "face in the O" swaps the letter O (0.543em) for a round portrait as
 * tall as a capital (0.68em) with a hair of space either side.
 */
export const FACE_O_EXTRA = 0.2;
