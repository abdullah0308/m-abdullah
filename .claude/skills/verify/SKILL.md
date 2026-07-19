---
name: verify
description: Build and drive this portfolio site locally to verify changes at runtime.
---

# Verify this portfolio

## Build (static export, same as Cloudflare Pages)

```
npm run build          # runs scripts/build.mjs → next build → out/
```

**Gotcha:** the build script renames `app/(payload)` etc. before building. If any
`next dev` server for this repo is running, the rename fails with EPERM — stop
dev servers first (check `Get-CimInstance Win32_Process -Filter "Name='node.exe'"`
for command lines containing `abdullah-portfolio`).

## Serve + drive

- Serve `out/` with any static server (a minimal Node server on port 4173 works;
  `.html` extension fallback needed for clean URLs).
- No Playwright browsers are installed; install `playwright-core` in the
  scratchpad and launch with `channel: 'msedge'` (system Edge, headless).
- `waitUntil: 'networkidle'`/`'load'` can hang — the Skills section loads remote
  Unsplash/jsdelivr images which sometimes stall headless. Use
  `'domcontentloaded'` + a fixed sleep.

## Flows worth driving

- Hero name GSAP reveal on load; scroll to bottom, back to top → it must replay.
- Scroll into each section (`#about #process #skills #archery #contact`) →
  RevealText/SplitText line reveals play; leaving below the fold and re-entering
  must replay them.
- Rapid scroll thrash (top↔bottom ×6), then settle on each section and assert
  no element in view is stuck at low opacity (walk ancestors, multiply opacity).
- WebGL background: one `<canvas>` at ~0.75× viewport size, no console errors.
- Faint decorative elements (e.g. the "01" numeral, `text-gold/10`) are ~10%
  alpha by design — check computed style/inline style, not screenshot pixels.
