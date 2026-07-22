/**
 * The one "what time is it" function anything tournament-date-shaped should
 * use. Honors `?debugDate=` in dev only, so testing "what does the site look
 * like in November" never depends on the real system clock — extracted out
 * of useTournamentPhase so a second consumer (upcomingFixtures) doesn't
 * reimplement the same override logic.
 */
export function resolveNow(): Date {
  if (import.meta.env.DEV) {
    const params = new URLSearchParams(window.location.search);
    const debugDate = params.get("debugDate");
    if (debugDate) {
      const parsed = new Date(debugDate);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return new Date();
}
