import { useAuth } from "../auth/AuthProvider";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { getVisibilityState, VisibilityState } from "../state/visibilityState";

const PLACEHOLDER_COPY: Record<VisibilityState, string> = {
  NST_NLI: "[Placeholder] Not started, not logged in: mission blurb + sign-up countdown go here.",
  NST_LI: "[Placeholder] Not started, logged in: prediction submission countdown + rules go here.",
  ST_NLI: "[Placeholder] Started, not logged in: live rankings + stats go here.",
  ST_LI: "[Placeholder] Started, logged in: full dashboard goes here.",
};

export function HomePage() {
  const { user } = useAuth();
  const phase = useTournamentPhase();
  const state = getVisibilityState(Boolean(user), phase);
  return <p>{PLACEHOLDER_COPY[state]}</p>;
}
