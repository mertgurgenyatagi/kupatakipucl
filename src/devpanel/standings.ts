import { FIXTURES } from "./fixtures";
import { TEAMS } from "../predictions/teams";
import { TeamResult } from "../leaderboard/teamResultTypes";

export type MatchOutcome = "notplayed" | "homewin" | "draw" | "awaywin";

interface TeamAccumulator {
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

// Synthetic scorelines (Mert's explicit choice over real historical scores):
// any win is 1-0, any draw is 0-0. Goal difference exists purely so the
// team table's sortable columns have something meaningful to show, not to
// mirror reality.
function applyOutcome(acc: Map<string, TeamAccumulator>, homeId: string, awayId: string, outcome: MatchOutcome): void {
  const home = acc.get(homeId)!;
  const away = acc.get(awayId)!;

  if (outcome === "homewin") {
    home.points += 3;
    home.goalsFor += 1;
    away.goalsAgainst += 1;
  } else if (outcome === "awaywin") {
    away.points += 3;
    away.goalsFor += 1;
    home.goalsAgainst += 1;
  } else if (outcome === "draw") {
    home.points += 1;
    away.points += 1;
  }
  // "notplayed" contributes nothing.
}

export function computeStandings(outcomes: Record<string, MatchOutcome>): Record<string, TeamResult> {
  const acc = new Map<string, TeamAccumulator>();
  TEAMS.forEach((team) => acc.set(team.id, { points: 0, goalsFor: 0, goalsAgainst: 0 }));

  FIXTURES.forEach((fixture) => {
    const outcome = outcomes[fixture.id] ?? "notplayed";
    applyOutcome(acc, fixture.homeTeamId, fixture.awayTeamId, outcome);
  });

  const ranked = TEAMS.map((team) => {
    const stats = acc.get(team.id)!;
    return {
      teamId: team.id,
      teamName: team.name,
      points: stats.points,
      goalDifference: stats.goalsFor - stats.goalsAgainst,
      goalsFor: stats.goalsFor,
      goalsAgainst: stats.goalsAgainst,
    };
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.teamName.localeCompare(b.teamName);
  });

  const results: Record<string, TeamResult> = {};
  ranked.forEach((team, index) => {
    results[team.teamId] = {
      position: index + 1,
      points: team.points,
      goalDifference: team.goalDifference,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
    };
  });
  return results;
}
