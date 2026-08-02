import { MatchupId, Round, BRACKET_MATCHUPS } from "../bracket/bracketStructure";
import { BracketState } from "../bracket/bracketState";

// GREAT_LEAP_SPEC.md §5.3 lists points by the STAGE a team reaches (QF=3,
// SF=4, Final=5, Champion=6). A team "reaches" a stage by WINNING the match
// immediately before it — winning an RO16 matchup is what gets a team into
// the QF, winning a QF matchup gets it into the SF, and so on. So this table
// is intentionally keyed one round earlier than the spec's stage names:
// a correct RO16-matchup pick earns the "reached QF" points, a correct
// QF-matchup pick earns the "reached SF" points, etc. Winning the Final
// matchup itself is simultaneously "reached Champion" — there is no
// separate champion-bonus step, BRACKET_POINTS.final covers it directly.
export const BRACKET_POINTS: Record<Round, number> = {
  ro16: 3,
  qf: 4,
  sf: 5,
  final: 6,
};

/**
 * Flat per-matchup comparison against the real winners, not a
 * stageReached()-style chain walk: the submission UI (bracketSubmission.ts)
 * guarantees `picks` is always internally self-consistent (picking a team
 * cascades to clear any now-invalid downstream picks), so comparing each
 * matchup in isolation already reproduces the spec's stacking behavior.
 */
export function computeBracketScore(
  picks: Record<MatchupId, string> | undefined,
  bracketState: BracketState
): number {
  if (!picks) return 0;

  let total = 0;
  for (const matchup of BRACKET_MATCHUPS) {
    const pickedTeam = picks[matchup.id];
    const actualWinner = bracketState.winners[matchup.id];
    if (!pickedTeam || !actualWinner || pickedTeam !== actualWinner) continue;
    total += BRACKET_POINTS[matchup.round];
  }

  return total;
}
