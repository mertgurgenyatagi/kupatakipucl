import { LeaderboardEntry } from "./leaderboardTypes";

export interface RankedEntry {
  entry: LeaderboardEntry;
  /** Standard competition ranking: ties share a rank, the next rank
   *  skips accordingly (e.g. 1, 1, 3, 3, 3, 6). No movement deltas —
   *  the leaderboard stays cool (DESIGN-SPEC §6). */
  rank: number;
}

/**
 * Assigns standard competition ranks to entries already sorted by points
 * descending (as `useLeaderboard` provides them). Pure and order-preserving.
 */
export function assignRanks(entries: LeaderboardEntry[]): RankedEntry[] {
  let lastPoints: number | null = null;
  let lastRank = 0;
  return entries.map((entry, index) => {
    if (lastPoints === null || entry.points !== lastPoints) {
      lastRank = index + 1;
      lastPoints = entry.points;
    }
    return { entry, rank: lastRank };
  });
}
