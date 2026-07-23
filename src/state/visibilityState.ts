import { TournamentPhase } from "../tournament/tournamentPhase";

// Names match pagemap.xlsx's own column headers literally — no abbreviation
// scheme layered on top (the old NST_NLI/ST_LI style is exactly what this
// replaced; see onboarding/pagemap-questionnaires/pagemap-round-01.md).
export type VisibilityState =
  | "loggedout_notstarted"
  | "loggedin_notstarted"
  | "loggedout_leaguephase"
  | "loggedin_leaguephase"
  | "loggedout_preknockout"
  | "loggedin_preknockout"
  | "loggedout_knockout"
  | "loggedin_knockout";

export function getVisibilityState(isLoggedIn: boolean, phase: TournamentPhase): VisibilityState {
  return `${isLoggedIn ? "loggedin" : "loggedout"}_${phase}` as VisibilityState;
}
