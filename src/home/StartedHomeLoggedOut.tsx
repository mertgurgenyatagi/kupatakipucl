import { useCallback, useState } from "react";
import { TeamTable } from "../leaderboard/TeamTable";
import { LeaderboardHero } from "../leaderboard/LeaderboardHero";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { assignRanks } from "../leaderboard/ranking";
import { BracketWidget } from "../bracket/BracketWidget";
import { deriveCurrentRound } from "../bracket/deriveCurrentRound";
import { BracketState } from "../bracket/bracketState";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import { TeamResult } from "../leaderboard/teamResultTypes";
import { TournamentPhase } from "../tournament/tournamentPhase";
import type { RankedEntry } from "../leaderboard/ranking";

const PAGE_SHELL =
  "relative mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 p-4 sm:p-6 lg:h-full lg:min-h-0 lg:flex-1 lg:gap-5 lg:p-6";
const MAIN_ROW =
  "relative z-10 grid min-w-0 gap-4 lg:h-full lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(540px,1.3fr)_300px_minmax(340px,1fr)] lg:gap-5 [&>*]:min-h-0 [&>*]:min-w-0";

/**
 * GREAT_LEAP_SPEC.md §3: "almost a copy of the logged-in league leaderboard
 * page" for loggedout_leaguephase / preknockout / knockout — same TeamTable
 * + LeaderboardHero + LeaderboardTable composition as LeaderboardPage.tsx,
 * but with the same knockout league-table-to-bracket-widget swap §2.4 gives
 * the signed-in six-widget grid (§3's "a signed-out visitor can see the
 * bracket too"). A standalone component rather than sharing code with
 * LeaderboardPage.tsx — see this plan's Global Constraints for why the real
 * /leaderboard route must never show the bracket.
 */
export function StartedHomeLoggedOut({
  results,
  entries,
  phase,
  bracketState,
}: {
  results: Record<string, TeamResult>;
  entries: LeaderboardEntry[];
  phase: TournamentPhase;
  bracketState: BracketState;
}) {
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const handlePopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedUid(null);
  }, []);
  const handleTeamPopupOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedTeamId(null);
  }, []);
  const handleSelectParticipant = useCallback((uid: string) => {
    setSelectedUid(uid);
    setSelectedTeamId(null);
  }, []);
  const handleSelectTeam = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedUid(null);
  }, []);

  const rankedEntries = assignRanks(entries);
  const selectedRanked: RankedEntry | null = rankedEntries.find((r) => r.entry.uid === selectedUid) ?? null;
  const currentRound = deriveCurrentRound(bracketState);

  return (
    <div className={PAGE_SHELL}>
      <div className={MAIN_ROW}>
        {phase === "knockout" ? (
          <div className="min-h-0 lg:h-full">
            <BracketWidget bracketState={bracketState} currentRound={currentRound} onSelectTeam={handleSelectTeam} />
          </div>
        ) : (
          <TeamTable results={results} onSelectTeam={handleSelectTeam} />
        )}
        <LeaderboardHero results={results} />
        {/* revealCorrectness gates more than the hover highlight — confirmed
            at LeaderboardTable.tsx:90/97, it also gates whether row clicks
            fire onSelectEntry at all. This composition only ever renders for
            started phases, so it's unconditionally true here (matching
            LeaderboardPage.tsx's own `phase !== "notstarted"`, which is
            always true in this context too) rather than false — false would
            silently make every row unclickable. */}
        <LeaderboardTable entries={entries} revealCorrectness={true} onSelectEntry={handleSelectParticipant} />
      </div>
      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        results={results}
        onOpenChange={handlePopupOpenChange}
        onSelectTeam={handleSelectTeam}
        tournamentStarted={true}
      />
      <TeamPopup
        teamId={selectedTeamId}
        entries={entries}
        results={results}
        onOpenChange={handleTeamPopupOpenChange}
        onSelectParticipant={handleSelectParticipant}
        onSelectTeam={handleSelectTeam}
        tournamentStarted={true}
      />
    </div>
  );
}
