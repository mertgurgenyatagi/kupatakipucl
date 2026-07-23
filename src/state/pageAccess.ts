import { VisibilityState, getVisibilityState } from "./visibilityState";
import { TournamentPhase, STARTED_PHASES } from "../tournament/tournamentPhase";

export type PageKey = "predictions" | "leaderboard" | "chat" | "forum" | "stats";

const ALL_PHASES: readonly TournamentPhase[] = ["notstarted", ...STARTED_PHASES];

function statesFor(phases: readonly TournamentPhase[], logins: readonly boolean[]): VisibilityState[] {
  return phases.flatMap((phase) => logins.map((isLoggedIn) => getVisibilityState(isLoggedIn, phase)));
}

// Rules below come from onboarding/pagemap-questionnaires/pagemap-round-01.md
// (round 1 answers): forum is logged-in-only in every phase now (previously
// open to logged-out visitors once started — Q3 explicitly closed that).
const PAGE_ACCESS: Record<PageKey, VisibilityState[]> = {
  predictions: statesFor(ALL_PHASES, [true]),
  leaderboard: statesFor(STARTED_PHASES, [true, false]),
  chat: statesFor(ALL_PHASES, [true]),
  forum: statesFor(ALL_PHASES, [true]),
  stats: statesFor(STARTED_PHASES, [true]),
};

export function isPageAllowed(page: PageKey, state: VisibilityState): boolean {
  return PAGE_ACCESS[page].includes(state);
}
