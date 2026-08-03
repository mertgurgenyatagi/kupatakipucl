// src/pages/HomePage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { useResults } from "../leaderboard/useResults";
import { usePlayers } from "../profile/usePlayers";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { HomeLandingLoggedOut } from "../home/HomeLandingLoggedOut";
import { LoggedInHome } from "../home/LoggedInHome";
import { HomeLandingLoggedOutStarted } from "../home/HomeLandingLoggedOutStarted";
import { LoggedInHomeStarted } from "../home/LoggedInHomeStarted";

export function HomePage() {
  const state = useVisibilityState();
  const phase = useTournamentPhase();

  const { results, loading: resultsLoading } = useResults();
  const { players, loading: playersLoading } = usePlayers();
  const { entries, loading: leaderboardLoading } = useLeaderboard();

  if (resultsLoading || playersLoading || leaderboardLoading) return null;

  // Every VisibilityState has its own dedicated landing composition — see
  // onboarding/PAGE_BRIEFING.txt's "HOME - not logged in, not started" and
  // "HOME - logged in, not started" sections, plus PAGEMAP_SPEC.md §3.
  if (state === "loggedout_notstarted") {
    return <HomeLandingLoggedOut players={players} />;
  }
  if (state === "loggedin_notstarted") {
    return <LoggedInHome players={players} />;
  }
  // loggedout_leaguephase's composition is reused as-is for preknockout/
  // knockout too (2026-08-03, "populate the pages" pass — not a considered
  // design decision for those two phases yet, just filling the placeholder
  // in ahead of a proper pass later), same treatment as the logged-in branch
  // below.
  if (state === "loggedout_leaguephase" || state === "loggedout_preknockout" || state === "loggedout_knockout") {
    return <HomeLandingLoggedOutStarted results={results} players={players} entries={entries} phase={phase} />;
  }
  // loggedin_leaguephase's composition is reused as-is for preknockout/
  // knockout too (2026-08-03, "populate the pages" pass — not a considered
  // design decision for those two phases yet, just filling the placeholder
  // in ahead of a proper pass later).
  if (state === "loggedin_leaguephase" || state === "loggedin_preknockout" || state === "loggedin_knockout") {
    return <LoggedInHomeStarted results={results} players={players} entries={entries} phase={phase} />;
  }

  return null;
}
