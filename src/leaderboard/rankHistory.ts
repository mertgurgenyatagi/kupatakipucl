import { FIXTURES } from "../devpanel/fixtures";
import { computeStandings, MatchOutcome } from "../devpanel/standings";
import { computeScore } from "./scoring";
import { assignRanks } from "./ranking";
import { LeaderboardEntry } from "./leaderboardTypes";

export interface RankCheckpoint {
  /** The fixture whose outcome produced this checkpoint. */
  fixtureId: string;
  /** Which matchday that fixture belongs to — still carried through for the
   *  chart's "N. hafta" axis labels, even though checkpoints now land one
   *  per decided match rather than one per completed matchday. */
  matchday: number;
  rank: number;
}

const FIXTURES_BY_ORDER = [...FIXTURES].sort((a, b) => a.order - b.order);

/**
 * Reconstructs a participant's rank after each individually decided match,
 * purely from real recorded outcomes — "increments of matches on the
 * timeline, not real time" (the original brief, PAGE_BRIEFING.txt — read
 * literally: matches, not matchdays). No separate history collection exists
 * (or can exist for real production data — results get hand-edited with no
 * code path to snapshot through, since results automation was explicitly
 * skipped); `outcomes` is whatever's currently in `devMatches`, replayed
 * match-by-match (in fixture order) through the same `computeStandings` the
 * live table itself uses. Stops at the first undecided fixture — the
 * sequential-decide rule in setMatchOutcome guarantees decided fixtures are
 * always a contiguous prefix by `order`, so this never produces a checkpoint
 * out of order.
 */
export function computeRankHistory(
  uid: string,
  entries: LeaderboardEntry[],
  outcomes: Record<string, MatchOutcome>
): RankCheckpoint[] {
  const checkpoints: RankCheckpoint[] = [];
  const outcomesThrough: Record<string, MatchOutcome> = {};

  for (const fixture of FIXTURES_BY_ORDER) {
    const outcome = outcomes[fixture.id] ?? "notplayed";
    if (outcome === "notplayed") break;
    outcomesThrough[fixture.id] = outcome;

    const historicalResults = computeStandings(outcomesThrough);

    const scored = entries
      .map((entry) => ({ ...entry, points: computeScore(entry.ranking, historicalResults) }))
      .sort((a, b) => b.points - a.points);
    const ranked = assignRanks(scored);
    const mine = ranked.find((r) => r.entry.uid === uid);
    if (mine) {
      checkpoints.push({ fixtureId: fixture.id, matchday: fixture.matchday, rank: mine.rank });
    }
  }

  return checkpoints;
}
