---
name: verify
description: Build and drive this portfolio site locally to verify changes at runtime.
---

# Verify this portfolio

## What the site is

One published page: **`/` is the console** (content is the CMS global
deep-merged over `lib/defaultContent.ts`, loaded by `lib/getContent.ts`). A
game console home screen: a power-on intro and player choice on every load,
two tabs of tiles, cards, background music, milestones, visitor profiles, and
a controller-first archery game ("70 m"). No Flocon: player two is "the
Spotter", an anonymous friend. Code in `components/console`; it is always dark
(the `.console` wrapper redefines the colour tokens) and it is indexed.
`components/layout/Shell.tsx` gives every route except `/admin` the bare
console shell; only the editor keeps the poster site's chrome.

Two other versions are parked in `drafts/` (see `drafts/README.md`) and are
**not built**: the poster site with Flocon as narrator (`drafts/poster`,
`components/sections`) and the quiet desktop (`drafts/quiet`,
`components/quiet`). Their sections below only apply if one is brought back.
The console still borrows `Clock` and `MailForm` from `components/quiet`.

Shared rules:

- Flocon is only ever a still photo cut-out. She never moves and is never
  drawn. Expressions crossfade. She is not in `/console` at all (Abdullah has
  second thoughts about showing his cat).
- No em or en dashes, no "Junior", email `hello@m-abdullah.com`, copyright
  `2026 - Abdullah Mohamed`, no years on projects.
- Narrator: `context/VoiceContext.tsx` sets `html[data-voice="cat"]`; copy
  comes from `lib/catCopy.ts` by content path through `useCopy` / `useCopyFn`.
  The accent is ginger for Abdullah and eye green for Flocon.

## Build (static export, same as Cloudflare Pages)

```
npm run build          # scripts/build.mjs -> next build -> out/
```

**Gotcha:** the build script renames `app/(payload)` etc. before building. If a
`next dev` server for this repo is running, the rename fails with EPERM. Do not
kill a dev server Abdullah started. Instead mirror the repo to a scratch
directory (robocopy `/MIR`, excluding `node_modules .next out .git`), junction
`node_modules` into it, and build or run `next dev -p <port>` there.

**Gotcha:** do not assume port 3000 is this project. Abdullah runs several
projects; check the process's command line before loading or typing into it.

**Gotcha:** a dev server started before a `tailwind.config.ts` change keeps the
old config. Restart it, or new colour and font-size utilities are missing.

## Serve + drive

- Serve `out/` with any static server. Cloudflare Pages serves `out/404.html`
  for unknown paths; a bare static server may not.
- No Playwright browsers are installed; use the copy at
  `C:/Dev/mau-foot/node_modules/playwright` with `channel: 'msedge'`.
- Use `waitUntil: 'domcontentloaded'` plus a fixed wait; `networkidle` hangs.
- Poster site: seed `sessionStorage['am-seen']='1'` to skip the intro curtain, and
  `localStorage['am-theme']` to pick a theme.
- Console: nothing skips the power-on and player choice; drive them (press,
  press again to skip the intro, pick a player). Milestones live in
  `localStorage['am-console-milestones:<player id>']`.

## Flows worth driving

### Poster site (parked in drafts/poster)

- Intro: first visit shows `#intro` (count to 70 m), gone within about four
  seconds, skipped on reload in the same tab and under reduced motion.
- Hero: the longest headline line fills the container exactly (sized from
  `lib/typeMetrics.ts`) and the whole hero fits one viewport at every size.
- Narrator switch (`button[role="switch"]`): curtain, `data-voice="cat"`,
  green accent, h1 becomes "Head of QA, Nap expert, Abdullah's boss.", margin
  notes swap to Abdullah. Under reduced motion it swaps at once.
- `#flocon` turnaround: tabs, arrow keys and a horizontal drag each change the
  view. Pointing at a mood changes the portrait.
- `#process`: the distance counter climbs to 70 as the list scrolls.
- `#work`: accordion, first open; closed panels are `inert`.
- `#skills`: the chips fall once the desk is in view (matter.js, lazy); "Tidy
  the desk" puts them back. Under reduced motion they stay a list.
- `#archery`: pinned; a clip-path circle grows from the O of the word to the
  full frame, then the copy fades in. Not pinned under reduced motion.
- `#contact`: empty submit shows two errors and a grumpy Flocon; a valid one
  builds a `mailto:`.
- Footer game: six centre clicks score 60/60 and set off the fireworks.
- Companion (corner): click meows.

### Quiet desktop (parked in drafts/quiet)

- At 1440 wide: one screen, no scroll. Terminal window already typing; icons,
  menu bar and dock open windows (`[data-window="about"]` etc.); title bars
  drag; Escape closes the focused window; paw prints cross the wallpaper every
  so often; about 15 s after the first window opens, one window gets pushed
  and a toast says so (once per visit).
- Below 1024 wide: the stacked page. Sticky note, paw prints on `about.txt`,
  `// QA, F.:` on each project, `tuna_opener` in the stack, ears above the
  mail window.
- Flocon's photo appears nowhere until the "do not open" folder is opened.

### The console (`/`)

- Every load: standby light, then a press powers on (`components/console/Boot.tsx`,
  about 4.4 s; a second press skips it; reduced motion skips it; a gamepad
  press cannot unlock audio, so the "Sound is waiting" notice appears only
  after the intro), then "Who is playing?": Abdullah, the Spotter, up to four visitor profiles, Guest,
  Add user. Nothing skips this.
- Players (`components/console/players.tsx`): each has an accent applied as
  CSS variables on the console root. Visitor profiles live in
  `localStorage['am-console-accounts']`; per-player milestones in
  `am-console-milestones:<id>` and best score in `am-console-best:<id>`.
  The Spotter's telling of the tiles is in `tiles.tsx` (`SPOTTER_TILES`).
- Home: Work tab (8 tiles) and Play tab (70 m, Archery, The Spotter). Right
  off the end of Work runs into Play. South button or Enter on a tile with an
  action (70 m, Contact) runs it; otherwise goes to the cards.
- Keyboard: arrows, Enter, Esc; Q/E tabs, Home first tile, M music, T
  milestones, O quick menu, C copy link, H button guide, P switch player,
  -/= volume, X or Delete removes a profile on the player screen.
- Gamepad (standard mapping): 0 select, 1 back, 2 music, 3 milestones (or
  remove a profile), 4/5 tabs, 6/7 volume, 8 copy link, 9 and 16 quick menu,
  10 first tile, 11 button guide, 17 switch player, right stick flicks the
  cards. Inside dialogs the d-pad steps focus and south clicks. Fake a pad
  with `navigator.getGamepads` returning one with `mapping: 'standard'`, a
  `vibrationActuator.playEffect`, and buttons whose `pressed`/`value` you
  flip; dispatch `gamepadconnected`.
- The game reads the pad itself (the app's handler is paused): left stick
  aim, R2 (button 7 value) draw and release to shoot, L2 steady, 1 leave,
  0 or 2 to shoot again. It ignores input until every button is released
  once, so the press that launched it cannot fire an arrow.
- Music is synthesised (`sound.ts`), never sampled, and changes key per tile.
  It cannot be heard in headless runs; check `am-console-music` instead.
- Navigation writes `state.current` synchronously (`go.*` setters), so key
  presses faster than a render still land correctly. Keep it that way; the
  suite has a rapid-input check for it.
- At `lg` and up the root font size follows the viewport
  (`html:has(.console)`), so the home screen must fit with no overlap between
  the button, the cards and the hint bar at 1024x768 through 2560x1440.

## Motion contract

Every animated component degrades under `prefers-reduced-motion`. **Always run
a pass with `reducedMotion: 'reduce'`** and check for page errors.

- Use `useReduceMotion` from `lib/useReduceMotion.ts`, never framer-motion's
  `useReducedMotion` directly (hydration error #418).
- That value changes one render after mount, so no hook may sit after an early
  `if (reduce) return`.
- When a motion `style` is switched off for reduced motion, pass an explicit
  resting value or change the element's `key`. Passing `undefined` leaves the
  last scroll-driven value (often `opacity: 0`) on the element.
- Never put a motion `style={{ x, y }}` and an `initial/animate` that also
  moves `y` on the same element, and never combine Tailwind `translate-*`
  classes with a motion transform on one element.
- Scroll-linked `opacity`, `clipPath` or `filter`: derive them with a function
  (`lib/ramp.ts`), not `useTransform(progress, [a, b], [c, d])`. framer-motion
  12 hands the range-array form to a native scroll timeline and, for a
  `target` section, binds it to the whole page.
- An element clipped to nothing never counts as in view: put `useInView` on a
  wrapper, not on the clipped element.

## Things that look like bugs but are not

- Reveals replay each time they enter view, so content not yet scrolled to is
  legitimately hidden in a full-page screenshot.
- The floating dark circle at bottom-left is the Next.js dev overlay.
- Copy on the running site can differ from `lib/defaultContent.ts`: stored CMS
  values win.
