import { FIXTURES } from "./fixtures";
import { TeamResult } from "../leaderboard/teamResultTypes";
import { computeStandingsFromMatches, MatchGoals } from "../leaderboard/standingsAccumulator";

export type MatchOutcome = "notplayed" | "homewin" | "draw" | "awaywin";

// Synthetic scorelines (Mert's explicit choice over real historical scores):
// any win is 1-0, any draw is 0-0. Goal difference exists purely so the
// team table's sortable columns have something meaningful to show, not to
// mirror reality.
function outcomeToGoals(outcome: MatchOutcome): MatchGoals | undefined {
  if (outcome === "notplayed") return undefined;
  if (outcome === "homewin") return { homeGoals: 1, awayGoals: 0 };
  if (outcome === "awaywin") return { homeGoals: 0, awayGoals: 1 };
  return { homeGoals: 0, awayGoals: 0 }; // draw
}

/**
 * Dev-panel-only: turns the mock calendar's coarse win/draw/loss outcomes
 * into standings via the shared computeStandingsFromMatches
 * (standingsAccumulator.ts) — extracted 2026-09-07 so this and the real
 * football-data.org-backed path (rankHistory.ts) share one points/tie-break
 * implementation instead of two that could drift apart. Behavior is
 * unchanged from before the extraction; standings.test.ts still asserts it
 * directly.
 */
export function computeStandings(outcomes: Record<string, MatchOutcome>): Record<string, TeamResult> {
  const matchGoals: Record<string, MatchGoals | undefined> = {};
  FIXTURES.forEach((fixture) => {
    matchGoals[fixture.id] = outcomeToGoals(outcomes[fixture.id] ?? "notplayed");
  });
  return computeStandingsFromMatches(FIXTURES, matchGoals);
}
