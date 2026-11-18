# Drafts

Versions of the portfolio that are kept but not published. Nothing in here is
routed, so `next build` never exports it; the components they use stay in
`components/`.

- `poster/page.tsx`: the poster-style site with Flocon as narrator. It was the
  home page before the console took over. To bring it back, move it to
  `app/(portfolio)/page.tsx` and point `Shell.tsx` back at its chrome.
- `quiet/`: the quiet desktop version. To publish it again, move the folder to
  `app/(portfolio)/quiet/` and add a `/quiet` route branch in `Shell.tsx`.
