# Session Handover — Great Leap: Fully Implemented, Not Deployed

**Why this file exists:** all three Great Leap plans have been executed end-to-end in this session (41 commits on `leap-attempt-1`, 876 tests passing, clean `tsc` typecheck). Mert chose "keep as-is" when asked how to integrate the branch — it is **not merged into `main` and not pushed to any remote**. This file is the single thing a fresh session needs to read before touching this branch again: what's built, what's verified, what is explicitly *not* done yet (deployment + real-auth manual QA), and every judgment call made along the way that Mert hasn't reviewed yet.

**Read this file fully before doing anything else on this branch.** Don't re-read the three plan documents from scratch unless you need an implementation detail this file doesn't cover — they're preserved at `docs/superpowers/plans/2026-08-02-great-leap-*.md` for that purpose.

---

## Current state in one paragraph

Branch `leap-attempt-1`, 41 commits ahead of `main`, sitting untouched exactly where this session left it. Every file change is committed — `git status` is clean except for pre-existing untracked scaffolding (`GREAT_LEAP_SPEC.md`, `docs/`, `questionnaires/`) that predates this session and wasn't touched. `npm test` passes all 876 tests across 131 files; `npx tsc --noEmit` is clean; `cd functions/leaderboard && npm test` passes all 18 tests. **Nothing has been deployed to Firebase** — the real production project is still running the old `firestore.rules` and the old `functions/leaderboard/index.js`. The app was smoke-tested in a real browser against the live (undeployed) backend and renders correctly for the current production state (`loggedout_notstarted`), with the only console errors being expected `permission-denied`s on the *new* collections (since production's rules don't know about them yet).

---

## What was built — by plan

### Plan 1: Data layer (`docs/superpowers/plans/2026-08-02-great-leap-data-layer.md`)

New Firestore collections, all following this repo's "hand-edited state + Cloud-Function-derived cache" convention (no admin UI anywhere, per GREAT_LEAP_SPEC.md §1.2):

- **`bracketState/current`** — hand-edited, single doc. Shape: `{ ro16Teams: Partial<Record<MatchupId, [string, string]>>, winners: Partial<Record<MatchupId, string>> }`. `MatchupId` is one of `ro16-1`..`ro16-8`, `qf-1`..`qf-4`, `sf-1`, `sf-2`, `final` (defined in `src/bracket/bracketStructure.ts`). `ro16Teams` records the real RO16 draw (which two teams play each first-round matchup); `winners` records each matchup's actual winner as rounds conclude. **This is the doc Mert hand-edits via the Firebase console as real knockout results come in** — nothing else writes it. Public read, signed-in write (same temporary trust convention as `results`/`tournamentState`).
- **`bracketPredictions/{uid}`** — one per user, written once by the client (`saveBracketPrediction` in `src/bracket/useBracketPrediction.ts`) on submission. Shape: `{ picks: Record<MatchupId, string>, submittedAt: number }`. Rules enforce create-only, no update/delete — that's the real "one submission, no revisions" boundary, not just client-side UI.
- **`rankSnapshots/{matchday}`** — one per matchday, written **only** by the Cloud Function (`functions/leaderboard/index.js`'s `recomputeLeaderboard()`), only when `tournamentState/current.currentMatchday` is a number. Shape: `{ matchday: number, entries: {uid, points, rank}[], computedAt: number }`. Scoring-agnostic — it snapshots whatever `points` each leaderboard entry already has, so it automatically reflects combined league+bracket scoring once Plan 2's changes are live.
- **`tournamentState/current.currentMatchday`** — a new hand-edited field on the existing doc. No rule change needed (the doc already allows any authenticated write with no field validation). **Mert has to keep bumping this past 8** (the league phase's real last matchday, confirmed via `src/devpanel/fixtures.ts`) as knockout rounds conclude, for the rank-history graph (Plan 3) to have anything to plot through the knockout stage. Exact numbering (9/10/11/12 or otherwise) is his call.
- Server-side `functions/leaderboard/index.js` gained an `assignRanks` mirroring the client's, plus the rank-snapshot upsert wired into `recomputeLeaderboard()`.

### Plan 2: Bracket feature (`docs/superpowers/plans/2026-08-02-great-leap-bracket-feature.md`)

The full one-time knockout-bracket submission flow, folded into combined scoring:

- **`/bracket` route** (`src/pages/BracketPage.tsx`) — gated: logged-in only, `preknockout` phase only (closes the instant `knockout` begins, does *not* stay open through it — confirmed against GREAT_LEAP_SPEC.md §5.2), already-submitted users redirected home. Flow: intro copy → `BracketBoard` (two-column click-to-cascade tree UI, `src/bracket/BracketBoard.tsx`) → done screen.
- **Scoring** (`src/leaderboard/bracketScoring.ts`, mirrored by hand in `functions/leaderboard/index.js`): `BRACKET_POINTS = {ro16: 3, qf: 4, sf: 5, final: 6}`. **Important, non-obvious point:** this table is keyed one round *earlier* than GREAT_LEAP_SPEC.md §5.3's stage-reached table (QF=3/SF=4/Final=5/Champion=6) — a team "reaches" a stage by *winning the match immediately before it*, so a correct RO16-matchup pick is what earns the spec's "3 points for reaching QF." This was actually a real bug in the plan's first draft (caught during Plan 2's self-review, before this session) — flagging again here because it's exactly the kind of thing that looks wrong on a superficial re-read but isn't.
- Combined scoring: `functions/leaderboard/index.js`'s `recomputeLeaderboard()` now fetches `bracketPredictions` and `bracketState` alongside the existing `predictions`/`profiles`/`results`, and folds `computeBracketScore(...)` into each entry's `points` via a new `buildLeaderboardEntries()` (extracted, independently tested). A participant with only a bracket submission or only a league submission gets a correct combined entry, not a crash (GREAT_LEAP_SPEC.md §7.3) — has explicit test coverage.
- **Home surfaces**: `BracketCtaBanner.tsx` (link pill, shown during `preknockout` when no bracket prediction exists yet) and `BracketWidget.tsx` (compact tree showing `currentRound` at full strength, adjacent rounds faded, others not rendered — `deriveCurrentRound.ts` computes which round that is from live `bracketState`). Both are standalone components; **`/leaderboard` itself is deliberately never touched** — the bracket widget only ever appears on Home and Profile, per GREAT_LEAP_SPEC.md §5.4.
- **Profile integration**: `BracketProfileView.tsx` shows the user's own picks per round, each annotated with the group's consensus percentage (`bracketConsensus.ts`), wired into `ProfilePage.tsx` below the existing league-prediction block.

### Plan 3: Started-phase Home + registration closing (`docs/superpowers/plans/2026-08-02-great-leap-started-home.md`)

Replaced `HomePage.tsx`'s placeholder `BLURB` skeleton with real compositions for all six started `VisibilityState`s:

- **`StartedHomeLoggedIn.tsx`** — six-widget grid: league table (swaps to `BracketWidget` during `knockout`), rank-history graph (hand-rolled SVG, `RankHistoryGraph.tsx`/`rankHistoryChart.ts` — no charting library in this repo), chat (`ChatCell.tsx`, extracted from `HomeLandingLoggedIn.tsx`), forum (`ForumCell.tsx`, same extraction), mini-leaderboard (`MiniLeaderboardWidget.tsx`, always exactly 5 rows sliding near the current user via `miniLeaderboardWindow.ts`), upcoming matches (`UpcomingMatchesWidget.tsx`, 3 fixtures always inline, built on `FixtureRow.tsx` extracted from `UpcomingMatchesDrawer.tsx`). Plus the bracket CTA banner during `preknockout`.
- **`StartedHomeLoggedOut.tsx`** — a `LeaderboardPage.tsx`-style composition (same league table/hero/standings triptych) with the identical knockout bracket-swap, built as a fully standalone component rather than sharing code with the real `/leaderboard` page (again, per §5.4's "exactly two surfaces" rule).
- **`LoggedInHome.tsx`** generalized from "not-started-only wrapper" into the single data-wrapper for *every* logged-in state, branching internally between `HomeLandingLoggedIn` (unchanged) and the new `StartedHomeLoggedIn`.
- **`HomePage.tsx`** rewritten as a pure `loggedIn`/`phase` router — the old `BLURB` constant and its six-state lookup table are gone entirely.
- **Registration closing** (`ProfileGate.tsx` + new `RegistrationClosedScreen.tsx`): once the tournament is no longer `notstarted`, a genuinely never-onboarded account (no profile **and** no survey) sees a self-contained spectator screen (message + the exact `StartedHomeLoggedOut` composition) instead of `SignupFlow`. An account with *any* onboarding progress (a profile, even without a survey) is unaffected — "signing in never closes," per Mert's own framing in GREAT_LEAP_SPEC.md §4. **This was Mert's explicit "your call" delegation, not a firm spec — see the "Judgment calls to review" section below, item 1.**

---

## What is NOT done — read this before assuming anything works live

1. **`firestore.rules` has not been deployed.** The three new match blocks (`bracketState`, `bracketPredictions`, `rankSnapshots`) plus the diff to existing blocks exist only in the local file. Run `firebase deploy --only firestore:rules` (or the project's real deploy command — check `PROJECT_STATE.md` / `package.json` scripts first) before any of the new collections will actually accept reads/writes in production. Until then, every new hook (`useBracketState`, `useBracketPrediction`, `useRankSnapshots`) fails with `permission-denied` in production, caught and logged, not crashing — confirmed live in this session's browser smoke test.
2. **`functions/leaderboard/index.js` has not been deployed.** Run `firebase deploy --only functions:leaderboard` (or equivalent). Until then, the live Cloud Function still runs the pre-Great-Leap scoring logic — no bracket points fold into `leaderboardCache/current`, no `rankSnapshots` get written, and the new `recomputeLeaderboardOnBracketPrediction` trigger doesn't exist yet.
3. **No manual, real-auth browser verification has happened for any signed-in state.** This session's browser smoke test was necessarily limited to what's reachable while signed out against production (real Google OAuth isn't available in this sandboxed environment, and mutating production Firestore state to fake a started phase was avoided on purpose). Concretely, nobody has yet clicked through, with a real signed-in account:
   - `/bracket`'s actual submission flow (intro → board → submit → done)
   - `StartedHomeLoggedIn`'s six-widget grid in any of the three started phases
   - `StartedHomeLoggedOut`'s composition signed out during a started phase
   - `RegistrationClosedScreen` for a genuinely fresh account
   - The bracket CTA banner / widget appearing and disappearing correctly across phase transitions
   - `ProfilePage.tsx`'s new "Eleme Turu Tahmininiz" block once a real prediction exists

   Each of the three plans' own text calls out a manual verification step for exactly this reason (Plan 2 Task 8 Step 2, Plan 3 Task 12 Step 11, Plan 3 Task 13 Step 11) — none of them have been performed. **This is the single most important thing to do before considering this feature actually shippable**, not just merged.
4. **Not merged, not pushed.** `main` still has none of this. Mert's instruction was explicitly "keep as-is."

---

## Judgment calls to review with Mert (nothing here was rubber-stamped — flag, don't assume)

1. **Registration-closing behavior** (Plan 3 Task 13) was Mert's own "your call" delegation in GREAT_LEAP_SPEC.md §4, not a firm spec, and it says to flag the choice back to him once built:
   - Blocking condition implemented as `!profile && !survey` (both missing), **not** `!profile || !survey` (either missing) — because the spec's stated intent ("signing in never closes," never block an account with any onboarding progress) only holds under AND. The spec text itself claimed this was "exactly the condition ProfileGate.tsx currently uses," which conflicts with the live code (an OR) — this was flagged as a spec/code conflict during Plan 3's own writing, resolved in favor of the spec's *stated intent* over its (incorrect) claim about existing code.
   - What a blocked user sees: the literal same `StartedHomeLoggedOut` composition a signed-out visitor gets, embedded under a one-line message — not a distinct third variant, and not a banner-over-normal-routing. This was one of two options GREAT_LEAP_SPEC.md §4 explicitly offered; the other (a "near-identical logged-in-but-no-profile variant") was not built.
2. **Bracket intro copy rendering** (`BracketPage.tsx`): the plan's own sketch assumed `IntroBeat` took a `beats` array + `continueLabel` prop. The real component (confirmed against source) only ever renders one `text`/`boldTerms`/`onContinue` at a time, with no built-in pagination. Rather than inventing a new paginated variant, the three `BRACKET_INTRO_BEATS` sentences are joined into a single paragraph with no bold styling (bolding was dropped specifically because it fragments the joined text into separate DOM nodes at sentence-fragment boundaries, breaking a plain-text hover/read experience). This means the bracket intro reads as one continuous paragraph with a single "Devam et" button, unlike `PredictionsPage.tsx`'s beat-by-beat animated sequence. **Worth Mert's eyes** — it's a deliberate simplification, not an oversight, but it does diverge from the more elaborate `PredictionsPage` precedent it was modeled on.
3. **`BracketWidget` crest `data-testid` scoping**: changed from a flat `bracket-widget-crest-{team}` to `bracket-widget-crest-{round}-{team}` after discovering a real collision — when the current round's own winner has already advanced, that same team legitimately renders twice (once in its origin round, once as the already-decided entrant in the next round), and a flat id can't disambiguate the two DOM nodes. This is purely an internal test-id change; the component's public props are untouched.

None of these are functional bugs left unresolved — they're all resolved, tested, and passing. They're listed because they involved real interpretation of ambiguous or self-contradicting plan text, and Mert hasn't seen any of it yet.

---

## Real defects found and fixed during execution (plan bugs, not implementation slips)

These are worth knowing about in case anyone goes back to the plan documents expecting them to be pristine — they weren't, and the actual shipped code differs from the plan's literal text in each of these spots:

1. **`functions/leaderboard/vitest.config.js` / `index.test.js`** (Plan 1 Task 7): the plan's test file did `const { describe, it, expect } = require("vitest")`. Vitest's package hard-blocks being `require()`'d under CommonJS in every version — not a version-specific quirk, a permanent guard (confirmed by reading `node_modules/vitest/index.cjs` directly). Fixed by setting `test.globals: true` in that subpackage's Vitest config (so `describe`/`it`/`expect` are ambient, no import needed) and dropping the `require("vitest")` line entirely — the local `require("./index")` stays CommonJS as the plan intended.
2. **`useBracketPrediction.test.ts`** (Plan 1 Task 4): two of the plan's own test assertions called `callback(...)` synchronously without wrapping in `act(...)`, unlike the structurally identical sibling test in `useBracketState.test.ts` — caused real, reproducible test failures (state updates not flushed before the assertion ran). Fixed by adding the missing `act()` wrapper, matching the working sibling pattern.
3. **`bracketConsensus.ts`** (Plan 2 Task 11): the plan's own test suite contradicted itself — one test expected `computeBracketConsensus([])` to return `[]`, another expected a non-empty-but-partial predictions list to still produce all 15 matchup entries. The plan's implementation sketch had no special case for a fully-empty input and would have returned 15 empty-percentage entries for `[]`, failing the first test. Fixed by adding `if (predictions.length === 0) return [];` as the first line.
4. **`FixtureRow.test.tsx` / `UpcomingMatchesWidget.test.tsx`** (Plan 3 Tasks 3 & 6): the plan's test assertions checked for full team names ("Arsenal", "Athletic") where the real rendered content is `Team.shortName` — 3-letter codes ("ARS", "ATH"), confirmed against `src/predictions/teams.ts`. Fixed by correcting the assertions to the real short codes; no component code was wrong, just the plan's own test expectations.
5. **`useBracketPrediction.test.ts`** type errors caught by `tsc --noEmit` (not caught by Vitest, which doesn't typecheck): the plan's test passed a partial `{ "ro16-1": "Arsenal" }` object where `saveBracketPrediction`'s real signature requires a full `Record<MatchupId, string>` (all 15 keys). Fixed with an `as Record<MatchupId, string>` cast, consistent with this same file's existing casting style elsewhere.
6. **`StartedHomeLoggedIn.test.tsx` / `StartedHomeLoggedOut.test.tsx`** (Plan 3 Task 10): the plan's test file never wrapped renders in a `<MemoryRouter>`, but the components under test (via `ForumCell`/`BracketCtaBanner`) use `react-router-dom`'s `<Link>`, which throws without router context. Fixed by adding `MemoryRouter` wrapping (a `renderStartedHome()` helper for the LoggedIn variant).
7. **Two commits fixing pure type errors** (`b7f15b0`, plus the `LOBBY_MESSAGES`/`MyLobby` fixture fix folded into `0b5a3c2`): `ChatCell.test.tsx`'s copied fixtures were missing `useLobbyMessages`'s real `loading` field and `MyLobby`'s real `memberUids` field — both required by the actual types, both silently fine under Vitest (no typecheck), both caught by a `tsc --noEmit` pass.

**Takeaway for whoever picks this up next:** every one of these was caught by actually running the test/typecheck after writing it, not by trusting the plan's embedded code verbatim — the plans were good but not perfect, consistent with the handover note that only Plan 2 and Plan 3 (not Plan 1) had been self-reviewed with real source-file cross-referencing before this session began.

---

## Stack/convention reminders (unchanged from the original handover, still accurate)

React 18.3 + TS 5.5 strict, Vite 5.4, react-router-dom v6 `HashRouter`, Tailwind v4, shadcn `base-nova`/`@base-ui/react` (Dialogs render `role="dialog"` when open — no `data-testid` convention on them), `motion`, Firebase v10 (Auth google-only, Firestore, RTDB for presence/typing only, Storage), `functions/leaderboard` (Node 20, plain CommonJS JS, v2 Cloud Functions API), Vitest 2 + jsdom + RTL, no charting library (hand-rolled SVG). Every page component in `src/pages/` uses a named export.

One addition worth knowing for next time: `functions/leaderboard`'s Vitest config now sets `globals: true` (see defect #1 above) — this is a deliberate deviation from the root app's Vitest config (which also has `globals: true` already, so it's actually now consistent across both, just for a different underlying reason: the root needs it for JSX-adjacent ergonomics, `functions/leaderboard` needs it because `require("vitest")` is categorically impossible).

---

## Recommended next steps, in order

1. **Deploy** `firestore.rules` and `functions/leaderboard` to a real Firebase project (staging if one exists, otherwise production with Mert's explicit go-ahead — this is a live-data-affecting deploy, not a reversible local action).
2. **Manual QA with a real signed-in Google account**, working through the "not done" list above — particularly the bracket submission flow end-to-end and at least one full phase transition (`notstarted` → `leaguephase` → `preknockout` → `knockout`) to watch the Home composition swap and the bracket CTA/widget appear and disappear correctly.
3. **Surface the three judgment calls above to Mert explicitly** — none of them are blocking, but all three were his own delegated decisions and he asked to see them before considering the feature final.
4. Only after 1–3: decide on merge/PR — this session intentionally left that decision untouched per his "keep as-is."
