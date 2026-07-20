// src/pages/StatsPage.tsx
import { useVisibilityState } from "../state/useVisibilityState";
import { isPageAllowed } from "../state/pageAccess";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { useResults } from "../leaderboard/useResults";
import { computeAccuracy } from "../stats/accuracy";
import { computeTeamBias } from "../stats/teamBias";
import { AccuracyTable } from "../stats/AccuracyTable";
import { TeamBiasTable } from "../stats/TeamBiasTable";

export function StatsPage() {
  const state = useVisibilityState();
  const { entries, loading: leaderboardLoading } = useLeaderboard();
  const { results, loading: resultsLoading } = useResults();

  if (!isPageAllowed("stats", state)) {
    return <p>This section isn't available right now.</p>;
  }

  if (leaderboardLoading || resultsLoading) return null;

  const accuracyEntries = computeAccuracy(entries, results);
  const teamBiases = computeTeamBias(
    entries.map((entry) => entry.ranking),
    results
  );

  return (
    <div>
      <AccuracyTable entries={accuracyEntries} />
      <TeamBiasTable teams={teamBiases} />
    </div>
  );
}
