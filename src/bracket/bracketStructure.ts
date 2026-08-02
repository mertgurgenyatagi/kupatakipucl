export type Round = "ro16" | "qf" | "sf" | "final";

export type MatchupId =
  | "ro16-1" | "ro16-2" | "ro16-3" | "ro16-4"
  | "ro16-5" | "ro16-6" | "ro16-7" | "ro16-8"
  | "qf-1" | "qf-2" | "qf-3" | "qf-4"
  | "sf-1" | "sf-2"
  | "final";

export interface MatchupDef {
  id: MatchupId;
  round: Round;
  feedsInto: MatchupId | null;
}

export const ROUND_ORDER: readonly Round[] = ["ro16", "qf", "sf", "final"];

export const BRACKET_MATCHUPS: readonly MatchupDef[] = [
  { id: "ro16-1", round: "ro16", feedsInto: "qf-1" },
  { id: "ro16-2", round: "ro16", feedsInto: "qf-1" },
  { id: "ro16-3", round: "ro16", feedsInto: "qf-2" },
  { id: "ro16-4", round: "ro16", feedsInto: "qf-2" },
  { id: "ro16-5", round: "ro16", feedsInto: "qf-3" },
  { id: "ro16-6", round: "ro16", feedsInto: "qf-3" },
  { id: "ro16-7", round: "ro16", feedsInto: "qf-4" },
  { id: "ro16-8", round: "ro16", feedsInto: "qf-4" },
  { id: "qf-1", round: "qf", feedsInto: "sf-1" },
  { id: "qf-2", round: "qf", feedsInto: "sf-1" },
  { id: "qf-3", round: "qf", feedsInto: "sf-2" },
  { id: "qf-4", round: "qf", feedsInto: "sf-2" },
  { id: "sf-1", round: "sf", feedsInto: "final" },
  { id: "sf-2", round: "sf", feedsInto: "final" },
  { id: "final", round: "final", feedsInto: null },
];

const MATCHUP_BY_ID: ReadonlyMap<MatchupId, MatchupDef> = new Map(
  BRACKET_MATCHUPS.map((matchup) => [matchup.id, matchup])
);

export function matchupById(id: MatchupId): MatchupDef {
  const matchup = MATCHUP_BY_ID.get(id);
  if (!matchup) throw new Error(`Unknown matchup id: ${id}`);
  return matchup;
}

export function matchupsForRound(round: Round): MatchupDef[] {
  return BRACKET_MATCHUPS.filter((matchup) => matchup.round === round);
}

export function childrenOf(id: MatchupId): [MatchupId, MatchupId] | null {
  const children = BRACKET_MATCHUPS.filter((matchup) => matchup.feedsInto === id).map((matchup) => matchup.id);
  if (children.length === 0) return null;
  return [children[0], children[1]];
}

export function nextRound(round: Round): Round | null {
  const index = ROUND_ORDER.indexOf(round);
  return index === ROUND_ORDER.length - 1 ? null : ROUND_ORDER[index + 1];
}

export function previousRound(round: Round): Round | null {
  const index = ROUND_ORDER.indexOf(round);
  return index <= 0 ? null : ROUND_ORDER[index - 1];
}
