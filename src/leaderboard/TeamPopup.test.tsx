import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  // useFixtures.ts uses onSnapshot, not getDocs — reuse whatever mockGetDocs
  // is configured to resolve with for a given test, same pattern as
  // MatchupPopup.test.tsx.
  onSnapshot: (collectionRef: unknown, onNext: (snapshot: unknown) => void) => {
    mockGetDocs(collectionRef).then(onNext);
    return mockUnsubscribe;
  },
}));

vi.mock("../firebase", () => ({ db: {} }));

import { TeamPopup } from "./TeamPopup";
import { TEAMS } from "../predictions/teams";
import { LeaderboardEntry } from "./leaderboardTypes";
import { TeamResult } from "./teamResultTypes";
import { RealFixture } from "./realFixtureTypes";

const TEAM = TEAMS[0];
// Distinct opponents for the two fixtures below — sharing one opponent would
// make its shortName appear twice (once per row), breaking singular
// getByText/findByText lookups.
const PAST_OPPONENT = TEAMS[1];
const NEXT_OPPONENT = TEAMS[2];

/** fixtures/{id} doc shape, as functions/fixtures writes it (no `id` field
 *  in the document body — that's the doc id itself, see useFixtures.ts). */
function fixtureDoc(fixture: RealFixture) {
  const { id, ...fields } = fixture;
  return { id, data: () => fields };
}

// One decided fixture (TEAM lost away) and one undecided fixture (TEAM at
// home) — chronological order 1 then 2, so the decided one is "past" and the
// undecided one is "next".
const PAST_FIXTURE: RealFixture = {
  id: "past-fixture",
  matchday: 1,
  order: 1,
  homeTeamId: PAST_OPPONENT.id,
  awayTeamId: TEAM.id,
  kickoffUtc: "2026-09-01T19:00:00Z",
  status: "FINISHED",
  homeGoals: 2,
  awayGoals: 1,
};
const NEXT_FIXTURE: RealFixture = {
  id: "next-fixture",
  matchday: 2,
  order: 2,
  homeTeamId: TEAM.id,
  awayTeamId: NEXT_OPPONENT.id,
  kickoffUtc: "2026-09-20T19:00:00Z",
  status: "TIMED",
  homeGoals: null,
  awayGoals: null,
};
const TEAM_FIXTURES = [PAST_FIXTURE, NEXT_FIXTURE];

const entryA: LeaderboardEntry = {
  uid: "uid1",
  firstName: "Ada",
  photoURL: "a.png",
  points: 9,
  ranking: [TEAM.id, PAST_OPPONENT.id],
};

const entryB: LeaderboardEntry = {
  uid: "uid2",
  firstName: "Alan",
  photoURL: "b.png",
  points: 6,
  ranking: [PAST_OPPONENT.id, TEAM.id],
};

const PLAYERS = [
  { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
  { uid: "uid2", firstName: "Alan", lastName: "Turing", photoURL: "b.png", createdAt: 1 },
];

// Position/points chosen outside 1-11 so they can't collide with any other
// tnum-formatted number on the page.
const results: Record<string, TeamResult> = {
  [TEAM.id]: { position: 15, points: 12, goalDifference: 4, goalsFor: 8, goalsAgainst: 4, matchesPlayed: 4 },
};

const NOT_VIEWABLE_MESSAGE = "Turnuva başlamadan bu bilgi görüntülenemez.";
const NOT_AVAILABLE_MESSAGE = "Bu bölüm şu anda hazır değil.";

describe("TeamPopup", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockGetDocs.mockResolvedValue({ docs: [] }); // no fixtures by default
  });

  it("renders nothing when there is no selected team", async () => {
    render(
      <TeamPopup
        teamId={null}
        entries={[entryA]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
  });

  it("shows the team's name and big #rank + points", async () => {
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA, entryB]}
        players={PLAYERS}
        results={results}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    expect(await screen.findByText(TEAM.name)).toBeInTheDocument();
    expect(screen.getByText("#15")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("gates the pitch diagram and the three ranked squad lists behind a not-available placeholder, regardless of tournament phase", async () => {
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    await screen.findByText(TEAM.name);
    expect(screen.queryByRole("img", { name: /Muhtemel 11/ })).not.toBeInTheDocument();
    expect(screen.queryByText("GOL")).not.toBeInTheDocument();
    expect(screen.queryByText("ASİST")).not.toBeInTheDocument();
    expect(screen.queryByText("PERFORMANS")).not.toBeInTheDocument();
    // One placeholder each for the pitch diagram, GOL, ASİST and PERFORMANS.
    expect(screen.getAllByText(NOT_AVAILABLE_MESSAGE).length).toBeGreaterThanOrEqual(4);
  });

  it("lists participants who predicted this team and calls onSelectParticipant when one is clicked", async () => {
    const onSelectParticipant = vi.fn();
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA, entryB]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={onSelectParticipant}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    const adaButton = (await screen.findByText("Ada Lovelace")).closest("button")!;
    fireEvent.click(adaButton);
    expect(onSelectParticipant).toHaveBeenCalledWith("uid1");
  });

  it("shows first-name-only when players has no lastName for this uid (logged-out data)", async () => {
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA]}
        players={[{ uid: "uid1", firstName: "Ada", photoURL: "a.png", createdAt: 1 }]}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    expect(await screen.findByText("Ada")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("shows a distinct message when no participant predicted this team", async () => {
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    expect(await screen.findByText("Bu takımı tahmin eden katılımcı yok.")).toBeInTheDocument();
  });

  it("shows the next undecided fixture and past decided fixtures, most recent first, always visible (no collapse)", async () => {
    mockGetDocs.mockResolvedValue({ docs: TEAM_FIXTURES.map(fixtureDoc) });
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    // Both sides of the next (undecided) fixture render as separate
    // crest-over-code labels — our own team's code appears at least twice
    // (once for the next match, once for the decided one below it).
    expect(await screen.findAllByText(TEAM.shortName)).not.toHaveLength(0);
    expect(screen.getByText(NEXT_OPPONENT.shortName)).toBeInTheDocument();
    expect(screen.getByText(PAST_OPPONENT.shortName)).toBeInTheDocument();
    // The decided fixture gets a result dot instead of a kickoff time — TEAM
    // lost away 1-2, so it's a loss ("Mağlubiyet") from TEAM's own point of
    // view.
    expect(screen.getByRole("img", { name: "Mağlubiyet" })).toBeInTheDocument();
  });

  it("clicking a team in match history calls onSelectTeam with that team's id", async () => {
    mockGetDocs.mockResolvedValue({ docs: TEAM_FIXTURES.map(fixtureDoc) });
    const onSelectTeam = vi.fn();
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
        onSelectTeam={onSelectTeam}
        tournamentStarted={true}
      />
    );
    const opponentButton = (await screen.findByText(NEXT_OPPONENT.shortName)).closest("button")!;
    fireEvent.click(opponentButton);
    expect(onSelectTeam).toHaveBeenCalledWith(NEXT_OPPONENT.id);
  });

  it("clicking a match-history row (not a team) fires onSelectFixture with that fixture's id", async () => {
    mockGetDocs.mockResolvedValue({ docs: TEAM_FIXTURES.map(fixtureDoc) });
    const onSelectFixture = vi.fn();
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
        onSelectTeam={() => {}}
        onSelectFixture={onSelectFixture}
        tournamentStarted={true}
      />
    );
    // The row itself, not the nested team button inside it — climb from the
    // found text up to the row's own outer role="button" div. NEXT_OPPONENT
    // only appears in the next-match row (rendered above the fold).
    const opponentTeamButton = (await screen.findByText(NEXT_OPPONENT.shortName)).closest("button")!;
    const row = opponentTeamButton.closest('[role="button"]')!;
    fireEvent.click(row);
    expect(onSelectFixture).toHaveBeenCalledWith(NEXT_FIXTURE.id);
  });

  it("calls onOpenChange(false) when the close button is activated", async () => {
    const onOpenChange = vi.fn();
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA]}
        players={PLAYERS}
        results={{}}
        onOpenChange={onOpenChange}
        onSelectParticipant={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    fireEvent.click(await screen.findByRole("button", { name: "Kapat" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything()));
  });

  it("no longer has a crest click interaction (easter egg was removed)", async () => {
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA]}
        players={PLAYERS}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
        onSelectTeam={() => {}}
        tournamentStarted={true}
      />
    );
    await screen.findByText(TEAM.name);
    expect(screen.queryByRole("button", { name: /arması/ })).not.toBeInTheDocument();
  });

  describe("before the tournament starts", () => {
    it("shows the not-viewable placeholder instead of the predictor list and match history, and never calls onSelectParticipant", async () => {
      render(
        <TeamPopup
          teamId={TEAM.id}
          entries={[entryA, entryB]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectParticipant={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={false}
        />
      );
      // One for the predictor list, one for match history.
      expect((await screen.findAllByText(NOT_VIEWABLE_MESSAGE)).length).toBeGreaterThanOrEqual(2);
      expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
      expect(screen.queryByText("Bu takımı tahmin eden katılımcı yok.")).not.toBeInTheDocument();
    });

    it("hides the rank/points values too, showing the crest/name only", async () => {
      render(
        <TeamPopup
          teamId={TEAM.id}
          entries={[entryA]}
          players={PLAYERS}
          results={results}
          onOpenChange={() => {}}
          onSelectParticipant={() => {}}
          onSelectTeam={() => {}}
          tournamentStarted={false}
        />
      );
      expect(await screen.findByText(TEAM.name)).toBeInTheDocument();
      expect(screen.queryByText("#15")).not.toBeInTheDocument();
      expect(screen.queryByText("12")).not.toBeInTheDocument();
    });
  });
});
