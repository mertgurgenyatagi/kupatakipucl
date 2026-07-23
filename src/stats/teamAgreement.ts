import { TEAMS } from "../predictions/teams";

export interface TeamAgreement {
  teamId: string;
  teamName: string;
  spread: number;
}

export function computeTeamAgreement(rankings: string[][]): TeamAgreement[] {
  const agreements: TeamAgreement[] = [];

  TEAMS.forEach((team) => {
    const positions: number[] = [];
    rankings.forEach((ranking) => {
      const index = ranking.indexOf(team.id);
      if (index === -1) return;
      positions.push(index + 1);
    });
    if (positions.length === 0) return;

    const mean = positions.reduce((sum, p) => sum + p, 0) / positions.length;
    const variance = positions.reduce((sum, p) => sum + (p - mean) ** 2, 0) / positions.length;
    agreements.push({ teamId: team.id, teamName: team.name, spread: Math.sqrt(variance) });
  });

  return agreements.sort((a, b) => a.spread - b.spread);
}
