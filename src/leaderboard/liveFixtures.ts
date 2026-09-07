import { RealFixture } from "./realFixtureTypes";

/**
 * football-data.org's own match-status strings (passed through as-is by
 * functions/fixtures — see realFixtureTypes.ts). IN_PLAY and PAUSED (e.g.
 * half-time) both count as "live" for UI purposes; everything else
 * (TIMED, FINISHED, POSTPONED, SUSPENDED, ...) doesn't.
 */
export function isLiveStatus(status: string): boolean {
  return status === "IN_PLAY" || status === "PAUSED";
}

export function isFixtureLive(fixture: RealFixture): boolean {
  return isLiveStatus(fixture.status);
}

/** Every team currently in a live match, home or away. */
export function getLiveTeamIds(fixtures: RealFixture[]): Set<string> {
  const ids = new Set<string>();
  fixtures.forEach((f) => {
    if (isFixtureLive(f)) {
      ids.add(f.homeTeamId);
      ids.add(f.awayTeamId);
    }
  });
  return ids;
}

/** Whether anything, anywhere, is live right now — the global indicator's
 *  whole condition. */
export function hasAnyLiveFixture(fixtures: RealFixture[]): boolean {
  return fixtures.some(isFixtureLive);
}
