import { TeamResult } from "./teamResultTypes";

export function computeScore(ranking: string[], results: Record<string, TeamResult>): number {
  let score = 0;
  ranking.forEach((teamId, index) => {
    const result = results[teamId];
    if (!result) return;
    const predictedPosition = index + 1;
    if (Math.abs(predictedPosition - result.position) < 3) {
      score += 3;
    }
  });
  return score;
}
