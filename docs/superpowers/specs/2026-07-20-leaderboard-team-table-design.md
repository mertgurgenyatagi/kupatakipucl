# Design: Leaderboard / Team Table

Status: Approved (chat), pending written-spec review.
Build unit: 3 of 7 in the section-by-section plan (see `SPEC.md` §9b).

## Overview

The club team-table (standings) and the participant points leaderboard, plus the signed-up player list. These three pieces are grouped as one named build unit in `SPEC.md` §9b, and share the same underlying data: everyone's `predictions` and a new manually-maintained `results` collection. Real automated results ingestion (`SPEC.md` §7) is explicitly its own later unit — this unit builds the UI and scoring logic against a `results` collection that Mert/Claude populate by hand for now, so the automation swap later is a data-source change, not a UI rewrite.

## Goals

- **Team table**, shown on `HomePage` in all four visibility states (`SPEC.md` §8): static alphabetical 0-point list before the tournament starts (or whenever `results` is still empty), sortable-by-column (points/GD/goals) real standings once it's started and populated.
- **Player list**, also on `HomePage`: pre-tournament, first name + photo + total count for logged-out visitors, full names + photos for logged-in users. Post-tournament, additionally reveals each participant's submitted team ranking (or a "didn't submit" marker) — this is `SPEC.md` §5 step 5's "predictions hidden until the round starts" finally taking effect now that there's a UI to reveal them in.
- **Participant leaderboard**, computed client-side from `predictions` + `results` via `SPEC.md` §3's round-1 scoring rule (`|predicted − actual| < 3` → 3 pts per team), rendered both inline on `HomePage` for started states (matching §8's "participant rankings" bullet) and on its own `/leaderboard` route (already stubbed, already gated to started-only states in `pageAccess.ts`) for direct navigation.

## Non-Goals (explicitly deferred to later units)

- `HomePage`'s real mission blurb copy and live ticking countdown — stay as the existing unit-1 placeholder text for those two elements specifically; copywriting and countdown-timer engineering are separable concerns from this unit's data/UI plumbing. Same reasoning covers "match days remaining."
- Everything in `SPEC.md` §8d (Stats Page): rank-over-time graphs, most-accurate-predictor leaderboard, over/under-predicted teams, public survey-aggregate results, "who picked whom," the points timeline graph. Named as its own later section in §9b's build order.
- Real club crest images, the §8b green-highlight-matched-teams idea, and the post-start team-click popup (squad/coach info) — all visual-polish concerns for the `impeccable` pass (§9a), same precedent as unit 2 deferring crests.
- Round-2 knockout bracket scoring — round 2 has no submission UI yet (future unit). This unit's leaderboard is round-1 points only; combining rounds happens naturally later by extending the same scoring computation, not a rework.
- Automated results ingestion (`SPEC.md` §7) — `results` is manually maintained for this unit; automation is its own later unit per §9b's explicit ordering.

## Architecture

- **New Firestore collection: `results/{teamId}`** — manually maintained (no admin UI; same "ask Claude directly" model as `SPEC.md` §7b), fields: `position: number`, `points: number`, `goalDifference: number`, `goalsFor: number`, `goalsAgainst: number`. Empty until real matches happen; its emptiness is exactly the pre/post-tournament rendering switch for the team table (not the tournament-phase clock alone), so a manually-seeded partial `results` set can be tested any time regardless of the real Sept 8 date.
- **Scoring stays client-side, no Cloud Function.** At this scale (30–50 participants, 36 teams) the computation is trivial, and there's no reason to introduce a second Cloud Function's deploy/IAM surface area (see `functions/stopbilling/README.md` for how much that cost this session) without a real need. `src/leaderboard/scoring.ts` is a pure function, unit-testable with no Firestore involved.
- **Historical snapshotting for the future Stats unit's rank-over-time graphs is explicitly not designed here.** The tournament hasn't started, so there's no real history to lose by deferring that design until the Stats unit is actually built.

## Data Model

- `results/{teamId}`: `position: number`, `points: number`, `goalDifference: number`, `goalsFor: number`, `goalsAgainst: number`. Doc ID = team ID (matches `src/predictions/teams.ts`).
- No new fields on `predictions` or `profiles` — both already have everything this unit needs (`ranking: string[]`, `firstName`/`lastName`/`photoURL`).

## Components & Flow

- **`src/leaderboard/scoring.ts`** — `computeScore(ranking: string[], results: Record<string, TeamResult>): number`, applying `SPEC.md` §3's per-team `|predicted − actual| < 3 → 3pts` rule. Predicted position is the team's index in `ranking`; actual position comes from `results[teamId].position`. Teams missing from `results` (not yet played/ranked) contribute 0, not an error.
- **`src/leaderboard/useResults.ts`** — reads the `results` collection.
- **`src/leaderboard/useLeaderboard.ts`** — reads `predictions` + `profiles` + `results`, joins them, computes each submitter's score via `scoring.ts`, returns a sorted array (desc by points; ties keep the same rank, no tiebreaker per `SPEC.md` §3). Only includes users who actually submitted a round-1 prediction.
- **`src/leaderboard/TeamTable.tsx`** — given `results`: if empty, renders the static alphabetical `TEAMS` list at 0 points, no sort controls; if populated, renders a sortable table defaulting to `position` order (as maintained in `results`), with clickable column headers to re-sort by points/GD/goals.
- **`src/leaderboard/PlayerList.tsx`** — given `usePlayers()` (new hook, lists all `profiles`) and the visibility state: pre-tournament renders per §8's name-visibility split (first-name-only + count when logged out, full names when logged in), marking non-submitters per `SPEC.md` §3's no-show handling; post-tournament additionally shows each person's submitted `ranking` (or "didn't submit") using the same `predictions` data `useLeaderboard` already reads.
- **`src/leaderboard/LeaderboardTable.tsx`** — presentational: renders the sorted array from `useLeaderboard` as a ranked table (rank, photo, name, points).
- **`HomePage`** — replaces the flat placeholder-copy-only render with: existing placeholder line for blurb/countdown (kept, per Non-Goals) + `TeamTable` + `PlayerList`, always; + `LeaderboardTable` additionally in the two started states, matching §8's "participant rankings" bullet.
- **`LeaderboardPage`** — replaces its placeholder with `LeaderboardTable` fed by the same `useLeaderboard` hook — a dedicated, deep-linkable view of the same data shown inline on `HomePage`, not a second implementation.

## Data Flow

`useResults` + existing `usePrediction`-style collection reads + `profiles` → `useLeaderboard` joins and scores → `LeaderboardTable` (both on `HomePage` and `/leaderboard`) and `PlayerList`'s post-start reveal both consume its output. `TeamTable` only needs `useResults` directly, independent of predictions/scoring.

## Error Handling

- `results` (or `profiles`/`predictions`) read failure → inline error state on the affected component only; the rest of `HomePage` still renders (e.g. team table failing doesn't take down the player list).
- Empty `results` is a valid, expected state (pre-tournament or not-yet-seeded) — renders the static fallback, not an error.
- A `predictions` doc whose `uid` has no matching `profiles` doc (shouldn't happen given `ProfileGate`, but defensively) is skipped from the leaderboard/reveal rather than crashing the render.

## Testing Approach

Same pattern as units 1–2: Vitest + React Testing Library, Firestore calls mocked at the module level. Key cases: `scoring.ts`'s position-delta boundary (`< 3`, not `<=`) across a table of cases; `useLeaderboard` sort order and tie-handling; `TeamTable` static-vs-sortable rendering and the empty-`results` fallback; `PlayerList`'s logged-in/out name-visibility split and pre/post-start prediction reveal; `LeaderboardPage` still gated correctly (existing `pageAccess` tests already cover this, just confirm real content renders instead of the placeholder).

## Setup Dependencies (needs Mert, not just Claude)

- None to build/test this unit — `results` can be seeded with fake test data the same way the placeholder team list was, independent of the real Sept 8, 2026 date (the `?debugDate=` dev override already exists from unit 2 for phase-dependent testing). Real `results` data entry (asking Claude to update Firestore by hand) only becomes an actual operational need once real matches start.

## Follow-ups for Later Units

- Automated results ingestion and its data source (`SPEC.md` §7) — replaces manual `results` maintenance.
- Stats page (`SPEC.md` §8d) — needs its own historical-snapshotting design once real matchdays exist to snapshot.
- Team crests, §8b green-highlight-matched-teams, post-start team-click popup — visual polish pass (`impeccable`, §9a).
- `HomePage`'s real mission blurb copy and live countdown.
- Round-2 knockout bracket unit, folded into this same leaderboard once it exists.
