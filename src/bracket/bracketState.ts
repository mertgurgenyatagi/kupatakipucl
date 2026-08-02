import { MatchupId, Round, ROUND_ORDER, matchupById, childrenOf } from "./bracketStructure";

export interface BracketState {
  ro16Teams: Partial<Record<MatchupId, [string, string]>>;
  winners: Partial<Record<MatchupId, string>>;
}

export type Stage = "qf" | "sf" | "final" | "champion";

const STAGE_FOR_ROUND: Record<Round, Stage> = {
  ro16: "qf",
  qf: "sf",
  sf: "final",
  final: "champion",
};

export function teamsInMatchup(matchupId: MatchupId, state: BracketState): [string | null, string | null] {
  const matchup = matchupById(matchupId);
  if (matchup.round === "ro16") {
    const teams = state.ro16Teams[matchupId];
    return teams ? [teams[0], teams[1]] : [null, null];
  }
  const children = childrenOf(matchupId);
  if (!children) return [null, null];
  const [childA, childB] = children;
  return [state.winners[childA] ?? null, state.winners[childB] ?? null];
}

/**
 * The furthest stage a team has actually reached, per GREAT_LEAP_SPEC.md
 * §5.3's stage table — winning an ro16/qf/sf/final matchup means the team
 * *reached* qf/sf/final/champion respectively. null if they haven't won
 * any real matchup yet.
 */
export function stageReached(teamId: string, state: BracketState): Stage | null {
  let furthestRoundIndex = -1;
  for (const [matchupId, winnerId] of Object.entries(state.winners)) {
    if (winnerId !== teamId) continue;
    const round = matchupById(matchupId as MatchupId).round;
    furthestRoundIndex = Math.max(furthestRoundIndex, ROUND_ORDER.indexOf(round));
  }
  if (furthestRoundIndex === -1) return null;
  return STAGE_FOR_ROUND[ROUND_ORDER[furthestRoundIndex]];
}
