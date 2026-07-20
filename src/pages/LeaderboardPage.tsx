// src/pages/LeaderboardPage.tsx
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";

export function LeaderboardPage() {
  const { entries, loading } = useLeaderboard();
  if (loading) return null;
  return <LeaderboardTable entries={entries} />;
}
