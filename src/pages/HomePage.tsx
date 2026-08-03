// src/pages/HomePage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { VisibilityState } from "../state/visibilityState";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { useResults } from "../leaderboard/useResults";
import { usePlayers } from "../profile/usePlayers";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { TeamTable } from "../leaderboard/TeamTable";
import { PlayerList } from "../leaderboard/PlayerList";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";
import { HomeLandingLoggedOut } from "../home/HomeLandingLoggedOut";
import { LoggedInHome } from "../home/LoggedInHome";
import { HomeLandingLoggedOutStarted } from "../home/HomeLandingLoggedOutStarted";
import { LoggedInHomeStarted } from "../home/LoggedInHomeStarted";

// No wording distinction yet between league phase / pre-knockout / knockout
// (see onboarding/pagemap-questionnaires/pagemap-round-01.md, Q9 — still
// open) — all three started phases share the same blurb per login state.
// loggedout_notstarted and loggedin_notstarted no longer read this — see the
// early returns below.
const STARTED_LOGGEDOUT_BLURB =
  "[Placeholder] Started, not logged in: mission blurb + sign-up-closed notice + match days remaining go here.";

const BLURB: Partial<Record<VisibilityState, string>> = {
  loggedout_preknockout: STARTED_LOGGEDOUT_BLURB,
  loggedout_knockout: STARTED_LOGGEDOUT_BLURB,
};

export function HomePage() {
  const state = useVisibilityState();
  const phase = useTournamentPhase();
  const started = !state.endsWith("_notstarted");
  const loggedIn = state.startsWith("loggedin_");

  const { results, loading: resultsLoading } = useResults();
  const { players, loading: playersLoading } = usePlayers();
  const { entries, loading: leaderboardLoading } = useLeaderboard();

  if (resultsLoading || playersLoading || leaderboardLoading) return null;

  // The two states with their own dedicated landing compositions — see
  // onboarding/PAGE_BRIEFING.txt's "HOME - not logged in, not started" and
  // "HOME - logged in, not started" sections, plus PAGEMAP_SPEC.md §3.
  // Every other state keeps the shared skeleton below untouched.
  if (state === "loggedout_notstarted") {
    return <HomeLandingLoggedOut players={players} />;
  }
  if (state === "loggedin_notstarted") {
    return <LoggedInHome players={players} />;
  }
  if (state === "loggedout_leaguephase") {
    return <HomeLandingLoggedOutStarted results={results} players={players} entries={entries} />;
  }
  // loggedin_leaguephase's composition is reused as-is for preknockout/
  // knockout too (2026-08-03, "populate the pages" pass — not a considered
  // design decision for those two phases yet, just filling the placeholder
  // in ahead of a proper pass later).
  if (state === "loggedin_leaguephase" || state === "loggedin_preknockout" || state === "loggedin_knockout") {
    return <LoggedInHomeStarted results={results} players={players} entries={entries} phase={phase} />;
  }

  return (
    <div>
      <p>{BLURB[state]}</p>
      <TeamTable results={results} />
      <PlayerList
        players={players}
        showFullNames={loggedIn}
        leaderboardEntries={started ? entries : undefined}
      />
      {started && <LeaderboardTable entries={entries} players={players} />}
    </div>
  );
}
