import { useVisibilityState } from "../state/useVisibilityState";
import { useResults } from "../leaderboard/useResults";
import { usePlayers } from "../profile/usePlayers";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { useBracketState } from "../bracket/useBracketState";
import { HomeLandingLoggedOut } from "../home/HomeLandingLoggedOut";
import { LoggedInHome } from "../home/LoggedInHome";
import { StartedHomeLoggedOut } from "../home/StartedHomeLoggedOut";

export function HomePage() {
  const state = useVisibilityState();
  const { phase } = useTournamentPhase();
  const loggedIn = state.startsWith("loggedin_");

  const { results, loading: resultsLoading } = useResults();
  const { players, loading: playersLoading } = usePlayers();
  const { entries, loading: leaderboardLoading } = useLeaderboard();
  const { bracketState, loading: bracketLoading } = useBracketState();

  const needsBracketState = !loggedIn && phase !== "notstarted";
  if (resultsLoading || playersLoading || leaderboardLoading || (needsBracketState && bracketLoading)) {
    return null;
  }

  // LoggedInHome is the single data-wrapper for every logged-in state now
  // (not just loggedin_notstarted) — it branches internally between
  // HomeLandingLoggedIn and StartedHomeLoggedIn.
  if (loggedIn) {
    return <LoggedInHome players={players} results={results} entries={entries} />;
  }

  if (phase === "notstarted") {
    return <HomeLandingLoggedOut players={players} />;
  }

  // GREAT_LEAP_SPEC.md §3.
  return <StartedHomeLoggedOut results={results} entries={entries} phase={phase} bracketState={bracketState} />;
}
