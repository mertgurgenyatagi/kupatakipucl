import { useResults } from "../leaderboard/useResults";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { useBracketState } from "../bracket/useBracketState";
import { StartedHomeLoggedOut } from "../home/StartedHomeLoggedOut";

/**
 * GREAT_LEAP_SPEC.md §4: shown instead of SignupFlow for a genuinely new
 * (never-onboarded) account once the tournament has started. Self-contained
 * — fetches its own data rather than relying on HashRouter/HomePage — so
 * this stays the only new surface this feature touches; no other existing
 * page needs to be made defensive against an authenticated user with no
 * profile. Embeds the exact spectator composition a signed-out visitor sees.
 */
export function RegistrationClosedScreen() {
  const { results, loading: resultsLoading } = useResults();
  const { entries, loading: leaderboardLoading } = useLeaderboard();
  const { bracketState, loading: bracketLoading } = useBracketState();
  const { phase } = useTournamentPhase();

  if (resultsLoading || leaderboardLoading || bracketLoading) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <p
        role="status"
        className="shrink-0 px-5 py-3 text-center font-display text-sm text-color_textsecondary sm:text-base"
      >
        Kayıtlar kapandı — turnuva başladı. İzleyici olarak devam edebilirsin.
      </p>
      <div className="min-h-0 flex-1">
        <StartedHomeLoggedOut results={results} entries={entries} phase={phase} bracketState={bracketState} />
      </div>
    </div>
  );
}
