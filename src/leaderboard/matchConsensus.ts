import { LeaderboardEntry } from "./leaderboardTypes";

export interface MatchConsensus {
  /** Participants who ranked the home team above the away team. */
  home: number;
  away: number;
}

/**
 * For one fixture: how the group split on these two teams. Everyone placed
 * all 36 into a finishing order, so every participant already has an implicit
 * opinion about which of any two is the better side — this reads it off.
 *
 * Deliberately not a prediction about the match itself, and the label on it
 * ("Sıralamada üstte görenler") says so. It's the one number on a fixture row
 * that could only exist in this app, and unlike MatchupPopup's per-team
 * average predicted position, it says something about the pairing rather than
 * about either team alone.
 *
 * Null when nobody has an opinion to report — an empty leaderboard, or a
 * fixture whose teams somehow aren't in the predictions (never true for a
 * real 36-team ranking, but cheaper to handle than to prove impossible).
 */
export function computeMatchConsensus(
  homeTeamId: string,
  awayTeamId: string,
  entries: LeaderboardEntry[]
): MatchConsensus | null {
  let home = 0;
  let away = 0;

  entries.forEach((entry) => {
    const homeIndex = entry.ranking.indexOf(homeTeamId);
    const awayIndex = entry.ranking.indexOf(awayTeamId);
    if (homeIndex === -1 || awayIndex === -1) return;
    if (homeIndex < awayIndex) home += 1;
    else away += 1;
  });

  return home + away === 0 ? null : { home, away };
}
