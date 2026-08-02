import { Round, ROUND_ORDER, matchupsForRound } from "./bracketStructure";
import { BracketState } from "./bracketState";

/**
 * GREAT_LEAP_SPEC.md §5.4: the "current live round" is the earliest round
 * that doesn't yet have every one of its matchups decided — matches the
 * worked examples directly (during RO16, not every RO16 matchup is decided
 * yet, so current=ro16; once all 8 are, current becomes qf; and so on).
 * Falls through to "final" once everything (including the Final itself) is
 * decided, since there's no round after it to advance to.
 */
export function deriveCurrentRound(bracketState: BracketState): Round {
  for (const round of ROUND_ORDER) {
    const allDecided = matchupsForRound(round).every((matchup) => bracketState.winners[matchup.id] !== undefined);
    if (!allDecided) return round;
  }
  return "final";
}
