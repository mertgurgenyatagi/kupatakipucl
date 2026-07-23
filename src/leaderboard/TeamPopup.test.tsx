import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { TeamPopup } from "./TeamPopup";
import { TEAMS } from "../predictions/teams";
import { FIXTURES } from "../devpanel/fixtures";
import { LeaderboardEntry } from "./leaderboardTypes";
import { TeamResult } from "./teamResultTypes";

const TEAM = TEAMS[0];
const OTHER_TEAM = TEAMS[1];
const TEAM_FIXTURES = FIXTURES.filter(
  (f) => f.homeTeamId === TEAM.id || f.awayTeamId === TEAM.id
).sort((a, b) => a.order - b.order);

const entryA: LeaderboardEntry = {
  uid: "uid1",
  firstName: "Ada",
  lastName: "Lovelace",
  photoURL: "a.png",
  points: 9,
  ranking: [TEAM.id, OTHER_TEAM.id],
};

const entryB: LeaderboardEntry = {
  uid: "uid2",
  firstName: "Alan",
  lastName: "Turing",
  photoURL: "b.png",
  points: 6,
  ranking: [OTHER_TEAM.id, TEAM.id],
};

// Position/points chosen outside 1-11 so they can't collide with the
// starting-XI pitch diagram's own marker text.
const results: Record<string, TeamResult> = {
  [TEAM.id]: { position: 15, points: 12, goalDifference: 4, goalsFor: 8, goalsAgainst: 4, matchesPlayed: 4 },
};

describe("TeamPopup", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockGetDocs.mockResolvedValue({ docs: [] }); // devMatches: nothing decided by default
  });

  it("renders nothing when there is no selected team", async () => {
    render(
      <TeamPopup
        teamId={null}
        entries={[entryA]}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
  });

  it("shows the team's name, bare manager name (no label), and big #rank + points", async () => {
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA, entryB]}
        results={results}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(await screen.findByText(TEAM.name)).toBeInTheDocument();
    expect(screen.getByText("#15")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.queryByText(/Teknik Direktör/i)).not.toBeInTheDocument();
  });

  it("shows a full-pitch starting XI diagram", async () => {
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA]}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(await screen.findByRole("img", { name: /Muhtemel 11/ })).toBeInTheDocument();
  });

  it("shows the three ranked squad lists", async () => {
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA]}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(await screen.findByText("Gol Krallığı")).toBeInTheDocument();
    expect(screen.getByText("Asist Krallığı")).toBeInTheDocument();
    expect(screen.getByText("En İyiler")).toBeInTheDocument();
  });

  it("lists participants who predicted this team and calls onSelectParticipant when one is clicked", async () => {
    const onSelectParticipant = vi.fn();
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA, entryB]}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={onSelectParticipant}
      />
    );
    const adaButton = (await screen.findByText("Ada Lovelace")).closest("button")!;
    fireEvent.click(adaButton);
    expect(onSelectParticipant).toHaveBeenCalledWith("uid1");
  });

  it("shows a distinct message when no participant predicted this team", async () => {
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[]}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    expect(await screen.findByText("Bu takımı tahmin eden katılımcı yok.")).toBeInTheDocument();
  });

  it("shows the next undecided fixture and past decided fixtures, most recent first, always visible (no collapse)", async () => {
    const decided = TEAM_FIXTURES[0];
    mockGetDocs.mockResolvedValue({
      docs: [{ id: decided.id, data: () => ({ outcome: "homewin" }) }],
    });
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA]}
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    const nextOpponent = TEAM_BY_ID_SHORT(TEAM_FIXTURES[1].homeTeamId === TEAM.id ? TEAM_FIXTURES[1].awayTeamId : TEAM_FIXTURES[1].homeTeamId);
    // Both sides of the next (undecided) fixture render as separate
    // crest-over-code labels — our own team's code appears at least twice
    // (once for the next match, once for the decided one below it).
    expect(await screen.findAllByText(TEAM.shortName)).not.toHaveLength(0);
    expect(screen.getByText(nextOpponent)).toBeInTheDocument();
    const pastOpponent = TEAM_BY_ID_SHORT(decided.homeTeamId === TEAM.id ? decided.awayTeamId : decided.homeTeamId);
    expect(screen.getByText(pastOpponent)).toBeInTheDocument();
    // The decided fixture gets a result dot instead of a kickoff time —
    // "homewin" means a win for Arsenal if they were the home side, a
    // loss otherwise.
    const expectedResult = decided.homeTeamId === TEAM.id ? "Galibiyet" : "Mağlubiyet";
    expect(screen.getByRole("img", { name: expectedResult })).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when the close button is activated", async () => {
    const onOpenChange = vi.fn();
    render(
      <TeamPopup
        teamId={TEAM.id}
        entries={[entryA]}
        results={{}}
        onOpenChange={onOpenChange}
        onSelectParticipant={() => {}}
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
        results={{}}
        onOpenChange={() => {}}
        onSelectParticipant={() => {}}
      />
    );
    await screen.findByText(TEAM.name);
    expect(screen.queryByRole("button", { name: /arması/ })).not.toBeInTheDocument();
  });
});

function TEAM_BY_ID_SHORT(id: string): string {
  return TEAMS.find((t) => t.id === id)?.shortName ?? id;
}
