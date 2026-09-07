/** A single fixtures/{id} document, written by functions/fixtures from
 *  football-data.org — real kickoff times and (once played) real scores,
 *  distinct from src/devpanel/fixtures.ts's mock calendar. `id` is
 *  football-data.org's own match id. */
export interface RealFixture {
  id: string;
  matchday: number;
  /** Sequential chronological order across the whole competition — assigned
   *  by functions/fixtures at sync time, needed so rankHistory.ts can replay
   *  decided matches in true kickoff order. */
  order: number;
  homeTeamId: string;
  awayTeamId: string;
  kickoffUtc: string;
  /** football-data.org's own match status string, e.g. "TIMED", "IN_PLAY",
   *  "FINISHED", "POSTPONED" — passed through as-is, not narrowed, since
   *  nothing here needs to branch on every possible value yet. */
  status: string;
  /** Both null until the match is FINISHED. */
  homeGoals: number | null;
  awayGoals: number | null;
}
