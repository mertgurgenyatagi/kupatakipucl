import { TournamentPhase } from "../tournament/tournamentPhase";

export type VisibilityState = "NST_NLI" | "NST_LI" | "ST_NLI" | "ST_LI";

export function getVisibilityState(
  isLoggedIn: boolean,
  phase: TournamentPhase
): VisibilityState {
  if (phase === "pre") {
    return isLoggedIn ? "NST_LI" : "NST_NLI";
  }
  return isLoggedIn ? "ST_LI" : "ST_NLI";
}
