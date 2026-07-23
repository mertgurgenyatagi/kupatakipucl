# Design: Stats Page — Redesign (7+6 widget grid)

Status: Approved (chat), pending written-spec review.
Build unit: redesign of unit 6/7 (see `SPEC.md` §9b) — **supersedes `2026-07-20-stats-design.md`** for this page. That doc's accuracy-ranking goal and its survey-aggregate deferral are both explicitly reversed here; see "What changed" below. Branch: `stats-page`.

## Overview

`onboarding/PAGE_BRIEFING.txt` gives an exact, concrete widget list for this page — 7 tournament-stat widgets on the left, 6 participant-stat widgets on the right — superseding `SPEC.md` §8d's looser baseline. Reached via live interactive Q&A on 2026-07-23, not self-directed.

### What changed from the 2026-07-20 doc

- **Survey-aggregate stats are no longer blocked.** The old doc deferred these because computing an aggregate client-side would require every visitor's browser to download everyone's raw individual answers, defeating the point of the then-owner-only `surveyResponses` rule. That rule was already loosened to `read: if request.auth != null` earlier today (2026-07-23, see `firestore.rules` and the participant popup's quiz-answers widget) for an unrelated reason — Mert's explicit call that individual answers can be shown directly to other participants. That removes the privacy rationale for deferring aggregates; no Cloud Function architecture needed after all.
- **Most-accurate-predictor ranking is dropped, not carried forward.** It was a solid idea on its own merits (a finer-grained lens than the leaderboard's coarse score), but it's absent from the new 13-widget spec and Mert confirmed cutting it rather than finding it a 14th slot. `accuracy.ts`/`AccuracyTable.tsx` are deleted.
- **Visual polish (real bar charts, not just ranked lists) happens now, for this page**, rather than waiting for a whole-site `impeccable` pass as the old doc's follow-up note assumed — scoped to hand-rolled CSS bars (see Architecture), not a site-wide visual pass.
- Rank-over-time/points-timeline graphs, "who picked whom", and results automation remain deferred exactly as the old doc described — nothing new unblocks those.

## Goals

**Left frame — "Turnuva İstatistikleri" (7 widgets, ranked-list style, 3 rows each):**

1. Top scorers — existing `StatWidget` dummy rows, unchanged data.
2. Top assisters — same.
3. Top ratings — same.
4. Biggest overperformers — top 3 of existing `computeTeamBias` (most negative `averageDifference`, i.e. finished better than predicted).
5. Biggest underperformers — bottom 3 of the same, reversed.
6. Most agreed-upon teams — new stat: top 3 of a single sorted list, ranked by lowest standard deviation of predicted position for a team across all participants' rankings (ascending — lowest spread first).
7. Most disagreed-upon teams — bottom 3 of that same sorted list, reversed — same relationship as overperformers/underperformers both reading from one sorted `computeTeamBias` output.

**Right frame — "Katılımcı İstatistikleri" (6 widgets):**

1. Number of participants — straight number box. Counts everyone signed up (`profiles`), not just predictors.
2. Age — bar per bucket, fixed order `<20, 20, 21, 22, 23, 24, 25, 26, 27, >27`, bucketed from the existing raw `age: number`. Display-side only — `SurveyForm.tsx` is untouched.
3. Football knowledge — bar per level 1–7, all 7 shown even at zero.
4. Messi v Ronaldo — 3 bars (messi/ronaldo/no-opinion), all shown even at zero.
5. Süper Lig team — bar per the 6 fixed dropdown options (`SUPER_LIG_TEAMS` in `SurveyForm.tsx`), most-voted first, zero-vote options omitted.
6. UCL team — same bar visual, but **hardcoded placeholder data**, not a real read. The free-text field is getting replaced by a select later (separate, future change, out of scope here); no point building real aggregation against data whose shape is about to change.

## Non-Goals (carried forward, still deferred, unchanged reasoning)

- **Rank-over-time / points-timeline graphs** — still need a real result history to snapshot; tournament hasn't started.
- **"Who picked whom" transparency view** — still needs round-2 (knockout) submission infrastructure that doesn't exist yet.
- **Results automation** (`SPEC.md` §7) — unrelated, fully out of scope.
- **UCL-team select conversion** — Mert flagged this is coming as its own change; this unit only accounts for it by not building real data-plumbing that would immediately be obsolete.

## Architecture

- **Page shell**: `StatsPage.tsx` adopts the same `PAGE_SHELL`/`MAIN_ROW` fixed-viewport pattern as `LeaderboardPage.tsx` — the document itself never scrolls (§55 convention). Two top-level `Frame`s in a `grid-cols-2` row, equal width regardless of the 7-vs-6 widget count difference.
- **Each of the two Frames is its own scroll container.** Sub-widgets tile inside via CSS grid (2 columns); row heights are not forced uniform (Mert explicitly rescinded "approximately same size" once the age widget's up-to-10-bar height became a factor) — general grid shape is preserved, individual cells just take the height their content needs. If a Frame's content runs taller than the viewport, that Frame scrolls internally; no sub-widget gets its own nested scrollbar.
- **Sub-widget headers are a light label + underline** (the team-popup `StatList` treatment), not the heavier colored `FrameHeader` band used for standalone widgets elsewhere — 13 full-color header bands crammed into two containers would fight each other visually.
- **Ranked-list widgets (left, all 7)** reuse the existing `StatWidget` row shape (rank + icon + name + value). The 3 player-based widgets keep the existing solid-fill initials avatar. The 4 team-based widgets (overperform/underperform/agreed/disagreed) use the real `TeamCrest` badge instead, since real crest data already exists for actual teams — a small upgrade over blindly copying the player-avatar look.
- **Bar-chart widgets (right, 5 of 6 real + 1 placeholder)** are hand-rolled flexbox bars — a label plus a track div with a width-percentage fill, styled with the existing navy/brass/silver palette. No charting library: nothing in this codebase uses one today (confirmed via `package.json`), and every existing visual (the pitch diagram, `StatWidget`) is already hand-rolled SVG/CSS. Adding a dependency for what's fundamentally a width calculation would be the outlier, not the norm.
- **Page access**: `pageAccess.ts`'s `stats` entry changes from `["ST_NLI", "ST_LI"]` to `["ST_LI"]` — sign-in required, tournament-started required (unchanged on that axis). This is the direct fix for survey data (needs `request.auth != null` to read) being needed by a page that used to allow logged-out visitors.

## Data Model

No new Firestore collections. Reads `profiles` (via `usePlayers()`, existing), `surveyResponses` (new hook, see below), `predictions`/`results` (via existing `useLeaderboard`/`useResults`, for the bias/agreement computations).

## Components & Flow

- **`src/predictions/useSurveyResponses.ts`** (new, plural — distinct from the existing singular `useSurveyResponse`) — `getDocs(collection(db, "surveyResponses"))`, mapped to `{ uid, ...SurveyResponse }[]`. Mirrors `usePlayers()`'s exact shape (`{ data, loading }`, log-and-degrade on failure).
- **`src/stats/ageBuckets.ts`** (new) — fixed-order bucket labels, `bucketAge(age: number): string`, `computeAgeDistribution(responses: SurveyResponse[]): { bucket: string; count: number }[]` (always all 10 buckets, zero included).
- **`src/stats/surveyAggregates.ts`** (new) — `computeFootballKnowledgeDistribution` (1–7, zero included), `computeMessiRonaldoDistribution` (3 fixed categories, zero included), `computeSuperLigDistribution` (6 fixed categories, sorted by count descending, zero-vote categories omitted). One file, since all three are small, single-purpose counts over the same input shape.
- **`src/stats/teamAgreement.ts`** (new) — `TeamAgreement { teamId: string; teamName: string; spread: number }`, `computeTeamAgreement(rankings: string[][]): TeamAgreement[]` — standard deviation of predicted position per team, sorted ascending (lowest spread/most-agreed first).
- **`src/stats/teamBias.ts`** — unchanged, reused as-is for overperform/underperform (first 3 / last 3 of the existing sorted output).
- **`src/stats/RankedStatList.tsx`** (new, replaces the rendering half of `StatWidget.tsx` and all of `TeamBiasTable.tsx`) — generic ranked-row renderer (rank + icon + name + value), icon slot accepts either the existing initials-avatar or `TeamCrest`. `StatWidget.tsx`'s dummy row data stays; its rendering is re-pointed at this shared component with the lighter sub-widget header.
- **`src/stats/BarChartWidget.tsx`** (new) — generic horizontal bar list (label + bars sized by value/max).
- **`src/stats/NumberBox.tsx`** (new, small) — the straight participant-count box.
- **`src/pages/StatsPage.tsx`** — full rewrite: `PAGE_SHELL`/`MAIN_ROW` two-`Frame` composition, wires `usePlayers()`, `useSurveyResponses()`, `useLeaderboard()`, `useResults()` into the 13 widgets above.
- **Deleted**: `src/stats/AccuracyTable.tsx`, `src/stats/accuracy.ts`, and their tests; `src/stats/TeamBiasTable.tsx` (replaced by `RankedStatList` usage) and its test.
- **`src/state/pageAccess.ts`** — one-line change, `stats: ["ST_LI"]`.

## Data Flow

`usePlayers()` (all `profiles`) → participant count. `useSurveyResponses()` (all `surveyResponses`) → age/knowledge/messi-ronaldo/süper-lig distributions, computed client-side via the new pure functions. `useLeaderboard()` (existing, all `predictions`+`profiles`) → `rankings` feeds both `computeTeamBias` and the new `computeTeamAgreement`. `useResults()` (existing) → feeds `computeTeamBias`. UCL-team widget takes no live data at all — a small hardcoded array defined directly in `StatsPage.tsx`, next to the other widget wiring.

## Error Handling

Inherited from existing hook conventions (`usePlayers`, `useLeaderboard`, `useResults` already log-and-degrade on failure) plus the same pattern applied to the new `useSurveyResponses`. All new pure functions have no I/O — malformed/empty input produces an empty or partial output, never a throw, matching `teamBias.ts`/`accuracy.ts`'s existing precedent.

## Security Rules

No rule changes needed. `surveyResponses` already allows any signed-in read (as of today, for the participant popup). The `pageAccess.ts` change means only signed-in users ever reach a page that reads it — the exposure surface is exactly the same population already allowed by the existing rule, just enforced at the page level too.

## Testing Approach

Same Vitest pattern as every other unit. New pure functions (`ageBuckets.ts`, `surveyAggregates.ts`, `teamAgreement.ts`) get plain Vitest coverage — bucket boundaries, zero-inclusion, sort order, empty input. `useSurveyResponses.ts` mocked the same way `usePlayers.test.ts`/`TeamPopup.test.tsx` already mock `getDocs`/`collection`. `RankedStatList`/`BarChartWidget`/`NumberBox` get standard RTL render tests. `StatsPage.test.tsx` rewritten for the new gate (`ST_LI`-only) and the new widget set, replacing the current mocks of `AccuracyTable`/`TeamBiasTable`.

## Setup Dependencies (needs Mert, not just Claude)

None. No new Firestore rules to deploy, no new collections, no manual browser-only step. A visual sanity check once it's built is worthwhile as always, but nothing blocks building it end-to-end first.

## Follow-ups for Later Units

- UCL-team free-text → select conversion (Mert's own, separate, already-flagged future change) — once live, swap the placeholder UCL widget for a real `computeSuperLigDistribution`-style aggregate.
- Rank-over-time / points-timeline graphs — needs real matchday history to exist.
- "Who picked whom" — needs round-2 submission infrastructure.
- Results automation (`SPEC.md` §7) — still fully open.
