import { MatchupId, BRACKET_MATCHUPS, matchupById, childrenOf } from "./bracketStructure";

type PicksMap = Partial<Record<MatchupId, string>>;
type Ro16TeamsMap = Partial<Record<MatchupId, [string, string]>>;

/**
 * Same shape as bracketState.ts's teamsInMatchup, but derives deeper rounds
 * from the user's in-progress picks instead of real bracketState winners —
 * this is what the submission UI needs while the bracket is still open.
 */
export function teamsInMatchupForPicks(
  matchupId: MatchupId,
  ro16Teams: Ro16TeamsMap,
  picks: PicksMap
): [string | null, string | null] {
  const matchup = matchupById(matchupId);
  if (matchup.round === "ro16") {
    const teams = ro16Teams[matchupId];
    return teams ? [teams[0], teams[1]] : [null, null];
  }
  const children = childrenOf(matchupId);
  if (!children) return [null, null];
  const [childA, childB] = children;
  return [picks[childA] ?? null, picks[childB] ?? null];
}

function feedsInto(matchupId: MatchupId): MatchupId | null {
  return matchupById(matchupId).feedsInto;
}

/**
 * Pure, immutable. Setting a pick invalidates any downstream pick that was
 * derived from the old value, so this walks the feedsInto chain clearing
 * every matchup from here to the Final. This is what keeps `picks` always
 * internally self-consistent, which bracketScoring.ts's flat comparison
 * relies on.
 */
export function pickWinner(picks: PicksMap, matchupId: MatchupId, teamId: string): PicksMap {
  const next: PicksMap = { ...picks, [matchupId]: teamId };
  let cursor = feedsInto(matchupId);
  while (cursor) {
    delete next[cursor];
    cursor = feedsInto(cursor);
  }
  return next;
}

export function isSubmissionComplete(picks: PicksMap): boolean {
  return BRACKET_MATCHUPS.every((matchup) => picks[matchup.id] !== undefined);
}
