/** A single fixtures/{id} document, written by functions/fixtures from
 *  football-data.org — real kickoff times and (once played) real scores,
 *  distinct from src/devpanel/fixtures.ts's mock calendar. `id` is
 *  football-data.org's own match id. */
export interface RealFixture {
  id: string;
  /** Null for every knockout fixture — football-data.org only numbers
   *  matchdays within the league phase, so nothing may assume this is a
   *  number without first narrowing on `stage` (see fixtureStages.ts's
   *  getLeagueFixtures). */
  matchday: number | null;
  /** football-data.org's own stage string — "LEAGUE_STAGE", "PLAYOFFS",
   *  "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL". Optional because a
   *  document synced before this field existed (2026-09-09) genuinely has no
   *  value for it until the next sync overwrites it — same reasoning as
   *  LeaderboardEntry.submittedAt. Absent is read as league-phase, which is
   *  what every such document was. */
  stage?: string | null;
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
