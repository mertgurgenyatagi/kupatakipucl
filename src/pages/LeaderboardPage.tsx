// src/pages/LeaderboardPage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";

export function LeaderboardPage() {
  const state = useVisibilityState();
  const { entries, loading } = useLeaderboard();

  if (!isPageAllowed("leaderboard", state)) {
    return <p>This section isn't available right now.</p>;
  }

  if (loading) return null;
  return <LeaderboardTable entries={entries} />;
}
