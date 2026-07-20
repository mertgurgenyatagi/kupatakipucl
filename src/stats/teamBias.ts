import { TEAMS } from "../predictions/teams";
import { TeamResult } from "../leaderboard/teamResultTypes";

export interface TeamBias {
  teamId: string;
  teamName: string;
  averageDifference: number;
}

export function computeTeamBias(
  rankings: string[][],
  results: Record<string, TeamResult>
): TeamBias[] {
  const teamBiases: TeamBias[] = [];

  TEAMS.forEach((team) => {
    const result = results[team.id];
    if (!result) return;

    const differences: number[] = [];
    rankings.forEach((ranking) => {
      const index = ranking.indexOf(team.id);
      if (index === -1) return;
      const predictedPosition = index + 1;
      differences.push(result.position - predictedPosition);
    });
    if (differences.length === 0) return;

    const averageDifference = differences.reduce((sum, d) => sum + d, 0) / differences.length;
    teamBiases.push({ teamId: team.id, teamName: team.name, averageDifference });
  });

  return teamBiases.sort((a, b) => a.averageDifference - b.averageDifference);
}
