/**
 * Flocon's voice: four real recordings (BigSoundBank, CC0). Nothing is
 * fetched until someone reaches for her (`warmMeows`) or she is asked to
 * speak, and she never says the same thing twice in a row.
 */
const SRCS = [1, 2, 3, 4].map((n) => `/sounds/meow-${n}.mp3`);

let clips: HTMLAudioElement[] | null = null;
let last = -1;

export function warmMeows() {
  if (clips || typeof Audio === "undefined") return;
  clips = SRCS.map((src) => {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = 0.7;
    return a;
  });
}

export function meow() {
  warmMeows();
  if (!clips?.length) return;
  let k = Math.floor(Math.random() * clips.length);
  if (k === last) k = (k + 1) % clips.length;
  last = k;
  clips.forEach((a) => a.pause());
  const a = clips[k];
  a.currentTime = 0;
  a.play().catch(() => {
    /* sound blocked or unavailable: she just shows it */
  });
}
