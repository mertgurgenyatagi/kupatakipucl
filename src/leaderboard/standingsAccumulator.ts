import { TEAMS } from "../predictions/teams";
import { TeamResult } from "./teamResultTypes";

export interface MatchGoals {
  homeGoals: number;
  awayGoals: number;
}

export interface StandingsFixture {
  id: string;
  matchday: number;
  homeTeamId: string;
  awayTeamId: string;
}

interface TeamAccumulator {
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  matchesPlayed: number;
  awayGoalsFor: number;
  wins: number;
  awayWins: number;
}

const FINAL_MATCHDAY = 8;

function emptyAccumulator(): TeamAccumulator {
  return { points: 0, goalsFor: 0, goalsAgainst: 0, matchesPlayed: 0, awayGoalsFor: 0, wins: 0, awayWins: 0 };
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
  away.awayGoalsFor += goals.awayGoals;

  if (goals.homeGoals > goals.awayGoals) {
    home.points += 3;
    home.wins += 1;
  } else if (goals.homeGoals < goals.awayGoals) {
    away.points += 3;
    away.wins += 1;
    away.awayWins += 1;
  } else {
    home.points += 1;
    away.points += 1;
  }
}

function goalDifference(acc: TeamAccumulator): number {
  return acc.goalsFor - acc.goalsAgainst;
}

/**
 * The shared standings math behind both src/devpanel/standings.ts
 * (synthetic 1-0/0-0 scorelines, keyed on a coarse win/draw/loss outcome)
 * and rankHistory.ts (real goals from football-data.org). Extracted
 * 2026-09-07 so real fixture data could reuse the exact same points/tie-break
 * rules the dev panel already had, rather than a second hand-written copy
 * that could drift from it.
 *
 * 2026-09-08: rewritten to implement UEFA's actual Champions League
 * league-phase tiebreak order — the same algorithm functions/fixtures'
 * standings.js applies to the real results/{teamId} documents, kept in sync
 * by hand since src/ and functions/ don't share a module boundary. See that
 * file's own comment for the full rule citation; this is a straight port.
 *
 * `matchGoals[fixture.id]` missing or undefined means not yet played — that
 * fixture contributes nothing, same as devpanel's "notplayed" outcome.
 *
 * `optaRanking` is `opta-analyst`'s own predictions/{uid} ranking array
 * (best to worst) — used to order a still-tied opening table instead of
 * alphabetical, and as the final tiebreak once Matchday 8 completes in place
 * of the disciplinary-points/coefficient criteria this app can't compute.
 * Unlike standings.js's server-side twin, this does NOT throw when
 * `optaRanking` doesn't cover every team — a client render can catch that
 * array mid-load (empty, or briefly stale) and simply falls back to
 * alphabetical for any team that's missing, rather than crashing the popup
 * it's rendering inside.
 */
export function computeStandingsFromMatches(
  fixtures: StandingsFixture[],
  matchGoals: Record<string, MatchGoals | undefined>,
  optaRanking: string[] = []
): Record<string, TeamResult> {
  const acc = new Map<string, TeamAccumulator>();
  TEAMS.forEach((team) => acc.set(team.id, emptyAccumulator()));

  fixtures.forEach((fixture) => {
    applyMatch(acc, fixture.homeTeamId, fixture.awayTeamId, matchGoals[fixture.id]);
  });

  const optaRank = new Map(optaRanking.map((teamId, index) => [teamId, index]));

  const matchday8 = fixtures.filter((f) => f.matchday === FINAL_MATCHDAY);
  const phaseComplete = matchday8.length > 0 && matchday8.every((f) => matchGoals[f.id] !== undefined);

  const opponentStats = new Map<string, { points: number; goalDifference: number; goalsFor: number }>();
  if (phaseComplete) {
    TEAMS.forEach((team) => opponentStats.set(team.id, { points: 0, goalDifference: 0, goalsFor: 0 }));
    fixtures.forEach((fixture) => {
      if (matchGoals[fixture.id] === undefined) return;
      const home = acc.get(fixture.homeTeamId)!;
      const away = acc.get(fixture.awayTeamId)!;
      const homeOpp = opponentStats.get(fixture.homeTeamId)!;
      const awayOpp = opponentStats.get(fixture.awayTeamId)!;
      homeOpp.points += away.points;
      homeOpp.goalDifference += goalDifference(away);
      homeOpp.goalsFor += away.goalsFor;
      awayOpp.points += home.points;
      awayOpp.goalDifference += goalDifference(home);
      awayOpp.goalsFor += home.goalsFor;
    });
  }

  const ranked = TEAMS.map((team) => {
    const stats = acc.get(team.id)!;
    return { teamId: team.id, teamName: team.name, stats };
  }).sort((a, b) => {
    if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
    const gdA = goalDifference(a.stats);
    const gdB = goalDifference(b.stats);
    if (gdB !== gdA) return gdB - gdA;
    if (b.stats.goalsFor !== a.stats.goalsFor) return b.stats.goalsFor - a.stats.goalsFor;
    if (b.stats.awayGoalsFor !== a.stats.awayGoalsFor) return b.stats.awayGoalsFor - a.stats.awayGoalsFor;
    if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
    if (b.stats.awayWins !== a.stats.awayWins) return b.stats.awayWins - a.stats.awayWins;

    if (phaseComplete) {
      const oa = opponentStats.get(a.teamId)!;
      const ob = opponentStats.get(b.teamId)!;
      if (ob.points !== oa.points) return ob.points - oa.points;
      if (ob.goalDifference !== oa.goalDifference) return ob.goalDifference - oa.goalDifference;
      if (ob.goalsFor !== oa.goalsFor) return ob.goalsFor - oa.goalsFor;
      const rankA = optaRank.get(a.teamId);
      const rankB = optaRank.get(b.teamId);
      if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
      return a.teamName.localeCompare(b.teamName);
    }

    if (a.stats.matchesPlayed === 0 && b.stats.matchesPlayed === 0) {
      const rankA = optaRank.get(a.teamId);
      const rankB = optaRank.get(b.teamId);
      if (rankA !== undefined && rankB !== undefined) return rankA - rankB;
    }
    return a.teamName.localeCompare(b.teamName);
  });

  const results: Record<string, TeamResult> = {};
  ranked.forEach((team, index) => {
    results[team.teamId] = {
      position: index + 1,
      points: team.stats.points,
      goalDifference: goalDifference(team.stats),
      goalsFor: team.stats.goalsFor,
      goalsAgainst: team.stats.goalsAgainst,
      matchesPlayed: team.stats.matchesPlayed,
    };
  });
  return results;
}
