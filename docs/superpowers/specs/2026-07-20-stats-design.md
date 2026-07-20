# Design: Stats Page (scoped)

Status: Self-directed (same delegation as units 4-5). This design deliberately scopes down `SPEC.md` §8d — see Non-Goals for why each excluded item genuinely can't be built responsibly right now, not just "later."
Build unit: 6 of 7 in the section-by-section plan (see `SPEC.md` §9b).

## Overview

`SPEC.md` §8d lists four confirmed baseline stats plus two carried-over feature ideas. Of those six, only two are buildable today without either (a) historical data that doesn't exist yet, since the tournament hasn't started, or (b) a new server-side architecture decision that deserves its own dedicated design pass rather than being rushed at the tail of this session. This unit builds those two, and documents the other four as designed-but-explicitly-deferred, not silently dropped.

## Goals

- **Most-accurate-predictor ranking**: for each participant who submitted a round-1 prediction, their average absolute position deviation (`|predicted − actual|`) across every team they ranked that has a real result — lower average = more accurate. This is a different lens than the existing `/leaderboard` (which sums a coarse 3-point-per-team-within-threshold score): someone can have a solid points total while still being meaningfully less precise on average than someone else, and this view surfaces that.
- **Most over/under-predicted teams**: for each team with a real result, the average signed difference between where participants predicted it and where it actually finished — surfaces which teams the group collectively rated too highly ("overrated") or too low ("underrated").
- Both are computed entirely from data that already exists and is already public (`predictions`, `results` — both opened to public read in unit 3) — **no new Firestore collections, no new security rules needed for this unit.**
- Visible per `pageAccess.ts`'s existing `stats: ["ST_NLI", "ST_LI"]` gate (already correct from unit 1 — only meaningful once the tournament has started and real results exist; includes the logged-out `ST_NLI` state, consistent with the public-read data these stats are computed from).

## Non-Goals (explicitly deferred, with why)

- **Rank-over-time line graph** (§8d item 1) and **match-by-match points timeline graph** (§8d carried-over idea): both need a *history* of results/scores at successive points in time, not just the current snapshot `results` gives. The tournament hasn't started (today is well before Sept 8, 2026) — there is no real history to graph yet, and no way to test a snapshotting design against real data. Building the snapshot-capture mechanism now would be speculative in the least testable way possible. Revisit once real matchdays start producing results to actually snapshot.
- **"Who picked whom" transparency view** (§8d carried-over idea): this is explicitly a **round-2 knockout** feature ("per team, show how many participants predicted it to advance/reach a given stage" — stage-advancement is a knockout-bracket concept, round-1 is a flat ranking with no stages). Round 2 has no submission UI or data model yet (deferred to its own future unit since prediction-flow, unit 2). This isn't just hard right now, it's structurally impossible without round-2 existing first.
- **Public survey-response aggregates** (§8d item 4): the `surveyResponses` collection is currently `read: if request.auth != null && request.auth.uid == uid` — owner-only, by design, since individual survey answers were never meant to be exposed per-person (`SPEC.md` explicitly says results should be aggregate-only, never attached to an individual's public profile). Computing an aggregate (age distribution, football-knowledge scale, etc.) *client-side* would require every visitor's browser to actually download every individual's raw answers to compute the aggregate locally — even if the UI only ever displays the aggregate, the raw per-person data would be sitting in that visitor's browser memory/network tab, which defeats the entire point of the owner-only rule. The correct architecture is server-side aggregation (most naturally a Cloud Function that recomputes an aggregate doc when responses change, or on a schedule) writing to a new public-read `surveyAggregates` doc, keeping raw responses owner-only forever. That's a real architecture decision — this session's `stopbilling` Cloud Function work demonstrated non-trivial deploy/IAM friction for exactly this kind of new Cloud Function — and deserves a dedicated design pass, not a rushed one at the end of a long autonomous run. Deferred as its own follow-up unit.

## Architecture

- **Two pure scoring/aggregation functions, no new hooks needed beyond composing existing ones.** `computeAccuracy(entries: LeaderboardEntry[], results: Record<string, TeamResult>): AccuracyEntry[]` and `computeTeamBias(rankings: string[][], results: Record<string, TeamResult>): TeamBias[]` — both pure, both independently unit-testable, no Firestore involved. This mirrors `src/leaderboard/scoring.ts`'s precedent exactly: keep the math Firestore-free and push all I/O into thin hooks.
- **Reuses `useLeaderboard` and `useResults`** (both already exist, from unit 3) rather than building new data-fetching. `useLeaderboard`'s entries already carry each participant's `ranking`, which is exactly what's needed for both computations — no new collection reads.
- **A team is only included in the "over/under-predicted" ranking if it has a real result.** Teams with no `results` doc yet (pre/early-tournament) are excluded from that list entirely rather than shown with meaningless placeholder numbers — matches the "static 0-point list, no sort controls" precedent `TeamTable` already established for "we don't have real data for this yet."
- **A participant is only included in the accuracy ranking if at least one of their ranked teams has a real result.** Someone whose entire prediction is still all-unresolved contributes no meaningful average and is excluded, not shown with a misleading "0.0 average deviation."

## Data Model

No new collections. Reads `predictions` (existing), `results` (existing), joins via `useLeaderboard`'s existing entries (which already include `profiles` data for names).

## Components & Flow

- **`src/stats/accuracy.ts`** — `AccuracyEntry { uid: string; firstName: string; lastName: string; averageDeviation: number }`, `computeAccuracy(entries: LeaderboardEntry[], results: Record<string, TeamResult>): AccuracyEntry[]`. For each entry, averages `|predictedPosition − actualPosition|` over only the teams in that entry's `ranking` that have a `results` entry; entries with zero resolvable teams are excluded from the output. Sorted ascending (lower deviation first).
- **`src/stats/teamBias.ts`** — `TeamBias { teamId: string; teamName: string; averageDifference: number }`, `computeTeamBias(rankings: string[][], results: Record<string, TeamResult>): TeamBias[]`. For each team with a result, averages `(actualPosition − predictedPosition)` across every prediction that ranked it; excludes teams with no result. With `averageDifference = actualPosition − predictedPosition`, a negative value means the team finished better (lower/stronger position number) than predicted — underrated by the group — and a positive value means it finished worse than predicted — overrated. Sorted ascending (most negative/most-underrated first); the UI shows the full sorted list rather than splitting into two separate "overrated"/"underrated" lists, since the sign of the number already communicates that.
- **`src/stats/AccuracyTable.tsx`** — renders `AccuracyEntry[]` as a ranked list (name + average deviation), with a fallback message when empty.
- **`src/stats/TeamBiasTable.tsx`** — renders `TeamBias[]` as a ranked list (team name + signed average difference), with a fallback message when empty.
- **`src/pages/StatsPage.tsx`** — replaces the `PlaceholderPage` wrapper: `isPageAllowed("stats", state)` gate (matching every other gated page's convention), then `useLeaderboard()` + `useResults()`, computes both stats via the pure functions above, renders both tables.

## Data Flow

`useLeaderboard()` (already reads `predictions`+`profiles`, computes points) + `useResults()` (already reads `results`) both feed `StatsPage`, which derives `AccuracyEntry[]`/`TeamBias[]` via the two pure functions and renders them. No new Firestore round-trips beyond what unit 3 already established.

## Error Handling

Inherited entirely from the existing hooks (`useLeaderboard`/`useResults` already log-and-degrade-gracefully on read failure, per unit 3). The two new pure functions have no I/O and thus no error path of their own — a malformed/empty input just produces an empty or partial output, never a throw.

## Security Rules

None needed — every collection this unit reads (`predictions`, `results`, `profiles` via `useLeaderboard`) is already public-read as of unit 3.

## Testing Approach

Same Vitest pattern as every prior unit. `accuracy.ts`/`teamBias.ts` are pure functions — plain Vitest, no Firestore mocking, no React Testing Library needed for those two files (matching `scoring.ts`'s precedent). Key cases: correct average-deviation math across multiple teams, exclusion of unresolved teams/entries, sort order, empty-input handling. `AccuracyTable`/`TeamBiasTable` — standard RTL component tests (renders data, shows fallback when empty). `StatsPage` — gating test mirroring every other gated page's existing pattern (`LeaderboardPage`, `ChatPage`, `ForumPage`).

## Setup Dependencies (needs Mert, not just Claude)

None for this unit specifically — no new rules to deploy, no manual browser check strictly required for correctness (everything is derived/computed data with no upload/real-time concerns), though a quick visual sanity check whenever convenient is still worthwhile.

## Follow-ups for Later Units

- Survey-aggregate stats: needs a dedicated Cloud-Function-based aggregation design (own unit).
- Rank-over-time and points-timeline graphs: needs a historical-snapshot design, buildable once real matchday results start existing to snapshot.
- "Who picked whom": needs round-2 (knockout bracket) submission infrastructure to exist first.
- Visual polish (charts/graphs instead of plain ranked lists) — `impeccable` pass, `SPEC.md` §9a, whole-site at once.
- Unit 7, results automation (`SPEC.md` §7) — still fully OPEN, needs real research into a live data source, explicitly out of scope for autonomous building.
