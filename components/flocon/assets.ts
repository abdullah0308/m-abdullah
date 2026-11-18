/**
 * Flocon, cut from the character sheet with an AI segmentation model (IS-Net),
 * then edge-cleaned so no dark rim from the sheet shows on light pages. The
 * full-body poses are transparent and work on any surface (the real gaps
 * between her legs are see-through, her body is solid); faces keep the
 * sheet's dark backdrop and are always shown inside a circular frame.
 */
export const FLOCON_POSES = {
  front: { src: "/images/flocon/flocon-front.webp", w: 281, h: 644, label: "Front" },
  q34: { src: "/images/flocon/flocon-q34.webp", w: 475, h: 621, label: "3/4 view" },
  side: { src: "/images/flocon/flocon-side.webp", w: 764, h: 545, label: "Side" },
  back: { src: "/images/flocon/flocon-back.webp", w: 277, h: 590, label: "Back" },
} as const;

export type FloconPose = keyof typeof FLOCON_POSES;

export const FLOCON_FACES = {
  neutral: "/images/flocon/face-neutral.webp",
  curious: "/images/flocon/face-curious.webp",
  profile: "/images/flocon/face-profile.webp",
  grumpy: "/images/flocon/face-grumpy.webp",
  lookup: "/images/flocon/face-lookup.webp",
  shocked: "/images/flocon/face-shocked.webp",
} as const;

export type FloconFace = keyof typeof FLOCON_FACES;

export const faceSrc = (face: string) =>
  FLOCON_FACES[(face as FloconFace) in FLOCON_FACES ? (face as FloconFace) : "neutral"];

export const FLOCON_DESK = "/images/flocon/flocon-desk.webp";

/** Swatches sampled from the character sheet's palette strip. */
export const FLOCON_SWATCHES = [
  { name: "Eye green", hex: "#8E9A4B" },
  { name: "Ear pink", hex: "#E0B49A" },
  { name: "Coat white", hex: "#F1EFEA" },
  { name: "Ginger", hex: "#D9842F" },
  { name: "Tabby brown", hex: "#9A6232" },
  { name: "Soft fawn", hex: "#C9A98C" },
] as const;

