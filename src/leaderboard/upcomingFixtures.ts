import { RealFixture } from "./realFixtureTypes";

/**
 * "Upcoming" means not yet finished — a fixture stays in this list once it
 * kicks off (kickoff moves into the past the instant a match starts, so
 * filtering on kickoff-in-the-future alone would drop a live match right
 * when it becomes most worth showing). Live fixtures naturally sort first,
 * since they're chronologically earliest. Not gated on whether a result has
 * been recorded — this needs to work identically for a logged-out visitor
 * in production. `now` is threaded in (via tournament/now.ts's resolveNow)
 * so it stays testable through the same `?debugDate=` override the rest of
 * the app already uses. `fixtures` comes from useFixtures.ts
 * (functions/fixtures' real football-data.org sync) — no longer the
 * devpanel's mock calendar (PROJECT.md §11 problem 16, fixed 2026-09-07).
 *
 * No longer takes `now` — the filter used to be "kickoff in the future
 * relative to now", but nothing here needs the current time any more since
 * the filter is just "not finished" (2026-09-07, the live-match feature).
 */
export function getUpcomingFixtures(fixtures: RealFixture[]): RealFixture[] {
  return fixtures.filter((f) => f.status !== "FINISHED").sort((a, b) => a.order - b.order);
}
