// src/pages/HomePage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { VisibilityState } from "../state/visibilityState";
import { useResults } from "../leaderboard/useResults";
import { usePlayers } from "../profile/usePlayers";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { TeamTable } from "../leaderboard/TeamTable";
import { PlayerList } from "../leaderboard/PlayerList";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";
import { HomeLandingLoggedOut } from "../home/HomeLandingLoggedOut";

// No wording distinction yet between league phase / pre-knockout / knockout
// (see onboarding/pagemap-questionnaires/pagemap-round-01.md, Q9 — still
// open) — all three started phases share the same blurb per login state.
// loggedout_notstarted no longer reads this — see the early return below.
const NOTSTARTED_LOGGEDOUT_BLURB =
  "[Placeholder] Not started, not logged in: mission blurb + sign-up countdown go here.";
const NOTSTARTED_LOGGEDIN_BLURB =
  "[Placeholder] Not started, logged in: prediction submission countdown + rules go here.";
const STARTED_LOGGEDOUT_BLURB =
  "[Placeholder] Started, not logged in: mission blurb + sign-up-closed notice + match days remaining go here.";
const STARTED_LOGGEDIN_BLURB = "[Placeholder] Started, logged in: same as above, plus chat access.";

const BLURB: Record<VisibilityState, string> = {
  loggedout_notstarted: NOTSTARTED_LOGGEDOUT_BLURB,
  loggedin_notstarted: NOTSTARTED_LOGGEDIN_BLURB,
  loggedout_leaguephase: STARTED_LOGGEDOUT_BLURB,
  loggedin_leaguephase: STARTED_LOGGEDIN_BLURB,
  loggedout_preknockout: STARTED_LOGGEDOUT_BLURB,
  loggedin_preknockout: STARTED_LOGGEDIN_BLURB,
  loggedout_knockout: STARTED_LOGGEDOUT_BLURB,
  loggedin_knockout: STARTED_LOGGEDIN_BLURB,
};

export function HomePage() {
  const state = useVisibilityState();
  const started = !state.endsWith("_notstarted");
  const loggedIn = state.startsWith("loggedin_");

  const { results, loading: resultsLoading } = useResults();
  const { players, loading: playersLoading } = usePlayers();
  const { entries, loading: leaderboardLoading } = useLeaderboard();

  if (resultsLoading || playersLoading || leaderboardLoading) return null;

  // The one state with its own dedicated landing composition — see
  // onboarding/PAGE_BRIEFING.txt's "HOME - not logged in, not started"
  // section and src/home/HomeLandingLoggedOut.tsx's own header comment.
  // Every other state keeps the shared skeleton below untouched.
  if (state === "loggedout_notstarted") {
    return <HomeLandingLoggedOut players={players} results={results} />;
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
      {started && <LeaderboardTable entries={entries} />}
    </div>
  );
}
