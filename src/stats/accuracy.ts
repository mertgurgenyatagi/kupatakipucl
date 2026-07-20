import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import { TeamResult } from "../leaderboard/teamResultTypes";

export interface AccuracyEntry {
  uid: string;
  firstName: string;
  lastName: string;
  averageDeviation: number;
}

export function computeAccuracy(
  entries: LeaderboardEntry[],
  results: Record<string, TeamResult>
): AccuracyEntry[] {
  const accuracyEntries: AccuracyEntry[] = [];

  entries.forEach((entry) => {
    const deviations: number[] = [];
    entry.ranking.forEach((teamId, index) => {
      const result = results[teamId];
      if (!result) return;
      const predictedPosition = index + 1;
      deviations.push(Math.abs(predictedPosition - result.position));
    });
    if (deviations.length === 0) return;
    const averageDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
    accuracyEntries.push({
      uid: entry.uid,
      firstName: entry.firstName,
      lastName: entry.lastName,
      averageDeviation,
    });
  });

  return accuracyEntries.sort((a, b) => a.averageDeviation - b.averageDeviation);
}
