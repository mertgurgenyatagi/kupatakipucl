import { Frame, FrameBody } from "@/components/ui/frame";
import { MobileStandingsPair } from "../../mobile/MobileStandingsPair";
import { LeagueTableList } from "../../leaderboard/LeagueTableList";
import { MobileKnockoutBracket } from "../../knockout/MobileKnockoutBracket";
import { useMobilePopups } from "../../shell/MobilePopupHost";
import type { LeaderboardEntry } from "../../leaderboard/leaderboardTypes";
import type { TeamResult } from "../../leaderboard/teamResultTypes";
import type { TournamentPhase } from "../../tournament/tournamentPhase";
import type { Player } from "../../profile/usePlayers";

/**
 * Home — logged out, tournament running. Who's winning, above what's
 * happening in the competition itself.
 *
 * The wireframe gives this screen exactly two frames, and they are the two
 * that answer the only questions a signed-out visitor can act on: is my
 * friend beating me, and how is the actual football going. Everything the
 * desktop version carries alongside them — the hero carousel, the upcoming
 * fixtures widget, the forum preview — is dropped.
 *
 * League and pre-knockout phases show the league table underneath; the
 * knockout phase swaps it for the bracket, per the wireframe's own
 * `loggedout_knockout` cell.
 */
export function MobileHomeStartedLoggedOut({
  players,
  entries,
  results,
  phase,
}: {
  players: Player[];
  entries: LeaderboardEntry[];
  results: Record<string, TeamResult>;
  phase: TournamentPhase;
}) {
  const { openTeam, openParticipant } = useMobilePopups();
  const isKnockout = phase === "knockout";

  return (
    <MobileStandingsPair
      entries={entries}
      players={players}
      tournamentStarted
      onSelectParticipant={openParticipant}
      bottomBias={isKnockout}
    >
      {isKnockout ? (
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
