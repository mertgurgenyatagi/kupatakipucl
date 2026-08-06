import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { usePlayers } from "../profile/usePlayers";
import { useResults } from "../leaderboard/useResults";
import { useLeaderboard } from "../leaderboard/useLeaderboard";
import { useTournamentPhase } from "../tournament/useTournamentPhase";
import { assignRanks } from "../leaderboard/ranking";
import { TeamPopup } from "../leaderboard/TeamPopup";
import { ParticipantPopup } from "../leaderboard/ParticipantPopup";
import { MatchupPopup } from "../leaderboard/MatchupPopup";

/**
 * One popup layer for the whole mobile app, mounted once in MobileShell.
 *
 * On desktop each page carries its own copy of this state machine —
 * LeaderboardPage, HomeLandingLoggedOutStarted and ProfilePage each declare
 * the same three `useState`s, the same six mutually-exclusive cross-link
 * callbacks, and the same `entries`/`players`/`results` triple. That is
 * tolerable there because a desktop page is a self-contained screen.
 *
 * Mobile breaks that assumption in a way that forces the issue: chat is a
 * shell-level drawer now, not a widget on Home, and tapping a message author
 * has to open the same participant dossier that the standings open. A drawer
 * that lives in the shell cannot reach into a page's popup state. Rather than
 * give the drawer a fourth private copy, the layer is hoisted once to the
 * shell and every mobile surface — pages and drawers alike — calls into it
 * through `useMobilePopups()`.
 *
 * The three popups stay mutually exclusive, exactly as they are on desktop:
 * they cross-link into each other (a team's predictor list opens a
 * participant; a participant's grid opens a team; a fixture opens either),
 * and stacking sheets isn't worth the backdrop/z-index mess.
 *
 * **The data hooks mount lazily** — on first open, not on first render. Two
 * of them (`useLeaderboard`, `useResults`) are live Firestore listeners, and
 * mounting them in the shell would make every mobile page pay for them,
 * including the ones with no popups at all (About, the logged-out landing,
 * Forum). Once opened they stay mounted, so reopening costs nothing.
 */

interface MobilePopupApi {
  openTeam: (teamId: string) => void;
  openParticipant: (uid: string) => void;
  openFixture: (fixtureId: string) => void;
}

/** No-op fallback: a component rendering on desktop (or in a test) has no
 *  host above it, and asking for popups there should do nothing rather than
 *  throw. Mobile compositions are the only callers that get a real one. */
const NOOP_API: MobilePopupApi = {
  openTeam: () => {},
  openParticipant: () => {},
  openFixture: () => {},
};

const MobilePopupContext = createContext<MobilePopupApi>(NOOP_API);

export function useMobilePopups(): MobilePopupApi {
  return useContext(MobilePopupContext);
}

interface Selection {
  teamId: string | null;
  uid: string | null;
  fixtureId: string | null;
}

const NOTHING_SELECTED: Selection = { teamId: null, uid: null, fixtureId: null };

export function MobilePopupHost({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>(NOTHING_SELECTED);
  // Latches true on the first open and never resets — see the lazy-mount note
  // above. Deliberately not derived from `selection`, which goes back to all
  // nulls on close.
  const [everOpened, setEverOpened] = useState(false);

  const api = useMemo<MobilePopupApi>(
    () => ({
      openTeam: (teamId) => {
        setEverOpened(true);
        setSelection({ teamId, uid: null, fixtureId: null });
      },
      openParticipant: (uid) => {
        setEverOpened(true);
        setSelection({ teamId: null, uid, fixtureId: null });
      },
      openFixture: (fixtureId) => {
        setEverOpened(true);
        setSelection({ teamId: null, uid: null, fixtureId });
      },
    }),
    []
  );

  const close = useCallback(() => setSelection(NOTHING_SELECTED), []);

  return (
    <MobilePopupContext.Provider value={api}>
      {children}
      {everOpened && <MobilePopupLayer selection={selection} api={api} onClose={close} />}
    </MobilePopupContext.Provider>
  );
}

/** The half that actually fetches. Split out purely so the hooks below don't
 *  run until something has been opened. */
function MobilePopupLayer({
  selection,
  api,
  onClose,
}: {
  selection: Selection;
  api: MobilePopupApi;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const phase = useTournamentPhase();
  const { players } = usePlayers();
  const { results } = useResults();
  const { entries } = useLeaderboard();

  const selectedRanked = useMemo(() => {
    if (!selection.uid) return null;
    return assignRanks(entries).find((r) => r.entry.uid === selection.uid) ?? null;
  }, [entries, selection.uid]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose]
  );

  const tournamentStarted = phase !== "notstarted";

  return (
    <>
      <ParticipantPopup
        ranked={selectedRanked}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={handleOpenChange}
        onSelectTeam={api.openTeam}
        tournamentStarted={tournamentStarted}
        viewerLoggedIn={Boolean(user)}
        phase={phase}
      />
      <TeamPopup
        teamId={selection.teamId}
        entries={entries}
        players={players}
        results={results}
        onOpenChange={handleOpenChange}
        onSelectParticipant={api.openParticipant}
        onSelectTeam={api.openTeam}
        onSelectFixture={api.openFixture}
        tournamentStarted={tournamentStarted}
        phase={phase}
      />
      <MatchupPopup
        fixtureId={selection.fixtureId}
        onOpenChange={handleOpenChange}
        phase={phase}
        tournamentStarted={tournamentStarted}
        entries={entries}
        players={players}
        results={results}
        onSelectTeam={api.openTeam}
        onSelectParticipant={api.openParticipant}
      />
    </>
  );
}
