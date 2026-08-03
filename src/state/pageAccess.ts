import { VisibilityState, getVisibilityState } from "./visibilityState";
import { TournamentPhase, STARTED_PHASES } from "../tournament/tournamentPhase";

export type PageKey = "predictions" | "knockoutPredictions" | "leaderboard" | "forum" | "stats" | "profile";

const ALL_PHASES: readonly TournamentPhase[] = ["notstarted", ...STARTED_PHASES];

function statesFor(phases: readonly TournamentPhase[], logins: readonly boolean[]): VisibilityState[] {
  return phases.flatMap((phase) => logins.map((isLoggedIn) => getVisibilityState(isLoggedIn, phase)));
}

// Forum reopened to logged-out visitors 2026-08-02 for every started phase —
// see the name-privacy design spec for why this pairs with the
// profiles/publicProfiles split. Posting/replying/liking stay signed-in-only
// regardless (enforced both in the UI and, independently, by
// firestore.rules' forumPosts create/update rules).
const PAGE_ACCESS: Record<PageKey, VisibilityState[]> = {
  predictions: statesFor(ALL_PHASES, [true]),
  knockoutPredictions: statesFor(ALL_PHASES, [true]),
  leaderboard: statesFor(STARTED_PHASES, [true]),
  forum: [...statesFor(ALL_PHASES, [true]), ...statesFor(STARTED_PHASES, [false])],
  stats: statesFor(STARTED_PHASES, [true]),
  profile: statesFor(ALL_PHASES, [true]),
};

export function isPageAllowed(page: PageKey, state: VisibilityState): boolean {
  return PAGE_ACCESS[page].includes(state);
}
