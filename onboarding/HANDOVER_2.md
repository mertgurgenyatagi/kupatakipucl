# Kupatakip UCL — Handover

**Written:** 2026-07-22, after a long frontend-design session that took the leaderboard page from zero styling all the way to done — and Mert explicitly named it the **calibration baseline** for every other page's visual polish. If you're picking this up cold — new session, new agent, whatever — read this whole file before touching anything. It's written to be self-contained; you shouldn't need to re-derive any of this from git archaeology.

**If you're reading this because a previous session ran out of room:** the single most important fact in this file is §0. Read that first.

---

## 0. ⚠️ Uncommitted work — read this before doing anything else

You are on branch **`frontend-shadcn`**, not `main`. As of this writing, **nothing from this entire session's leaderboard-page work is committed.** `git status` shows:

- 23 modified tracked files (styles, TeamTable, LeaderboardTable, LeaderboardCells, StatWidget, LeaderboardPage, AppShell, DESIGN-SPEC.md, DESIGN.md, package.json, etc.)
- 1 deleted file: `src/leaderboard/PickCorrectnessCard.tsx` (the hover-popup component, replaced by a highlight interaction — see §3)
- Several new untracked files: `src/leaderboard/LeaderboardHero.tsx`, `src/leaderboard/TeamCrest.tsx`, `src/predictions/clubBadgeSlugs.ts`, `scripts/crop-hero-images.mjs`, `scripts/import-club-badges.mjs`
- Untracked asset directories: `public/` (fonts, club-badges, hero images, brand logo — all live, referenced assets), `assets/` (11MB — raw source material Mert dropped in: club badge SVGs, hero photos, the logo-to-invert, example widget screenshots), `team_logos/` (160KB — looks like an earlier/alternate PNG crest source, superseded by `public/club-badges/` SVGs, probably safe to ignore or delete but wasn't explicitly resolved)
- `PAGE_BRIEFING.txt` — untracked, appears to be Mert's own working notes for this session's brief; check it before deleting anything
- `.playwright-mcp/` — scratch screenshot directory, safe to delete, gitignore it if it isn't already

**Typecheck is clean and all 244 tests pass** as of the end of this session (verified via `npx tsc --noEmit` and `npx vitest run`). The working tree is in a good, functional state — it just hasn't been committed. Per standing git-safety defaults, commits happen only when explicitly asked; that hasn't happened yet this session. **Ask Mert whether to commit (and how to split it — this is a lot of unrelated-looking changes bundled into one working tree) before doing anything destructive to this branch.**

---

## 1. What this project is

Kupatakip UCL (`#kupatakipucl`) is a Turkish-language website where ~30-50 participants submit predictions for the UEFA Champions League league-phase rankings (and later the knockout bracket), then get scored against actual results. It's a from-scratch sequel to a prior "#kupatakip" edition — no code reuse, only feature concepts carried over. Mert is both the operator and a participant.

The canonical spec is **`SPEC.md`** at the repo root — functional rules, copy, UX-state definitions. **`DESIGN-SPEC.md`** is the separate, equally canonical visual spec (see §2). Read both before making product or design calls this handover doesn't cover.

**Hard real-world dates** (from `SPEC.md`, all real, not placeholders):
- Aug 26, 2026: league-phase teams determined / sign-up cutoff.
- Sept 8, 2026: league phase starts, round-1 submissions close. **Site must be ready by Aug 26.**
- Jan 27, 2027: league phase concludes.
- Feb 26, 2027: RO16 draw, round-2 submissions open.
- Mar 9, 2027: RO16 begins, round-2 submissions close.

**Scoring:** Round 1 — per team, 3 points if `|predicted position − actual position| < 3`. Round 2 (knockout) — 3/4/5/6 points for correctly predicting a team reaches QF/SF/final/is champion.

**Visibility model:** 4 states = tournament (not-started/started) × user (logged-in/not), each seeing a different nav/page set. `src/state/visibilityState.ts` + `src/state/pageAccess.ts`.

All 6 functional units (auth+shell, predictions, leaderboard, chat, forum, stats) are built and merged to `main` from a prior session. Unit 7 (results automation) was explicitly, permanently skipped in favor of dev-panel tooling (see §5). None of that changed this session — this session was pure visual design work.

---

## 2. Design direction — `DESIGN-SPEC.md`

Separate from `SPEC.md`, this is the living visual-direction doc, built the same iterative-questionnaire way `SPEC.md` was. It converged (per a prior session) on: an **editorial/print-credibility register** (serif-mostly type, "news website" feel) crossed with **private-club/executive materiality** (engraved-plaque, executive-pen feel, UEFA navy+white), balanced against genuine football-fan warmth so it never tips into corporate/institutional territory — Mert's own words: "don't let the fun get away," "I'm trying to warn you against creating an FBI recruitment program, this is a game." Cotton (jersey/scarf material) is the human counterweight to the pen/plaque/paper world. `DESIGN-SPEC.md` §0 governs every other section — read it before making a visual call it doesn't already cover.

This session modified `DESIGN-SPEC.md` and `DESIGN.md` further (37 and 23 lines respectively) as the leaderboard build surfaced new concrete decisions — read the diffs, not just the file, to see what's new versus what predates this session.

---

## 3. This session's actual work — the leaderboard page, start to finish

Starting point: zero styling anywhere (Tailwind v4 + shadcn/ui had just been scaffolded, base leaderboard/shell composition existed but bare). By the end of this session, Mert declared the leaderboard page **done** and said explicitly:

> "The reason I spent so so so long on this page is because I want this page to serve as a baseline for what I am comfortable with... by micromanaging this page, I feel a bit more comfortable giving you the go on other pages."

**Treat everything below as the house style for the rest of the site, not a one-off.**

### What got built, roughly in order
1. **Fonts**: several false starts (a TT Commons Pro demo font had deliberately corrupted glyphs — `+`/`-`/`/`/digit-`4` all rendered as `±`; then Martel Sans) before landing on **Inter** (`@fontsource-variable/inter`, one variable-font family for everything — display/heading/body/mono all point at it). `public/fonts/` is now **dead** — leftover from the discarded attempts, nothing references it, safe to delete but wasn't explicitly cleaned up.
2. **Real club badge SVGs** (`public/club-badges/`, sourced from `assets/club_badges/`) replacing PNG crests, randomly assigned per team via `src/predictions/clubBadgeSlugs.ts` (the real team list will eventually be replaced, so the exact mapping doesn't matter — see `scripts/import-club-badges.mjs`). `TeamCrest.tsx` is the shared square-badge component (deliberately not circular like participant avatars).
3. **Site logo**: a provided UCL-style logo SVG, inverted to white, used as the header brand mark.
4. **`LeaderboardHero.tsx`**: three portrait photos (`public/hero/`, pre-cropped to a 3:2 height:width box via `scripts/crop-hero-images.mjs`) cross-fading in place, 7s per image, no zoom — fills the exact grid cell the 3 stat widgets used to occupy. The stat widgets themselves (`StatWidget.tsx`) **still exist and still work**, just aren't rendered on this page anymore — they're earmarked for a not-yet-built stats page (Mert: "which I have changed my mind on, we WILL have that" — so this is confirmed future scope, not dead code).
5. **`TeamTable.tsx`**: a from-scratch CSS-Grid "table" (not an HTML `<table>`) — `role="table"/"row"/"columnheader"/"cell"` on plain divs, uniform fixed-width stat columns (`1.75rem`, identical padding header/body), so the table is symmetric by construction rather than tuned per-column. A hard-left/rounded-right colored oblong to the left of each rank number signals qualification band (green = direct to RO16, positions 1-8; orange = playoff round, 9-24; nothing for eliminated, 25-36) via `qualificationBand()`. Rank numbers are unpadded (single digit under 10, not zero-padded).
6. **Color palette** — iterated hard, twice. First landed on a literal 3-hex spec Mert gave directly (`26251E` background / `5A5852` "navy" / `E6E5E0` "white"), then fully reworked again by live-extracting **cursor.com's actual dark-mode computed colors** via Playwright (`getComputedStyle()` against the real site, not eyeballed) and remapping the same token *names* in `src/styles/index.css` to those real values. Token names stay stable; only values change — this is the established pattern for any future palette work.
7. **Hover interaction redesign**: originally hovering a leaderboard participant opened a `PreviewCard` popup (`PickCorrectnessCard.tsx`) showing their correct picks. Mert asked for this removed entirely in favor of a live **faint green highlight on the matching rows of the team table itself** — hover state is lifted to `LeaderboardPage.tsx` (`hoveredUid`), `highlightedTeamIds` computed via `evaluatePicks()` and passed down to `TeamTable`. `PickCorrectnessCard.tsx` is now deleted.
8. Fixed a real, systemic bug found late: `text-navy-text` (meant for text rendered *on top of* the navy-colored token) was being used as a "light/emphasis" text color in several places rendered on the *default dark background* instead — since the palette rework made navy itself dark, this made numbers/text nearly invisible. Fixed by switching those specific usages to `text-ink` across `TeamTable.tsx`, `LeaderboardTable.tsx`, `StatWidget.tsx`, `PickCorrectnessCard.tsx` (before its deletion), `LeaderboardCells.tsx`. **If you ever see near-invisible text again, check whether it's `text-navy-text` used outside an actual navy-toned surface — this exact bug already happened once.**

### Standards established this session — apply by default on future pages
- **Real browser viewport for visual QA is `1536×712`**, not Playwright's default. Browser chrome (tabs/address bar) plus the OS taskbar eat real vertical space on Mert's machine; his own screenshot proved the mismatch. Always resize Playwright to this before judging "does it fit / does it scroll."
- **Root-cause over patching.** When something visually misaligns, measure it (`getBoundingClientRect()` diffs between the two things that should line up) to find the actual cause rather than nudging padding until it looks right by eye. Mert explicitly rejected padding-patch attempts twice: *"DON'T ADD PADDINGS HERE AND THERE. NORMALIZE EVERYTHING."* A real example: a table misalignment that looked like a padding problem was actually a reserved-but-invisible sort-icon slot in the header with no equivalent space in the body — fixed by removing the phantom space, not by adding compensating padding.
- **The CSS-Grid "table" pattern** (see point 5 above) is the standard way to build any data-table UI here going forward, not just this one.
- **Design tokens keep stable names, only values change.** `color-mix(in oklch, ...)` derives muted/border/hover variants from the small base palette rather than introducing new hex values ad hoc.
- **Verify live in-browser before calling something done** — real viewport, check for console errors, check for zero unwanted scroll/overflow. Typecheck and tests passing is necessary but not sufficient.

---

## 4. Tech stack (updated)

- **React 18 + TypeScript + Vite**, `HashRouter` — unchanged, still hash-routed for the eventual GitHub Pages subfolder migration (still deliberately not done yet).
- **Firebase**: Auth (Google), Firestore, Storage. Project id `kupatakipucl`. Unchanged this session.
- **Tailwind v4 + shadcn/ui** (base-ui primitives) — scaffolded just before this session, now the actual design system in active use. `src/components/ui/frame.tsx` (`Frame`/`FrameHeader`/`FrameTitle`/`FrameMeta`/`FrameBody`) is the shared card primitive reused everywhere, including the new hero carousel.
- **`@fontsource-variable/inter`** — the one and only font family site-wide (replaced two earlier, abandoned choices this session — see §3.1).
- **Vitest + React Testing Library** — same conventions as before (module-level `vi.mock`, `act()`-wrap async callbacks). 244 tests passing as of end of session.
- **`@dnd-kit/*`** — unchanged, still the drag-to-rank library for predictions.
- **Playwright MCP** (`@playwright/mcp`, user-scope) — the actual tool used for all live visual verification this session, at the 1536×712 viewport (see §3).

---

## 5. The dev-panel (unchanged this session)

Built in a prior session in lieu of results automation (unit 7, explicitly skipped). `/dev`-gated route (`src/devpanel/DevPanel.tsx`, `import.meta.env.DEV`-gated, cannot run in prod), lets you force tournament-started/not-started and logged-in/logged-out state, and step through all 144 real league-phase fixtures with sequential-unlock outcome-picking. `src/devpanel/standings.ts` had a small diff this session (14 lines) — check `git diff` if you need to know exactly what changed there, wasn't the session's main focus.

Remote control without a browser: `scripts/set-dev-config.mjs tournament post|pre|auto`, `login in|out|auto`, `date <YYYY-MM-DD>|auto` — writes straight to Firestore via `gcloud auth print-access-token`, no service account needed. Full detail in git history / prior session context if needed; not re-explained here since nothing about it changed.

Reachable at `http://localhost:5173/#/dev` (note the `#`, it's `HashRouter`).

---

## 6. Known gaps / things not to "fix" without asking

- **Everything in §0 is uncommitted.** Don't assume `main` reflects any of this session's work — it doesn't yet.
- **`public/fonts/` is dead weight** (§3.1) — safe to delete, wasn't done automatically since it's a destructive cleanup outside this session's actual ask.
- **`team_logos/` (untracked, 160KB) looks superseded** by `public/club-badges/` but was never explicitly resolved — ask before deleting, might be Mert's reference material.
- **Only the leaderboard page has been through this design pass.** Predictions, chat, forum, stats, home, and the app shell nav itself (`AppShell.tsx` did get some changes this session, but check whether that's shell-wide polish or leaderboard-specific spillover) have NOT been confirmed done to this standard. Don't assume they're styled just because the leaderboard is.
- **`StatWidget.tsx` is intentionally unused right now** — don't delete it or "clean it up" as dead code. It's reserved for a stats page Mert confirmed he wants built.
- **The pre-existing gaps from the dev-panel era still apply** (display-only date override, a minor self-correcting race in `useDevMatches`, the loosened `results` Firestore write rule with no expiry, no code-splitting on the dev-panel bundle) — none of these were touched this session, see prior git history / SPEC docs if you need the detail.

---

## 7. Where to find more context

- `SPEC.md` — canonical functional spec.
- `DESIGN-SPEC.md` — canonical visual spec (§2 above).
- Claude's persistent memory system (outside this repo): `project_kupatakip_ucl.md` has this same narrative written for Claude's own future recall, most recently updated with the "leaderboard is the calibration baseline" note from this session. Also cross-linked: `feedback_verification_standards.md` (root-cause fixes, Mert spot-checks output himself), `feedback_design_questionnaire_pacing.md`, `feedback_asset_sourcing.md` (Mert sources real fonts/icons/images himself — don't downgrade to system fonts/emoji out of caution).
- Git history on `main` is linear and descriptive. This session's work is **not yet on `main`** — it's uncommitted on `frontend-shadcn` (§0).

---

## 8. What's next

1. **Decide what to do with the uncommitted `frontend-shadcn` work** — commit (probably in more than one logical commit given how much is bundled together), then decide whether/when to merge to `main`.
2. **Apply the same design pass to the rest of the site** — predictions flow, chat, forum, stats, home — using the leaderboard page (§3) as the explicit calibration reference, not starting from a blank slate of taste each time.
3. Clean up the loose ends in §6 if/when Mert confirms them (dead `public/fonts/`, ambiguous `team_logos/`).
