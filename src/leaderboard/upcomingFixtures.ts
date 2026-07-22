import { FIXTURES, Fixture } from "../devpanel/fixtures";

/**
 * "Upcoming" is defined purely by the real calendar (kickoff in the future
 * relative to `now`) rather than the dev panel's `devMatches` outcomes —
 * that collection is dev-only and auth-gated, and this list needs to work
 * identically for a logged-out visitor in production. `now` is threaded in
 * (via tournament/now.ts's resolveNow) so it stays testable through the
 * same `?debugDate=` override the rest of the app already uses.
 */
export function getUpcomingFixtures(now: Date): Fixture[] {
  const nowMs = now.getTime();
  return FIXTURES.filter((f) => new Date(f.kickoffUtc).getTime() > nowMs).sort(
    (a, b) => a.order - b.order
  );
}
