# Kupatakip UCL — Handover 3 (the giant one)

**Written:** 2026-07-28. This supersedes `HANDOVER.md` (2026-07-21, end of backend/data-plumbing phase) and `HANDOVER_2.md` (2026-07-22, end of the leaderboard-page calibration pass) — both are still worth reading for their blow-by-blow detail of those two specific sessions, but everything factual in them is folded in here too. If you're picking this up cold — new session, new agent, whatever — read this whole file before touching anything. It is written to be self-contained: project mission, full build history, current exact state, the design system's real (sometimes messy) evolution, and — because this file was explicitly requested to cover it — how Mert works and what he expects from whoever (human or model) picks this up next.

---

## 0. ⚠️ Uncommitted work right now — read this first

As of this writing there is a large, fully-working, but **entirely uncommitted** change sitting on top of `main` (branch is `main` itself — this wasn't done on a feature branch). `git status` shows ~70 modified tracked files and 7 new untracked files. **Typecheck is clean (`tsc -b`) and all 562 tests pass (`vitest run`).** Nothing is broken; it just hasn't been committed yet, per the standing rule that commits happen only when explicitly asked (§9 below).

What's in this uncommitted diff, in short: a full color-system rename + centralization (every color in the app now lives in one new file, `src/styles/colors.css`, with human-readable names Mert chose himself), a new `/dev/color-tuner` page for live palette experimentation, an `ErrorBoundary`, a signup back-button, an OG-image/favicon pass, and Turkish-language fixes — this is the tail end of triaging `onboarding/NOT_STARTED_REVIEW.md` (a 12-item self-audit Claude wrote and Mert then graded item-by-item: fix/don't-fix/fix-with-a-twist). Full detail in §6.5 below. **Don't assume any of §6.5's work is "shipped" in the sense of being on a clean, reviewed `main` — it's real, tested, and live in the dev server, just not committed.**

---

## 1. What this project is

Kupatakip UCL (`#kupatakipucl`) is a Turkish-language website where ~30–55 of Mert's friends submit predictions for the UEFA Champions League — first the league-phase final rankings, later the knockout bracket — and get scored against real results as the tournament actually plays out. It's a from-scratch sequel to a prior "#kupatakip" edition (World Cup, not UCL) — no code carried over, only feature concepts. **Mert is both the site's sole operator/admin and a participant himself.** There is no prize on the line — bragging rights only.

### Hard real-world dates (all real, Europe/Istanbul time, not placeholders)
| Date | Event |
|---|---|
| Aug 26, 2026 | League-phase teams determined. **Site must be live and sign-up open by this date.** |
| Sept 8, 2026 | League phase starts. Sign-up and round-1 predictions close permanently. |
| Jan 27, 2027 | League phase concludes. |
| Feb 26, 2027 | RO16 draw. Round-2 (knockout) predictions open. |
| Mar 9, 2027 | RO16 begins. Round-2 predictions lock. |

### Scoring
- **Round 1 (league phase):** per team, `|predicted position − actual position| < 3` → 3 points.
- **Round 2 (knockout):** a full bracket fill-in (pick the winner of every match RO16→final, not just flat stage guesses). Per team: correctly predicted to reach QF → 3 pts, SF → 4 pts, Final → 5 pts, Champion → 6 pts.
- One combined leaderboard, both rounds together. Ties just tie — no tiebreaker, deliberately.

### The tournament-phase model (this changed significantly — see §4)
Originally a simple pre/post-Sept-8 split. As of the pagemap questionnaire series (starting 2026-07-24) this became **four real phases**: `notstarted → leaguephase → preknockout → knockout`. Critically, this is **not calendar-computed** — Mert flips it by hand once each transition genuinely happens in real life, via direct Firestore edit or the dev panel (`tournamentState/current`, public read, any-signed-in-user write). The hard-dates table above is the *target* for when he'll flip it, not an automatic clock.

The canonical specs, in reading order:
1. **`SPEC.md`** (repo root) — the original, foundational spec. Mission, dates, scoring, sign-up, hosting, admin model, design-direction placeholder. Its own questionnaire phase (8 rounds) formally concluded 2026-07-19.
2. **`PAGEMAP_SPEC.md`** (repo root) — a *later*, separate questionnaire series (started 2026-07-24, driven by filling in `onboarding/pagemap.xlsx`, a full 8-page × 8-visibility-state completion matrix) that **reopened and restructured** several things SPEC.md had already called DECIDED — most importantly the phase model above, and a total rebuild of the Home page / nav / access rules (see §4). Where the two disagree, PAGEMAP_SPEC.md wins and says so explicitly in its own text.
3. **`DESIGN-SPEC.md`** (repo root) — the visual-direction living doc. Has its own tortured history (§5) — **always read its own §0e ("what actually shipped") before trusting anything else in the file**, because two entire prior "DECIDED" design directions (Archivo Narrow + light mode; then a toggleable dark mode) were tried, shipped, and quietly reversed again all within one session, and the doc took time to catch up to what the code actually does.
4. **`onboarding/pagemap.xlsx` / `pagemap.csv` / `pagemap_completion.csv`** — the literal spreadsheet, 8 pages × 8 states, that the pagemap questionnaire rounds were filling in. `pagemap_completion.csv` is a 0–5-or-N/A scorecard Mert explicitly requested as a separate build-completion tracker.
5. **`onboarding/PAGE_BRIEFING.txt`** — Mert's own working notes, page-by-page, written across the design phase. When it conflicts with an older SPEC.md line, PAGE_BRIEFING generally wins (it's later and page-specific) — but the resolution gets written into SPEC.md's changelog explicitly each time, never silently.
6. **`onboarding/BRIEFING.txt`** — the original braindump chapter this whole project started from. Now purely historical; SPEC.md supersedes it entirely.

---

## 2. Tech stack

- **React 18 + TypeScript + Vite**, `HashRouter` (react-router-dom) — hash routing specifically because this will eventually be hosted as a **subfolder** of Mert's existing `mertgurgenyatagi.github.io` GitHub Pages repo (alongside things like `/eventportal/`). That migration is **deliberately not done** — stay in this standalone repo through active development so nothing about his live personal site is at risk while things are still moving.
- **Firebase**: Auth (Google sign-in only), Firestore (all app data), Storage (profile photos + forum images). Real project id `kupatakipucl`. `.env.local` holds real config (gitignored).
- **Tailwind v4 + shadcn/ui** (on `@base-ui/react` primitives) — CSS-first config via an `@theme inline` block in `src/styles/index.css` that auto-generates Tailwind utility classes from `--color-X: var(--Y)` declarations (including automatic opacity-modifier support like `bg-x/50`). This is the actual design system in active use — see §5 for how it got here and §6.5 for its most recent (uncommitted) overhaul.
- **`@fontsource-variable/inter`** — the one and only typeface, site-wide, for every role (display/heading/body/mono). This was not the original plan (§5).
- **`@dnd-kit/*`** — the drag-to-rank library for the league prediction UI (`TeamRanker.tsx`). Don't reach for a different DnD library.
- **`motion`** (Framer Motion's successor package) — used for the signup flow's animated beats and other real motion moments.
- **`lucide-react`** — icon set.
- **`sharp`** (Node, dev-only) — rasterizes the OG-image SVG into a real PNG at build/asset-gen time (`scripts/gen-og-image.mjs`).
- **Vitest + React Testing Library** — 562 tests passing as of this writing. Convention: module-level `vi.mock("firebase/firestore", ...)` per test file, mocking only what that file actually imports; `act()`-wrap any manually-invoked async/snapshot callback.
- **Playwright MCP** (`@playwright/mcp`, installed at user scope) — the actual tool used for all live visual verification across this entire project. Real viewport for judging "does it fit / does it scroll" is **1536×712**, not Playwright's default — established early and never revisited, because browser chrome + the OS taskbar eat real vertical space on Mert's machine.
- **One Cloud Function**: `functions/stopbilling/` — a GCP billing killswitch, unrelated to the main app. Had three real, independent bugs (silently-reverted deploy, wrong export signature, an un-enabled API) all fixed 2026-07-20; source is now version-controlled instead of console-only. See `functions/stopbilling/README.md` if you ever touch it again — redeploy via `gcloud run deploy --source=...`, never the console's "Edit & deploy new revision" flow, which has a demonstrated bug where it silently reverts to a placeholder image.
- **gcloud CLI** is installed and authenticated locally as `thisisfootballstuff@gmail.com` (owner-equivalent on the `kupatakipucl` GCP project). Prefer it over the Cloud Run/Firebase console for anything scriptable — several one-off scripts (`scripts/set-dev-config.mjs`, `scripts/seed-dummy-participants.mjs`) use `gcloud auth print-access-token` against the Firestore REST API directly, no service-account key or `firebase-admin` dependency needed.

---

## 3. How this project actually evolved (chronological, the real story)

This is worth reading in full — the shape of the finished thing does **not** match the shape of the original plan, and knowing where the turns happened will save you from citing something as current that's actually three reversals old.

### Phase 1 — Spec gathering (2026-07-19)
`BRIEFING.txt` → 8 questionnaire rounds in one day → `SPEC.md` "formally concluded." Locked: mission, hard dates, scoring, sign-up rules, hosting plan (GitHub Pages subfolder, late migration), no admin UI (Mert edits Firestore directly for anything results-related), section-by-section build order (auth+shell → predictions → leaderboard → chat → forum → stats → results-automation).

### Phase 2 — Backend build, unit by unit (2026-07-19 → 2026-07-20)
Units 1–6 of SPEC.md's 7-unit order were each built on their own branch, tested, reviewed, and merged to `main` — auth+four-state shell, prediction submission flow, leaderboard/team table, chat, forum, stats. Unit 1 alone used a very heavy independent-implementer + independent-reviewer subagent process (~2 hours wall-clock for a genuinely small deliverable); Mert asked to "dial it back a little" afterward, and every later unit used a lighter, self-directed process instead — see §9 for the standing calibration this produced. **Unit 7 (results automation) was explicitly, permanently skipped** — "not the best time for it right now" — logged as DECIDED-skipped in SPEC.md, not left open. In its place, Mert asked for dev/testing tooling so the site could be exercised without waiting for real match dates: the real 2026-27 36-team list, the real 144-match schedule, and the `/dev` panel (full detail in §7). By the end of Phase 2, `main` had 231 passing tests, a clean `tsc -b`, zero styling anywhere (bare unstyled HTML, `className`-free), and every functional unit done.

### Phase 3 — Visual design begins, first attempt rejected outright (2026-07-21)
Frontend work started via the `impeccable` skill. A `DESIGN-SPEC.md` living doc was built the same iterative-questionnaire way SPEC.md was — but deliberately paced to be **vague and playful**, not convergent (Mert explicitly rejected a round that tried to directly resolve a spotted contradiction, calling it "too specific and stressful," and asked for 15-20 rounds of fun/associative questions instead — see §9). Six rounds in, direction converged on an editorial/print-credibility register (The Telegraph, serif type) crossed with private-club/executive materiality (pen, plaque, UEFA navy+white ~50/50), tempered by two unprompted mid-answer warnings from Mert not to let it tip into corporate/institutional territory ("I'm trying to warn you against creating an FBI recruitment program, this is a game" — now enshrined as DESIGN-SPEC.md §0, which governs every other section).

The **first real shadcn build** (`frontend-shadcn` branch, commit `723d589`) — a full-height navy left masthead, Telegraph-serif editorial ledger — was shown live and **rejected on sight**: *"I'm not a fan of the left panel approach... I think we've leaned too far on the Telegraph/professional/news site aesthetic... Seriously. This is way too corporate."* Confirmed unprompted in the same breath: shadcn itself stays, the correction is about composition/warmth, not the foundation. New structural idea from Mert himself: distinct **framed cells** (an oblong/scrollable-cell composition, not one monolithic page-filling table) — this became the compositional basis for everything after.

### Phase 4 — The rebuild, and two more reversals in the same session (2026-07-21)
The top-bar + frames rebuild landed and got real approval — *"I actually like it! ...we have finally found our base."* Along with it: a live 50-font trial narrowed to **Archivo Narrow** as a single serif-adjacent condensed face, and a constrained-width (1100px) centered content column under a full-width top bar. Same day, a "crazy idea" detour tried a real toggleable dark theme close to actual UEFA branding — tried, shown live, then explicitly discarded (*"Eh, discard the dark mode entirely, keep the light version. Just make the top bar dark blue as well."*).

**Then, still the same session, both of those verdicts got reversed again** — without the doc ever being updated to say so. The actual final commit of that session (`0c1c1f8`, "Finish the leaderboard page") shipped: **Inter** (not Archivo Narrow) as the one variable typeface, and a **permanently dark** theme (not light-with-a-navy-bar) — colors live-extracted from cursor.com's real dark-mode `getComputedStyle()` output via Playwright, not eyeballed. This discrepancy between the doc and the code sat unnoticed until 2026-07-25, when it blocked starting the Home-page build — resolved by adding DESIGN-SPEC.md §0e ("what actually shipped — this is the real current system"), leaving §0c/§0d in the file as explicitly-superseded historical record rather than deleting them. **If you only read one section of DESIGN-SPEC.md, read §0e — everything upstream of it describes intent that did not survive.**

### Phase 5 — Leaderboard declared the calibration baseline (2026-07-21 → 2026-07-22)
A very long, heavily-iterated polish pass on the leaderboard page alone: real club-badge SVGs, an inverted-white site logo, stat widgets replaced by a cross-fading hero-image carousel in the same grid cell, a from-scratch CSS-Grid "table" (`role="table"/"row"/"columnheader"/"cell"` on plain divs, not an HTML `<table>`), multiple full palette reworks, and a hover-interaction redesign (a popup card replaced by a live faint-green highlight on the team table itself). Mert declared it done and said explicitly: *"The reason I spent so so so long on this page is because I want this page to serve as a baseline for what I am comfortable with... by micromanaging this page, I feel a bit more comfortable giving you the go on other pages."* **Everything from this page forward — root-cause-not-patch debugging, the 1536×712 viewport convention, the CSS-Grid table pattern, stable-token-name/changing-value color discipline — became the house standard for the rest of the site, not a one-off.** Fully documented in `HANDOVER_2.md`, which is worth reading in full for this phase specifically.

### Phase 6 — Popups, built with real autonomy (2026-07-23)
With the leaderboard + participant popup both "perfected" as baselines, Mert opened a `team-popups` branch and handed it over completely: *"go to town... do not prompt me for anything... report back once done."* Built a full team dossier popup (position/points/qualification band, real match history + form from `devMatches`, a "who predicted this team" list, an easter egg where 5 crest-clicks flashes the accent color to that team's real color). Then, **the same day**, Mert posted a phone photo of a hand-drawn notebook wireframe and said *"Complete rework. Look at the image and prepare a 20 question questionnaire document for me... I will fill it out. Then you'll implement it."* — a genuinely different workflow from the vibes-first design rounds (technical, concrete, file-based, filled in directly by him). The rework that followed was substantial: half-pitch→full-pitch player markers, the stadium-photo backdrop cut in favor of reusing the already-existing crest asset, the easter egg cut outright, three real ranked stat lists resurrected from an already-built-but-shelved component (`StatWidget.tsx` — he remembered it existed even though it wasn't on screen anywhere, and expected reuse, not a rebuild), and a real two-column layout replacing one stacked column. **Lesson embedded here for future work:** before building any new "ranked list of X" type widget, check for shelved/unrendered components first — this codebase has a real history of "build it, then un-render it when something else takes its slot" (`StatWidget.tsx`, `LeaderboardCells.tsx`), and Mert expects reuse over rebuilding the same shape from scratch.

### Phase 7 — Stats page, dev-panel-adjacent tuners (2026-07-20 → 2026-07-23)
Stats page built deliberately scoped to 2 of DESIGN-SPEC §8d's 6 originally-listed items (most-accurate-predictor ranking, most over/under-predicted teams) — the other 4 explicitly deferred with real justification each (need historical snapshots that can't exist pre-tournament, need round-2 data that doesn't exist yet, need a privacy-preserving server-side aggregation architecture that deserves its own design pass). Later expanded into a 7+6 widget grid, then further tuned. Two live dev-only "tuner" pages were built as reusable pattern: `TeamPopupTuner.tsx` and `StatsPageTuner.tsx`, each rendering the **actual production component** (not a rebuilt lookalike) with every layout constant exposed as a slider, so the tuner and the live app are the same code by construction. This tuner pattern is now the established way to do any layout-dimension experimentation in this codebase — see §7.

### Phase 8 — The pagemap questionnaire series reopens everything (2026-07-24 → 2026-07-25)
A second, separate, later questionnaire series — driven by filling in a literal spreadsheet (`onboarding/pagemap.xlsx`, 8 pages × 8 visibility states) — ran for at least 9 rounds and **substantially restructured** what SPEC.md had called DECIDED:
- The 2-state (pre/post) tournament model became the real 4-phase model (§1).
- **Logged-out visitors now see only Home, full stop, at every phase** — no separate Leaderboard/Stats/Forum destinations for them at all. This was the resolution to a tension flagged since round 1: logged-out Home absorbs the *entire* leaderboard (not a summary) plus a lightweight stats subset plus a plain inline (non-popup) locked-predictions list once things are locked.
- `/chat` and `/predictions` as standalone pages were both slated for deletion, with predictions folding into a Home-triggered popup... and then **`/predictions` reversed course again in round 9** and stayed its own dedicated page after all (raised mid-build, when the popup had never actually been built yet, so nothing needed undoing code-side). `/chat` *did* get deleted for real — see Phase 9.
- Profile became a real, always-revisitable page (name locked forever once set — this reverses SPEC.md's original "editable anytime" — but photo and predictions stay editable per their own lock schedules).
- The knockout prediction became fully independent data from the league prediction, its own bracket-fill-in flow, its own separate lock window (pre-knockout only).
- A whole 24-question sub-round (`chat-widget-round-01`) speced the Home chat widget specifically — including one item that reverses SPEC.md's original "permanent, immutable, no edits or deletes ever" chat stance: senders can now soft-delete their own message only (leaves a "Bu mesaj silindi." placeholder).

**Two full HTML questionnaire artifacts were built for this project** — the vibes-first `design-questionnaires/design-round-NN.md` series for DESIGN-SPEC.md, and a separate one for the pagemap series — both browser-based, redeployed to the same URL each round. Mert was explicit that all pagemap questions must go through that channel, never the native quick-question tool, even for "just one surgical clarification" — see §9.

### Phase 9 — Building the pagemap's restructured pages (2026-07-25 → 2026-07-27, commits `24101c9` → `cdab600`)
In order: a Profile page (photo/name, quiz answers read-only, editable league prediction); Home for logged-out/not-started (animated dust-haze hero, live-feeling slot counter, curved-band sections — built against the site's *actual* shipped dark theme, correcting DESIGN-SPEC.md §0e's staleness in the same commit); the full animated post-signup flow (welcome → photo → name → 6-question quiz, each step with a bouncy checkmark celebration, replacing the old ProfileForm/SurveyForm entirely — quiz moved here per the pagemap restructure, mandatory before first Home visit, abandoning mid-quiz restarts the whole flow rather than resuming); logged-in Home (participants list, a 3-post forum preview cell, a fully-featured chat cell — capped/paginated history, date dividers, per-message timestamps, consecutive grouping, a typing indicator, live online count, @mentions, self-delete, 360-char cap, in-widget search — and the hero carousel reused from the leaderboard page, sized to 60% of an equal quarter-share); then predictions rebuilt as a one-time signup-style flow (editing moved to Profile) plus popup-gating of prediction data until the tournament actually starts, plus an app-wide "Cursorify" pass (§9); then the forum rebuilt entirely (flat replies with live quote-jump instead of nesting, a 3-per-row thread-card grid with clamped previews expanding into a full popup, likes, search, every name linking to that person's profile); then a broad "optimization sweep" (aggressive client-side image compression + session caching to kill loading flicker, a stripped/svgo'd crest SVG that was accidentally 6.5MB, a consistent "Silindi" (deleted) treatment everywhere a deleted account might be referenced, plus real polish on both chat and forum: brass own-name coloring instead of a background fill, click-to-quote in chat that jumps to and highlights the quoted message, scroll position preserved instead of glitching to bottom on new messages, random hero-carousel ordering, and participant popups openable from chat sender names).

### Phase 10 — the current, uncommitted phase (2026-07-27 → 2026-07-28)
Mert asked Claude to review the whole "not started" experience end to end and write an honest, unsparing list of what's still rough — ignoring mobile and ignoring the fact that data is currently fake. That became `onboarding/NOT_STARTED_REVIEW.md` (12 items, biggest-deal-first). He triaged it item by item in one terse message (`fix 1 / don't fix 2 / fix 3, remove the one on the right / ...`), which drove a real implementation pass (§6.5), immediately followed by a from-scratch color-system rename request and a new live color-tuner page (§6.5). **This is where the project stands right now — see §0.**

---

## 4. Current page/access model (as restructured by the pagemap series — this is what's actually true today)

- **Logged-out visitors, any phase:** see **only Home**, full stop. Nav bar for them is just "Home" — no other links exist. Home absorbs the full leaderboard once started (not a summary), a lightweight stats subset, and a plain inline (non-popup) list of everyone's locked predictions (first name + last initial only, not full names — a privacy call Mert made when asked, not the original default). Team popup and match popup are gate-free for everyone regardless of login.
- **Logged-in nav:** Home, Leaderboard, Forum, Stats. Profile is reached by clicking your own avatar/name — deliberately not a nav link.
- **Forum:** logged-in only, every phase, no exceptions (this reverses SPEC.md's original "open to logged-out once started" line).
- **Leaderboard:** blocked entirely pre-start. Once started, stays its own real page for logged-in users (same table format across all three started phases).
- **Stats:** full page stays logged-in + started only. A lighter subset shows on logged-out Home once started.
- **Sign-up:** phase-gated — only possible during `notstarted`. Closes permanently the instant league phase starts, no exceptions, no catch-up mechanism (Mert's explicit stance: he'll handle any real-world edge case personally over WhatsApp, don't over-engineer graceful degradation for it).
- **Predictions:** two entirely independent submissions now, not one bundled flow — the league prediction (its own `/predictions` page, locks permanently at league-phase start) and the knockout prediction (a Home-triggered popup, editable only during pre-knockout). Visibility rule for both: invisible to everyone (even other logged-in users) while still open, visible to all logged-in users once locked.
- **`/chat` as a standalone route: deleted.** Chat now lives only as a widget embedded in logged-in Home.
- **Matchup popup:** still doesn't exist. Mert rejected Claude's "teams + kickoff/score + scorers" default as too thin ("something richer") but hasn't specified what richer means yet — the single biggest genuinely open design question left in the whole project as of PAGEMAP_SPEC.md's last round.

---

## 5. Design system — current state (post color-rename, still largely uncommitted — see §6.5)

**Source of truth for values as of this writing: `src/styles/colors.css`** (new, uncommitted). Every color used anywhere in the app — Tailwind-class colors, raw SVG fills/strokes, the OG-image generator — now resolves back to one of ~24 named custom properties in this one file, each with an inline comment documenting what it's for. The old shadcn/Tailwind token names (`--navy`, `--brass`, `--ink`, `--destructive`, `--border`, `--ring`, etc.) still exist in `src/styles/index.css` but now as thin aliases pointing into the new file — this was a deliberate zero-risk choice so the vendored shadcn primitives in `src/components/ui/` never needed to change.

Key facts worth knowing without reading the whole file:
- **Register: "stats tool, all the way."** Serious, credible, data-forward — personality lives in color/type/motion, not copy.
- **Color identity: UEFA-family navy + white, non-negotiable per Mert** — but see below, the *shipped* system is dark-based, not a literal navy-on-white split.
- **Typography: Inter**, one variable font family, every role. (Not the originally-decided serif pairing, not the later Archivo Narrow pick — both superseded, see Phase 4 above.)
- **Theme: permanently dark, single theme, no toggle.** Ground `#14120B` (now named `--color_main`), elevated surfaces `#1B1913` (`--color_secondary`), text `#EDECEC` (`--color_text`).
- **Accent:** `#1F8A65` (`--color_accent`) — a green, doing double duty as both the general hover/focus accent and (via a new, deliberately duplicated `--color_green` token, same value) the specific "this prediction was correct" signal. These were split into two separate CSS variables on purpose during §6.5's rename, even though they currently hold the same hex — so they can diverge later without another rename.
- **Structural device: framed cells**, not one monolithic layout — Mert's own idea from the first-build rejection (Phase 3), still the compositional basis everywhere.
- **Data tables: CSS Grid with ARIA table roles on plain divs**, uniform fixed-width columns, never an HTML `<table>` with hand-tuned pixel widths.
- **The Cursorify Rule** (named and reused, see §9): no I-beam cursor anywhere on non-interactive text, `cursor-pointer` on everything actually clickable, plain default everywhere else. Documented in `DESIGN.md` §6 as a standing convention, applied app-wide as of the predictions-rebuild commit (`c7ee040`) and expected on every future full page pass without being re-asked.
- **Golden rule on widget chrome:** no titles on stat widgets by default (established during the leaderboard/participant-popup era) — **with a real, explicit exception** for the team popup's three ranked lists, which do carry small Turkish labels because the hand-sketch that drove that rebuild explicitly labeled them. The rule isn't absolute; a fresh, explicit visual spec (a sketch, a direct answer) overrides it.
- **1536×712 is the real verification viewport**, always. Typecheck/tests passing is necessary, never sufficient — verify live in-browser, at that viewport, checking for console errors and zero unwanted scroll/overflow, before calling anything done.
- **`color-mix(in oklch, ...)` derives all "shade of X" tokens** (secondary text, borders, hover fills) from the base palette rather than hand-picked hex values — this is also the mechanism the new `/dev/color-tuner` page reproduces live via percentage sliders.

**If DESIGN-SPEC.md ever seems to contradict what's actually rendering, trust the code and the running site, not the doc — this has happened before (Phase 4) and the resolution both times was to correct the doc, not the app.**

---

## 6. The dev-panel and dev tuners

### `/dev` — the DevPanel (`src/devpanel/DevPanel.tsx`)
Gated behind `import.meta.env.DEV` in `App.tsx` — literally cannot execute in a production build. Built in lieu of results automation (unit 7, permanently skipped) so the site can be exercised without waiting for real match dates. Sections: **Tournament Durumu** (force any of the 4 real phases, or auto/real), **Giriş Durumu** (force logged-in/out independent of the real Firebase session — note this fakes what React renders but Firestore security rules still evaluate the *real* underlying session, so authenticated writes still need a real sign-in), **Güncel Tarih** (display-only readout, no consumer besides tournament phase — don't "fix" this without being asked, it's a known, accepted gap), and **Maçlar** (all 144 real fixtures, sequential-unlock outcome picking, writes straight into the real `results/{teamId}` docs).

Remote control without a browser: `scripts/set-dev-config.mjs tournament <post|pre|auto>`, `login <in|out|auto>`, `date <YYYY-MM-DD|auto>` — writes directly to Firestore via `gcloud auth print-access-token`, no service account needed, picked up live by any open browser tab via `onSnapshot`.

**Deliberate, standing decision:** the dev panel writes into the *real* `profiles`/`predictions`/`results` collections, not separate dev-prefixed ones — justified only by there being zero real users pre-launch. Revisit if the site is ever exposed before this tooling is torn down.

### The tuner pattern — reused four times now
`TeamPopupTuner.tsx`, `StatsPageTuner.tsx`, `HomeLoggedInTuner.tsx`, `ForumTuner.tsx`, and now `ColorTuner.tsx` (§6.5) all follow the same principle: render the **real, actual production component** with synthetic fixture data and every relevant knob exposed as a live control, rather than building a separate lookalike preview. This guarantees the tuner and the live app are pixel-identical by construction, not by careful copying. Each is its own `/dev/*` route, same DEV-only gate. `TeamPopupTuner`/`StatsPageTuner` each have a known, deliberate quirk: their own native `<input type="color">` pickers need a resolved literal hex, not a `var(--color_x)` reference (native color inputs reject `var()` silently), so each has a small local `TUNER_INITIAL` constant that substitutes the literal for just that one field — the real production `DEFAULT_*` constants the live app actually falls back to are untouched.

### Seeded test data
`scripts/seed-dummy-participants.mjs` — already run once against the live project. 50 synthetic participants (`dummy-001`…`dummy-050`), Turkish names, `pravatar.cc` avatars, seeded-random rankings. `dummy-001` is also the fixed uid the `login in` override fakes as signed-in.

---

## 6.5. This session's work in detail (2026-07-27 → 2026-07-28, all uncommitted)

**Trigger:** Mert asked for an honest audit of the whole not-started experience; got `onboarding/NOT_STARTED_REVIEW.md` (12 items, ranked). He triaged it in one line each: fix 1, don't fix 2, fix 3 (remove the duplicate sign-in button, keep the left one), fix 4 (make the favicon darkish blue instead of black), fix 5, fix 6 (translate the stray English + "scour the whole not-started section for anything else English"), don't fix 7, fix 8 (add an ErrorBoundary), don't fix 9, don't fix 10, don't fix 11 yet ("I'm gonna rework that later" — the fake slot-machine counter), fix 12 (folded into 6).

**What actually landed:**
- **Signup back button** — `SignupFlow.tsx` gained a real `goBack()` + `BACK_HIDDEN` array (some steps, like the welcome screen and the post-quiz celebration beats, still can't go back) and every step component gained `initial*` props so re-entering a step doesn't lose what you'd already typed/picked.
- **Duplicate sign-in button removed** — `HomeLandingLoggedOut.tsx` simplified to one `SignupCta`.
- **Favicon** — added a navy variant (`public/brand/kupatakip-logo-navy.svg`, fill swapped to `#1C3A5E`) instead of the invisible-in-dark-mode solid black one, wired into `index.html`.
- **OG image / link previews** — `index.html` gained real title/description/OG/Twitter meta tags; `scripts/gen-og-image.mjs` (new) uses `sharp` to rasterize a hand-built SVG (real logo path data extracted via regex from the existing white logo SVG) into `public/og-image.png`, reading its colors live from `colors.css` rather than duplicating hex a second time.
- **English → Turkish sweep** — `AppShell.tsx` nav labels translated (removed a stray `lang="en"` too), the blocked-page message across `ForumPage`/`LeaderboardPage`/`ProfilePage`/`StatsPage`/`PredictionsPage`/`PlaceholderPage`, and `LoginButton`/`LogoutButton` text — this was the one item explicitly called "scour the whole section," so it touched more files than the original review flagged.
- **`ErrorBoundary`** — new `src/shell/ErrorBoundary.tsx`, a class component wrapping the whole app in `App.tsx`, Turkish "Bir şeyler ters gitti." fallback with a reload button, so a render crash no longer produces a silent blank white screen.
- Left alone, on purpose: the two "working as designed" items (frozen-countdown edge case, the fake slot-machine participant counter — Mert said he'll rework that one later himself) and the two "don't fix" items from the original list.

**Then, a separate, bigger request:** Mert asked for a full color-inventory artifact — every unique color in the codebase, three columns next to each (Claude's own usage note, plus two blank columns for his own notes, small and large) — built as an interactive HTML artifact with a copy button. He filled it in himself (the artifact's copy button didn't actually work, so he pasted the raw table content back manually) with explicit new names per row (`color_main`, `color_secondary`, `color_text`, `color_accent`, `color_remove`, `color_textsecondary`, `color_border1`, `color_border2`, `color_hoverfill`, `color_blob1/2/3`, `color_pitch`, `color_statsbar`, `color_pitchlines`, `color_pitchformation`, `color_gold`, `color_qualification`, `color_idk`, `color_hover`, `color_navy`, `color_shadow`, `color_glow`, `color_faintglow`, `color_share`, `color_sharetext`), plus two special instructions: create a genuinely separate `color_green` duplicate for anything meaning "prediction was correct" (rather than reusing the general accent color), and merge two specific one-off colors (a glow-shadow, and the OG-image's tagline gold) into `color_green`/`color_gold` respectively.

**What that produced:**
- `src/styles/colors.css` — the new single source of truth (§5).
- **51 app-level files** mechanically renamed (Tailwind classes + raw CSS var references) via an ordered Python script, then hand-verified. A handful of raw SVG literals (pitch diagram stroke/fill colors in `TeamPopup.tsx`) were fixed by targeted replace since they aren't Tailwind classes.
- **The correctness-classification judgment call** — worth knowing explicitly since it's a real interpretive decision, not mechanical: `color_green` was applied only to the actual `correct`/`highlighted` prediction-scoring booleans (`ParticipantPopup.tsx` and `TeamPopup.tsx`'s per-pick correctness highlight, `TeamTable.tsx`'s hover-driven correctness wash, `RankingList.tsx`'s proximity glow). Qualification-band ticks (direct-to-RO16 vs. playoff) and match-result W/D/L dots were deliberately **kept** on the general `color_accent`, since they represent real-world standing/results rather than "your prediction was right." **This is a judgment call Mert hasn't explicitly confirmed — flag it to him if it comes up.**
- A few false-positive corruptions from the blind rename (the script matched literal words like `navy`/`destructive` used as React component *prop values*, not just Tailwind classes — e.g. `<FrameHeader tone="navy">`) — caught via `tsc -b` and reverted by hand in `HomeLandingLoggedIn.tsx`, `ProfilePage.tsx`, `StatsPage.tsx`.
- `scripts/gen-og-image.mjs` updated to read `colors.css` directly via regex instead of hardcoding hex a second time — genuine single-source-of-truth for the one non-CSS consumer.
- **`src/devpanel/ColorTuner.tsx`** (new, `/dev/color-tuner`) — per Mert's mid-task follow-up ask ("construct a tuner which displays the logged-in-not-started home page, where I can tune up all these colors and try to work out maybe a different palette"). Same real-component-not-a-lookalike pattern as the other tuners: renders the actual `HomeLandingLoggedIn` with synthetic data, 14 live controls in a left rail (6 solid colors with paired picker + hex field, 4 percentage-based derived-color sliders, 4 more solid colors), a "CSS kopyala" clipboard-export button, a reset button, and unmount cleanup so inline overrides don't bleed into other pages later in the same session.
- Two incidental fixes found and applied along the way: `TeamPopupTuner`/`StatsPageTuner`'s own native color pickers would have silently broken once their bound fields became `var(--color_x)` references (native `<input type="color">` rejects `var()`), fixed with the `TUNER_INITIAL` pattern described in §6.

**Verification done:** `tsc -b` clean, `vitest run` → 562/562 passing, live Playwright visual parity confirmed on the highest-risk raw-SVG rendering (`TeamPopup`'s pitch diagram) and on the ColorTuner's live cascading (a test magenta value propagating correctly through the whole rendered home page — heart icons, online-status dot, chat sender name, slider thumbs, mention highlights).

**Nothing here is committed.** See §0.

---

## 7. Firestore rules — current state (`firestore.rules`, deployed)

- `profiles/{uid}`: public read, owner-only write.
- `surveyResponses/{uid}`: owner-only read/create, no update/delete (one-time, matches the "quiz is never revisable" rule).
- `predictions/{uid}`: public read, owner-only write.
- `results/{teamId}`: public read. Write is `if request.auth != null` — **deliberately loosened from `if false`** specifically so the dev panel's browser-based writes work. Commented in the rules file as temporary/pre-launch, intended to tighten once real admin tooling exists — but since results automation is permanently skipped, **that may never happen**. Worth a conscious decision at some point (e.g. restrict to Mert's own uid) before this is ever exposed beyond his own testing.
- `devConfig/{docId}`, `devMatches/{fixtureId}`, `tournamentState/current`: `if request.auth != null` for read and write.
- `messages/{messageId}` (chat): logged-in-only read, owner-attributed create, no update — **except** a sender may now soft-delete their own message (chat-widget-round-01's reversal of the original "never, by anyone" stance).
- `forumPosts/{postId}`: public read, owner-attributed create, no update/delete ever.

Deploy via `npx firebase deploy --only firestore:rules`. Has worked cleanly most times; a persistent local IPv6 outage against `firebaserules.googleapis.com` has intermittently blocked this in the past — if it recurs, the fallback is pasting rules manually into the Firebase console.

---

## 8. Known gaps / things not to "fix" without asking

- **§0's uncommitted diff** — don't assume `main` reflects any of §6.5's work.
- **`currentDateOverride` in the dev panel is display-only** — nothing else reads a simulated "now" besides tournament phase, which already has its own separate override.
- **A minor self-correcting race in `useDevMatches`** — a very fast double-edit on match outcomes could compute standings off a stale map. Self-corrects on the next edit; judged not worth fixing for a single-user dev tool.
- **The `results` write-rule loosening has no expiry mechanism** (§7) — fine pre-launch, revisit before real participants.
- **No code-splitting / `manualChunks`** — `npm run build` warns about bundle size; pre-existing, out of scope unless it becomes an actual problem.
- **The matchup popup doesn't exist yet** — the single biggest genuinely open design question (§4).
- **The fake "slot machine" participant counter on logged-out Home** — Mert knows about it, said he'll rework it himself later. Don't touch without him bringing it up.
- **The frozen-countdown-at-zero edge case** — accepted as-is; only matters in the literal gap between the countdown hitting zero and Mert manually flipping the phase.
- **`public/fonts/`** — dead weight left over from the discarded Archivo Narrow / earlier font attempts (Phase 4). Safe to delete, never explicitly done.
- **`team_logos/`** (if still present, untracked) — looks superseded by `public/club-badges/` SVGs but was never explicitly resolved; ask before deleting.
- **The `color_green` / `color_accent` correctness-classification call (§6.5)** — a real interpretive judgment Mert hasn't explicitly confirmed. Surface it if it comes up.
- **DESIGN-SPEC.md and PAGEMAP_SPEC.md both have their own "Open Questions" sections** — read those directly for the current authoritative list rather than relying on this summary once more rounds happen.

---

## 9. How Mert works — read this section like it's load-bearing, because it is

This section exists because it was explicitly requested, and because getting it wrong costs real rework. None of this is guesswork — it's drawn from repeated, explicit, sometimes frustrated correction across this project's history.

**Communication style:** terse and imperative once something is underway ("Go ahead," "fix 1 / don't fix 2 / fix 3, remove the one on the right"). Not precious about phrasing, wants forward motion. He treats Claude as a genuine reasoning partner, not just an executor — he'll push back on conclusions and expects a substantive, non-deferential response, not immediate capitulation.

**Autonomy is calibrated per-repo, and expected to persist as a standing rule, not re-negotiated each session.** For this repo specifically: "feel free to commit and push whenever you want" was the original standing rule (though as of this writing, nothing from the last several sessions has actually been committed — always double check current practice against what's actually happened recently, since the literal rule and the recent lived pattern can drift). Feature work happens on its own branch per unit, merged back to `main` once tests pass and it's been confirmed live — though plenty of recent work has also landed directly on `main`. His explicit standing directive: *"Your architectural skills are entirely trusted and you are expected to make a lot of major decisions (though no harm with asking for confirmation when you think it is wise)."* Default to deciding and acting on architectural/design/process calls (data model shape, merge strategy, what's in/out of scope for a milestone) rather than presenting options and waiting — but still pause for anything genuinely irreversible/high-blast-radius he hasn't pre-authorized, or anything that's really a *product* decision rather than a technical one. **Don't over-flag solved problems as open risk** — if a concern has an obvious answer already sitting in context (a stated reference, a normal pattern), either just decide it or don't frame it as a lingering worry; he's called this out directly ("Put your big boy pants on") when it happened.

**Verification:** he personally spot-checks output against ground truth rather than trusting a "tested" claim at face value (this has burned him before, on a different project, when a code-only "tested against live data" claim didn't match reality). When he hands back a correction, he wants the underlying methodology fixed, not individual bad instances patched one by one. **Root-cause over patching** is a repeated, emphatic theme specifically on visual work too — he has twice rejected padding-nudge fixes with *"DON'T ADD PADDINGS HERE AND THERE. NORMALIZE EVERYTHING,"* wanting an actual measured cause (`getBoundingClientRect()` diffs, not eyeballing) before touching anything.

**Timeline pressure:** don't project urgency onto his deadlines without evidence. He built the *entire* previous kupatakip edition in 16 hours flat, because that's literally how much runway he had that time. "5 weeks is effectively infinite time" is a direct quote correcting Claude's own premature timeline concern. Don't raise pacing worries on this class of project unless he raises it first or a date is genuinely imminent (days, not weeks).

**Design-questionnaire pacing** (specific to the vibes-first DESIGN-SPEC.md rounds): keep rounds genuinely vague, playful, and low-pressure — sensory/associative prompts, not direct resolution of a spotted contradiction. He explicitly asked for 15-20 *fun* rounds rather than a few sharp convergent ones, and said naming a contradiction back to him mid-loop feels like an interrogation, risking him abandoning the process. Every multiple-choice question in that tool needs an escape-hatch free-text option — he's said outright he sometimes feels stuck between a rock and a hard place with closed choices.

**Pagemap questionnaire channel** (a *different*, later series — don't conflate the two): all pagemap-filling questions must go through the same full HTML questionnaire artifact, never a quick native question tool, even for "just one surgical clarification." He corrected this directly mid-session: *"Ask your questions on questionnaires... We'll do at least 10 [rounds], probably more... You have plenty of time."* This is scoped to the pagemap workflow specifically, not necessarily every future clarifying question in this repo.

**Asset sourcing:** he will personally fetch any real font, icon, image, or third-party asset a design calls for — don't self-limit to emoji/system-font/no-asset substitutes out of sourcing-friction caution. Reinforced with real frustration at one point: *"I have been hammering on this point for days, but you never pay any mind to it. You must use assets. That is how we escape the AI slop aesthetic."* Write the real reference in as if the file already exists; a 404 until he fetches it is expected, not a bug. The flip side, equally real: this doesn't mean over-requesting new assets for genuinely-placeholder/dummy content he's already said not to fuss over, or ignoring an already-existing asset in favor of sourcing something new (he's pointed at already-built components/assets and expected reuse more than once).

**The Cursorify Rule** — a named, standing, reusable convention (not a one-off): no I-beam cursor anywhere on non-interactive text, `cursor-pointer` on everything actually clickable, plain default cursor everywhere else. Apply proactively on any real visual/interaction pass without being re-asked.

**When he reacts to already-built work with a hand sketch or photo** plus "prepare a questionnaire, I'll fill it out, then implement it" — that's a distinct, higher-fidelity workflow from the vibes-first rounds: write a real, technical, concrete, mostly-multiple-choice markdown file, let him fill it in directly, then implement literally. Don't soften or creatively reinterpret an answer marked "EXACTLY AS I HAVE DRAWN IT. DO NOT DEVIATE."

**Frontend quality bar:** he explicitly does not want this to read as generic AI-generated UI ("Claude slop") — installed the `impeccable` skill specifically to steer away from that, and treats this as a real constraint on the build, not a throwaway preference.

---

## 10. Where to find more context

- `SPEC.md`, `PAGEMAP_SPEC.md`, `DESIGN-SPEC.md` (repo root) — the three canonical living specs, each with its own changelog at the bottom worth reading directly for exact chronology and exact quotes.
- `onboarding/pagemap.xlsx` / `.csv` / `pagemap_completion.csv` — the literal completion matrix driving the pagemap series.
- `onboarding/PAGE_BRIEFING.txt`, `onboarding/BRIEFING.txt` — Mert's own working notes; historical but sometimes still the tiebreaker over an older SPEC.md line.
- `HANDOVER.md`, `HANDOVER_2.md` (this same folder) — the two prior handovers this file supersedes; still worth reading for session-level blow-by-blow detail this file compresses.
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — per-unit design docs and implementation plans from the original 6-unit backend build.
- Claude's persistent memory system (outside this repo, survives across sessions): `project_kupatakip_ucl.md` carries this same narrative for Claude's own future recall, cross-linked with `feedback_autonomy_gating.md`, `feedback_verification_standards.md`, `feedback_timeline_pressure.md`, `feedback_design_questionnaire_pacing.md`, `feedback_asset_sourcing.md`, `feedback_pagemap_questionnaire_channel.md`, `feedback_cursorify_rule.md`, `project_stopbilling_function.md`, `reference_gcloud_cli_local.md` — all referenced throughout §9 above.
- Git history on `main` is linear and consistently describes *why*, not just *what* — `git log --oneline` is a legitimate way to reconstruct sequence if this file ever goes stale.

---

## 11. What's next

1. **Decide what to do with §0's uncommitted work** — commit (likely worth splitting: the NOT_STARTED_REVIEW fixes are a different concern from the color-rename+tuner work), then decide on `main` vs. a branch.
2. **Surface the `color_green`/`color_accent` correctness-classification judgment call to Mert** (§6.5) — it's a real interpretive decision he hasn't explicitly signed off on.
3. **The matchup popup** — still the single biggest open design gap; needs a real "richer than teams+score+scorers" conversation with Mert, who has rejected the thin default but not yet described what he actually wants.
4. Whatever Mert brings up next — nothing else is queued or half-started as of this writing.
