import { MatchupId, BRACKET_MATCHUPS } from "./bracketStructure";
import { BracketPrediction } from "./bracketPredictionTypes";

export interface MatchupConsensus {
  matchupId: MatchupId;
  teamPercentages: Record<string, number>;
}

/**
 * Rhymes with computeAveragePositions (RankingList.tsx): aggregates every
 * submitted prediction into one derived per-matchup summary. Unlike league's
 * numeric average, bracket picks are categorical, so this reports each
 * picked team's share of submissions instead of a mean (GREAT_LEAP_SPEC.md
 * §5.5).
 */
export function computeBracketConsensus(predictions: BracketPrediction[]): MatchupConsensus[] {
  if (predictions.length === 0) return [];

  return BRACKET_MATCHUPS.map((matchup) => {
    const picksForMatchup = predictions
      .map((prediction) => prediction.picks[matchup.id])
      .filter((pick): pick is string => pick !== undefined);

    const counts: Record<string, number> = {};
    picksForMatchup.forEach((team) => {
      counts[team] = (counts[team] ?? 0) + 1;
    });

    const teamPercentages: Record<string, number> = {};
    const total = picksForMatchup.length;
    Object.entries(counts).forEach(([team, count]) => {
      teamPercentages[team] = Math.round((count / total) * 100);
    });

    return { matchupId: matchup.id, teamPercentages };
  });
}
