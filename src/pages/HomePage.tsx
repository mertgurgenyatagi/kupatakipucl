// src/pages/HomePage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { VisibilityState } from "../state/visibilityState";
import { useResults } from "../leaderboard/useResults";
import { usePlayers } from "../profile/usePlayers";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { TeamTable } from "../leaderboard/TeamTable";
import { PlayerList } from "../leaderboard/PlayerList";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";

const BLURB: Record<VisibilityState, string> = {
  NST_NLI: "[Placeholder] Not started, not logged in: mission blurb + sign-up countdown go here.",
  NST_LI: "[Placeholder] Not started, logged in: prediction submission countdown + rules go here.",
  ST_NLI: "[Placeholder] Started, not logged in: mission blurb + sign-up-closed notice + match days remaining go here.",
  ST_LI: "[Placeholder] Started, logged in: same as above, plus chat access.",
};

export function HomePage() {
  const state = useVisibilityState();
  const started = state === "ST_NLI" || state === "ST_LI";
  const loggedIn = state === "NST_LI" || state === "ST_LI";

  const { results, loading: resultsLoading } = useResults();
  const { players, loading: playersLoading } = usePlayers();
  const { entries, loading: leaderboardLoading } = useLeaderboard();

  if (resultsLoading || playersLoading || leaderboardLoading) return null;

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
