import { ReactNode } from "react";
import { LeaderboardTable } from "../leaderboard/LeaderboardTable";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";
import type { Player } from "../profile/usePlayers";

/**
 * Two frames, stacked, each scrolling inside itself, together filling exactly
 * one screenful — the shape the wireframe uses for every started-phase
 * standings screen there is:
 *
 *   Home  · loggedout_leaguephase / preknockout / knockout
 *   Puan Durumu · loggedin_leaguephase / preknockout / knockout
 *
 * The top half is always the participant standings. The bottom half is the
 * league table during the league phase and the bracket once the knockout
 * starts, which is why it's a slot rather than baked in.
 *
 * The page deliberately does not scroll: two scroll regions inside a third
 * scrolling document is the thing that makes a phone page feel broken. Each
 * frame owns its own overflow and the pair is height-bounded by the shell.
 */
export function MobileStandingsPair({
  entries,
  players,
  myUid,
  tournamentStarted,
  onSelectParticipant,
  children,
  /** The bottom half runs slightly taller than the top when it's the
   *  bracket — matching the wireframe, where the knockout screen gives the
   *  bracket 8 of its 15 content rows and the league screen splits evenly. */
  bottomBias = false,
}: {
  entries: LeaderboardEntry[];
  players: Player[];
  myUid?: string;
  tournamentStarted: boolean;
  onSelectParticipant: (uid: string) => void;
  children: ReactNode;
  bottomBias?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3">
      <div className="flex min-h-0 flex-1 flex-col">
        <LeaderboardTable
          entries={entries}
          players={players}
          myUid={myUid}
          revealCorrectness={tournamentStarted}
          onSelectEntry={onSelectParticipant}
          // No onHoverEntry: the desktop pairing highlights a participant's
          // correct picks on the team table alongside on hover, and there is
          // no hover on a phone and no team table beside it to highlight.
        />
      </div>
      <div className={bottomBias ? "flex min-h-0 flex-[1.3] flex-col" : "flex min-h-0 flex-1 flex-col"}>
        {children}
      </div>
    </div>
  );
}
