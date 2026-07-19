import { useAuth } from "../auth/AuthProvider";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { getVisibilityState, VisibilityState } from "./visibilityState";

export function useVisibilityState(): VisibilityState {
  const { user } = useAuth();
  const phase = useTournamentPhase();
  return getVisibilityState(Boolean(user), phase);
}
