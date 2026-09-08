import { TeamResult } from "./teamResultTypes";
import { isPickCorrect } from "./scoring";

export interface ContrarianInput {
  uid: string;
  ranking: string[];
}

/**
 * A leaderboard tiebreaker, not a score: for each of a participant's
 * *correct* picks, how far their predicted position sat from the field's
 * average predicted position for that team. Summed (not averaged) across
 * every contrarian-correct pick, so more bold-and-right calls beat one big
 * one. No threshold — every bit of deviation counts. Never touches points;
 * only used to order participants who are already tied on points.
 */
export function computeContrarianScores(
  entries: ContrarianInput[],
  results: Record<string, TeamResult>
): Record<string, number> {
  const sumByTeam: Record<string, number> = {};
  const countByTeam: Record<string, number> = {};
  entries.forEach((entry) => {
    entry.ranking.forEach((teamId, index) => {
      sumByTeam[teamId] = (sumByTeam[teamId] ?? 0) + (index + 1);
      countByTeam[teamId] = (countByTeam[teamId] ?? 0) + 1;
    });
  });
  const crowdAverage: Record<string, number> = {};
  Object.keys(sumByTeam).forEach((teamId) => {
    crowdAverage[teamId] = sumByTeam[teamId] / countByTeam[teamId];
  });

  const scores: Record<string, number> = {};
  entries.forEach((entry) => {
    let score = 0;
    entry.ranking.forEach((teamId, index) => {
      const result = results[teamId];
      if (!result) return;
      const predictedPosition = index + 1;
      if (!isPickCorrect(predictedPosition, result.position)) return;
      score += Math.abs(predictedPosition - crowdAverage[teamId]);
    });
    scores[entry.uid] = score;
  });
  return scores;
}
