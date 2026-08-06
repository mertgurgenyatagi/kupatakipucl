import { Frame, FrameBody } from "@/components/ui/frame";
import { MobileStandingsPair } from "./MobileStandingsPair";
import { LeagueTableList } from "../leaderboard/LeagueTableList";
import { MobileKnockoutBracket } from "../knockout/MobileKnockoutBracket";
import { useMobilePopups } from "../shell/MobilePopupHost";
import type { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import type { TeamResult } from "../leaderboard/teamResultTypes";
import type { TournamentPhase } from "../tournament/tournamentPhase";
import type { Player } from "../profile/usePlayers";

/**
 * Puan Durumu on a phone: the participant standings, and beneath them
 * whichever view of the competition the current phase calls for — the league
 * table during the league phase, the bracket once the knockout starts.
 *
 * This is the same pair as the logged-out started Home, which is exactly what
 * the wireframe says it should be ("same stuff as out-leaguephase"). Desktop
 * keeps them apart because it has three columns to fill and can afford a hero
 * carousel between them; mobile has one column and no room for decoration, so
 * the two screens legitimately converge. The difference that remains is the
 * one that matters — you have to be signed in to reach this route, so your own
 * row is highlighted.
 *
 * Dropped from desktop: the hero carousel, the full 36-team `TeamTable` (the
 * league table list carries the same standings in a phone-shaped row), and
 * the upcoming-fixtures drawer.
 */
export function MobileLeaderboardPage({
  entries,
  players,
  results,
  phase,
  myUid,
}: {
  entries: LeaderboardEntry[];
  players: Player[];
  results: Record<string, TeamResult>;
  phase: TournamentPhase;
  myUid?: string;
}) {
  const { openTeam, openParticipant } = useMobilePopups();
  // preknockout still shows the league table: the league phase's final
  // standings are the thing that decided the bracket, and the bracket itself
  // has no results in it yet. Only `knockout` swaps.
  const showBracket = phase === "knockout";

  return (
    <MobileStandingsPair
      entries={entries}
      players={players}
      myUid={myUid}
      tournamentStarted
      onSelectParticipant={openParticipant}
      bottomBias={showBracket}
    >
      {showBracket ? (
        <Frame className="flex min-h-0 flex-1 flex-col animate-cotton-rise border-color_border1/35">
          <FrameBody className="min-h-0 flex-1 p-2">
            <MobileKnockoutBracket readOnly onSelectTeam={openTeam} />
          </FrameBody>
        </Frame>
      ) : (
        <LeagueTableList results={results} onSelectTeam={openTeam} />
      )}
    </MobileStandingsPair>
  );
}
