import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { MatchupPopup } from "./MatchupPopup";
import { FIXTURES } from "../devpanel/fixtures";
import { TEAM_BY_ID } from "../predictions/teams";
import { LeaderboardEntry } from "./leaderboardTypes";
import { TeamResult } from "./teamResultTypes";

const FIXTURE = FIXTURES[0];
const HOME = TEAM_BY_ID[FIXTURE.homeTeamId];
const AWAY = TEAM_BY_ID[FIXTURE.awayTeamId];

const entryA: LeaderboardEntry = {
  uid: "uid1",
  firstName: "Ada",
  photoURL: "a.png",
  points: 9,
  ranking: [FIXTURE.homeTeamId, FIXTURE.awayTeamId],
};
const entryB: LeaderboardEntry = {
  uid: "uid2",
  firstName: "Alan",
  photoURL: "b.png",
  points: 6,
  ranking: [FIXTURE.awayTeamId, FIXTURE.homeTeamId],
};
const PLAYERS = [
  { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
  { uid: "uid2", firstName: "Alan", lastName: "Turing", photoURL: "b.png", createdAt: 1 },
];
const results: Record<string, TeamResult> = {
  [FIXTURE.homeTeamId]: { position: 3, points: 12, goalDifference: 4, goalsFor: 8, goalsAgainst: 4 },
  [FIXTURE.awayTeamId]: { position: 20, points: 3, goalDifference: -3, goalsFor: 2, goalsAgainst: 5 },
};

describe("MatchupPopup", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockGetDocs.mockResolvedValue({ docs: [] }); // devMatches: nothing decided by default
  });

  it("renders nothing when there is no selected fixture", async () => {
    render(
      <MatchupPopup
        fixtureId={null}
        onOpenChange={() => {}}
        phase="leaguephase"
        tournamentStarted={true}
        entries={[]}
        players={PLAYERS}
        results={{}}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
  });

  it("shows both teams' names and the kickoff date/time before the fixture is decided", async () => {
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="notstarted"
        tournamentStarted={false}
        entries={[]}
        players={PLAYERS}
        results={{}}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(await screen.findByText(HOME.name)).toBeInTheDocument();
    expect(screen.getByText(AWAY.name)).toBeInTheDocument();
  });

  it("shows only the bare fixture card in notstarted phase — no rank/points, no predictor list", async () => {
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="notstarted"
        tournamentStarted={false}
        entries={[entryA]}
        players={PLAYERS}
        results={results}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    await screen.findByText(HOME.name);
    expect(screen.queryByText("Sıra")).not.toBeInTheDocument();
    expect(screen.queryByText("Puan")).not.toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("shows the matchday label for league-phase and each team's real rank/points once started", async () => {
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="leaguephase"
        tournamentStarted={true}
        entries={[]}
        players={PLAYERS}
        results={results}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(await screen.findByText(`${FIXTURE.matchday}. HAFTA`)).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("#20")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("lists participants who predicted each team and calls onSelectParticipant when one is clicked", async () => {
    const onSelectParticipant = vi.fn();
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="leaguephase"
        tournamentStarted={true}
        entries={[entryA, entryB]}
        players={PLAYERS}
        results={{}}
        onSelectTeam={() => {}}
        onSelectParticipant={onSelectParticipant}
      />
    );
    // entryA's test-fixture ranking is [home, away] (a stand-in short array,
    // not a real 36-team ranking), so it legitimately contains both team
    // ids — Ada shows up as a predictor for *both* columns here. Either
    // occurrence identifies the same participant, so grab the first.
    const adaButton = (await screen.findAllByText("Ada Lovelace"))[0].closest("button")!;
    fireEvent.click(adaButton);
    expect(onSelectParticipant).toHaveBeenCalledWith("uid1");
  });

  it("shows the not-viewable placeholder instead of the predictor lists before the tournament starts", async () => {
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="leaguephase"
        tournamentStarted={false}
        entries={[entryA, entryB]}
        players={PLAYERS}
        results={results}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect((await screen.findAllByText("Turnuva başlamadan bu bilgi görüntülenemez.")).length).toBe(2);
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.queryByText("#3")).not.toBeInTheDocument();
  });

  it("shows the final score instead of kickoff time once the fixture outcome is decided", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: FIXTURE.id, data: () => ({ outcome: "homewin" }) }],
    });
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="leaguephase"
        tournamentStarted={true}
        entries={[]}
        players={PLAYERS}
        results={{}}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(await screen.findByText("1 - 0")).toBeInTheDocument();
  });

  // A fixture resolved via FIXTURES.find(...) — which `fixture` always is,
  // see MatchupPopup.tsx — is always a real league-phase fixture, no matter
  // what the ambient global `phase` prop currently is (an admin can flip
  // the app-wide phase to "knockout" while historical league fixtures are
  // still opened from TeamPopup's match history). This is the exact bug
  // fixed by keying the header/content mode on `isKnockoutFixture` instead
  // of the `phase` prop directly.
  it("still shows the league view (matchday header + real predictor list) for a real fixture even when the global phase is knockout", async () => {
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="knockout"
        tournamentStarted={true}
        entries={[entryA]}
        players={PLAYERS}
        results={results}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(await screen.findByText(`${FIXTURE.matchday}. HAFTA`)).toBeInTheDocument();
    expect(screen.queryByText("ELEME TURU")).not.toBeInTheDocument();
    expect(screen.queryByText("Bu özellik henüz mevcut değil.")).not.toBeInTheDocument();
    expect((await screen.findAllByText("Ada Lovelace")).length).toBeGreaterThan(0);
  });

  it("clicking a team calls onSelectTeam with that team's id", async () => {
    const onSelectTeam = vi.fn();
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={() => {}}
        phase="leaguephase"
        tournamentStarted={true}
        entries={[]}
        players={PLAYERS}
        results={{}}
        onSelectTeam={onSelectTeam}
        onSelectParticipant={() => {}}
      />
    );
    fireEvent.click(await screen.findByText(HOME.name));
    expect(onSelectTeam).toHaveBeenCalledWith(HOME.id);
  });

  it("calls onOpenChange(false) when the close button is activated", async () => {
    const onOpenChange = vi.fn();
    render(
      <MatchupPopup
        fixtureId={FIXTURE.id}
        onOpenChange={onOpenChange}
        phase="leaguephase"
        tournamentStarted={true}
        entries={[]}
        players={PLAYERS}
        results={{}}
        onSelectTeam={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    fireEvent.click(await screen.findByRole("button", { name: "Kapat" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything()));
  });
});
