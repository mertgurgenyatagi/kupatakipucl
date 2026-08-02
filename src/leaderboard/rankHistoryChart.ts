import { RankSnapshot } from "./rankSnapshotTypes";
import { FIXTURES } from "../devpanel/fixtures";

const LEAGUE_PHASE_MATCHDAY_COUNT = Math.max(...FIXTURES.map((f) => f.matchday));

export interface RankHistoryPoint {
  matchday: number;
  rank: number;
}

export function buildRankHistoryPoints(snapshots: RankSnapshot[], uid: string): RankHistoryPoint[] {
  return snapshots
    .map((snapshot) => {
      const entry = snapshot.entries.find((e) => e.uid === uid);
      return entry ? { matchday: snapshot.matchday, rank: entry.rank } : null;
    })
    .filter((point): point is RankHistoryPoint => point !== null)
    .sort((a, b) => a.matchday - b.matchday);
}

/**
 * See this file's "Note on the handoff mark" in the plan this was built
 * from: FIXTURES only models the league phase (matchdays 1-8), so any point
 * beyond that can only exist once the knockout stage — and therefore bracket
 * scoring — has begun.
 */
export function findBracketHandoffMatchday(points: RankHistoryPoint[]): number | null {
  const firstKnockoutPoint = points.find((p) => p.matchday > LEAGUE_PHASE_MATCHDAY_COUNT);
  return firstKnockoutPoint ? firstKnockoutPoint.matchday : null;
}
