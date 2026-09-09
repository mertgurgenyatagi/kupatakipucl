import { computeStandingsFromMatches, MatchGoals } from "./standingsAccumulator";
import { computeScore } from "./scoring";
import { computeContrarianScores } from "./contrarianScore";
import { assignRanks } from "./ranking";
import { LeaderboardEntry } from "./leaderboardTypes";
import { RealFixture } from "./realFixtureTypes";
import { getLeagueFixtures } from "./fixtureStages";

export interface RankCheckpoint {
  /** The fixture whose outcome produced this checkpoint. */
  fixtureId: string;
  /** Which matchday that fixture belongs to — still carried through for the
   *  chart's "N. hafta" axis labels, even though checkpoints now land one
   *  per decided match rather than one per completed matchday. */
  matchday: number;
  rank: number;
}

/**
 * Reconstructs a participant's rank after each individually decided match,
 * from the real football-data.org fixture calendar (functions/fixtures,
 * fixtures/{id}) — real goals, not devpanel's synthetic 1-0/0-0 scorelines.
 * Real-data equivalent of the dev panel's own history-by-replay approach:
 * "increments of matches on the timeline, not real time" (the original
 * brief, PAGE_BRIEFING.txt), reusing the exact same points/tie-break rules
 * via standingsAccumulator.ts so this can never disagree with the live
 * results table or the dev-only version.
 *
 * `fixtures` is assumed sorted by `order` (useFixtures.ts already sorts it)
 * and stops at the first fixture without both goals recorded, on the
 * assumption that finished matches form a contiguous prefix by kickoff time
 * — true for a normal calendar, and not defended against a postponement
 * finishing out of order. Revisit if that ever actually happens.
 *
 * Knockout fixtures are dropped before any of that: this chart is a replay of
 * the 36-team league table, which the knockout rounds do not affect.
 */
export function computeRankHistory(
  uid: string,
  entries: LeaderboardEntry[],
  allFixtures: RealFixture[],
  optaRanking: string[] = []
): RankCheckpoint[] {
  const fixtures = getLeagueFixtures(allFixtures);
  const checkpoints: RankCheckpoint[] = [];
  const matchGoalsThrough: Record<string, MatchGoals | undefined> = {};

  for (const fixture of fixtures) {
    if (fixture.homeGoals === null || fixture.awayGoals === null) break;
    matchGoalsThrough[fixture.id] = { homeGoals: fixture.homeGoals, awayGoals: fixture.awayGoals };

    const historicalResults = computeStandingsFromMatches(fixtures, matchGoalsThrough, optaRanking);
    const contrarianScores = computeContrarianScores(entries, historicalResults);

    const scored = entries
      .map((entry) => ({
        ...entry,
        points: computeScore(entry.ranking, historicalResults),
        contrarianScore: contrarianScores[entry.uid] ?? 0,
      }))
      .sort((a, b) => b.points - a.points || b.contrarianScore - a.contrarianScore);
    const ranked = assignRanks(scored);
    const mine = ranked.find((r) => r.entry.uid === uid);
    if (mine) {
      checkpoints.push({ fixtureId: fixture.id, matchday: fixture.matchday, rank: mine.rank });
    }
  }

  return checkpoints;
}
