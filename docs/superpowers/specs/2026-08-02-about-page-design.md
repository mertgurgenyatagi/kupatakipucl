# About page — design spec

**Status:** approved (Mert, 2026-08-02 — "Go for it," full autonomy granted to build without further check-ins)
**Branch:** `about-page`

## Purpose

A static `/about` page — the same content in all 8 `VisibilityState`s, no gating. Captures the *essence* of the project (a friend group's UCL prediction pool, the spirit of it) rather than explaining rules or mechanics, and rather than a personal bio about Mert. Single no-scroll viewport, matching the desktop fixed-app-shell convention every other page already follows.

Explicitly out of scope (cut during brainstorming): a detailed scoring/rules explainer, any "about the creator" bio or contact section.

## Content

In order, top to bottom:

1. **Hero**: giant `kupatakip-logo-white.svg` mark + the `#kupatakipucl` wordmark (same two-weight split AppShell's header already uses: `font-[450]` "#kupatakip" + `font-thin` "ucl"), scaled far larger than anywhere else in the app — this page is the one place the mark gets to be the hero.
2. **Essence statement** — a pull-quote paragraph, not an explainer:
   > "Otuz altı takım. Tek bir sıralama. Ve bunu gereğinden fazla ciddiye alan bir avuç arkadaş.
   >
   > Her sezon başında aynı soru ortaya atılır: kim daha iyi biliyor? Kupatakip, bu sorunun cevabını bulmanın yolu — tahminini yap, tabloyu izle, kazananı hatırla."
3. **Key dates strip**: a quiet, factual ticker row — Aug 26 2026 (teams determined / signup closes), Sep 8 2026 (league phase starts — reuse `TOURNAMENT_START_ISO` from `src/home/deadlines.ts` rather than a second literal), Jan 27 2027 (league phase ends), Feb 26 2027 (RO16 draw, round 2 opens), Mar 9 2027 (RO16 begins, round 2 closes). The four non-Sept-8 dates aren't wired anywhere else in the codebase yet; they're real, fixed UEFA-format dates (per project history), declared locally in this component with a comment noting they have no other consumer today — same pattern `TOURNAMENT_START_ISO` itself established.
4. **Back-to-home link**: small, corner-anchored, matching the nav's `font-mono` uppercase link styling.

## Visual design

Established during frontend-design pass, self-checked against generic-AI-slop defaults (see prior turn) — reuses the app's own existing, already-iterated-on design tokens rather than introducing new ones:

- **Color**: `--color_main` bg, `--color_text` primary, `--color_accent` used sparingly (date-strip dividers/emphasis), `--color_gold` for date-strip numerals, existing `--color_blob1/2/3` via `DustHaze` unchanged.
- **Type**: Inter Variable only (the app's singular-typeface rule holds). Hierarchy from weight/tracking/size, not a second family:
  - Hero wordmark: weight 800–900, `clamp(4rem, 9vw, 9rem)`, tight tracking.
  - Essence statement: weight 300 at 1.5–2rem, generous leading; 2–3 words lifted to heavier weight + `color_accent` for rhythm.
  - Date strip: `.tnum` tabular-nums, uppercase, wide tracking — quiet scoreboard-ticker feel, matching the countdown digits' existing `font-mono uppercase tracking-[0.22em]` convention.
- **Layout**: NOT another `Frame`-based bento grid (every other page already does that) — a single asymmetric vertical composition instead: giant centered logo up top (~35–40vh), essence statement in a wide left-aligned column below with generous negative space, date strip anchored near the bottom as a horizontal row, back-link tucked in a corner. `DustHaze` as the full-bleed background, same as `HomeLandingLoggedOut`.
- **Signature motion**: the essence statement's words animate in once on load, each settling from a thin variable-font weight to its resting weight, staggered left-to-right, using the site's `EASE_COTTON` curve (`[0.22, 0.61, 0.36, 1]`, matching `HomeLandingLoggedOut.tsx`'s constant). Skipped entirely under `prefers-reduced-motion` (render at resting weight immediately, no animation), consistent with the rest of the app.

## Architecture

- `src/pages/AboutPage.tsx` — single file, no sub-components needed (fully static content, no data fetching, no visibility-state branching). Follows the same "thin page wrapper" role `HomePage.tsx` plays, but since there's no feature-folder composition needed here, the whole thing lives directly in `pages/`.
- Small local presentational pieces (a `DateChip`) live inline in the same file, matching `HomeLandingLoggedOut.tsx`'s `CountdownDigit` pattern — not extracted since nothing else uses them.
- New route in `src/App.tsx`: `<Route path="/about" element={<AboutPage />} />`, no gating, no `ProfileGate` special-case needed (it already only gates signed-in-but-incomplete users, same as every other route).
- `src/shell/AppShell.tsx`: add `{ path: "/about", label: "Hakkında" }` to all four `NavLink[]` arrays (`NOTSTARTED_LOGGEDOUT_LINKS`, `NOTSTARTED_LOGGEDIN_LINKS`, `STARTED_LOGGEDOUT_LINKS`, `STARTED_LOGGEDIN_LINKS`) so it's always visible in every state, per Mert's answer.
- No `pageAccess.ts` entry — About isn't gated, same as Home (which also has no `PageKey` entry).

## Testing

- `src/pages/AboutPage.test.tsx` — renders the logo, essence-statement text, all five date labels, and the back-to-home link.
- `src/shell/AppShell.test.tsx` — extend existing per-state tests to assert "Hakkında" is present in all four state fixtures (it's the one link that should never be gated, alongside "Ana Sayfa").
- Visual QA: live-verify in-browser at 1536×712 (the established baseline viewport) before calling this done — check no scroll/overflow, no console errors, `prefers-reduced-motion` honored.

## Self-review notes

- No placeholders/TBDs — content, copy, colors, and file layout are all fully specified above.
- No contradiction with the existing `NAV_LINKS`/`pageAccess.ts` split: About follows Home's precedent of being nav-visible but access-ungated.
- Scope is a single page + one nav change; doesn't touch shared state, data model, or other pages' behavior.
