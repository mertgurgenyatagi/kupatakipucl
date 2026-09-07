import { TEAMS } from "../predictions/teams";
import { TeamResult } from "./teamResultTypes";

export interface MatchGoals {
  homeGoals: number;
  awayGoals: number;
}

export interface StandingsFixture {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
}

interface TeamAccumulator {
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  matchesPlayed: number;
}

function applyMatch(
  acc: Map<string, TeamAccumulator>,
  homeId: string,
  awayId: string,
  goals: MatchGoals | undefined
): void {
  if (!goals) return;
  const home = acc.get(homeId)!;
  const away = acc.get(awayId)!;

  home.matchesPlayed += 1;
  away.matchesPlayed += 1;
  home.goalsFor += goals.homeGoals;
  home.goalsAgainst += goals.awayGoals;
  away.goalsFor += goals.awayGoals;
  away.goalsAgainst += goals.homeGoals;

  if (goals.homeGoals > goals.awayGoals) home.points += 3;
  else if (goals.homeGoals < goals.awayGoals) away.points += 3;
  else {
    home.points += 1;
    away.points += 1;
  }
}

/**
 * The shared standings math behind both src/devpanel/standings.ts
 * (synthetic 1-0/0-0 scorelines, keyed on a coarse win/draw/loss outcome)
 * and rankHistory.ts (real goals from football-data.org). Extracted
 * 2026-09-07 so real fixture data could reuse the exact same points/goal
 * difference/tie-break rules the dev panel already had, rather than a second
 * hand-written copy that could drift from it.
 *
 * `matchGoals[fixture.id]` missing or undefined means not yet played — that
 * fixture contributes nothing, same as devpanel's "notplayed" outcome.
 *
 * Tie-break order (points, then goal difference, then goals scored, then
 * team name) is unchanged from the original devpanel-only version.
 */
export function computeStandingsFromMatches(
  fixtures: StandingsFixture[],
  matchGoals: Record<string, MatchGoals | undefined>
): Record<string, TeamResult> {
  const acc = new Map<string, TeamAccumulator>();
  TEAMS.forEach((team) => acc.set(team.id, { points: 0, goalsFor: 0, goalsAgainst: 0, matchesPlayed: 0 }));

  fixtures.forEach((fixture) => {
    applyMatch(acc, fixture.homeTeamId, fixture.awayTeamId, matchGoals[fixture.id]);
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
      matchesPlayed: stats.matchesPlayed,
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
      matchesPlayed: team.matchesPlayed,
    };
  });
  return results;
}
