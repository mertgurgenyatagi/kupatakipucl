// src/pages/LeaderboardPage.test.tsx
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LeaderboardPage } from "./LeaderboardPage";
import { TEAMS } from "../predictions/teams";

// KnockoutBracket is a complex interactive widget; a lightweight stub is
// sufficient for these integration tests — we only need to confirm the bracket
// *slot* is present in the knockout layout, not test the bracket itself.
vi.mock("../knockout/KnockoutBracket", () => ({
  KnockoutBracket: () => <div data-testid="knockout-bracket-stub" />,
}));

const mockUseVisibilityState = vi.fn();
const mockUseLeaderboard = vi.fn();
const mockUsePlayers = vi.fn();
const mockUseResults = vi.fn();
const mockUseTournamentPhase = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "test-user-id" }, loading: false }),
}));

vi.mock("../leaderboard/useLeaderboard", () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));

vi.mock("../profile/usePlayers", () => ({
  usePlayers: () => mockUsePlayers(),
}));

vi.mock("../leaderboard/useResults", () => ({
  useResults: () => mockUseResults(),
}));

vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
}));

const PLAYERS = [{ uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 }];

describe("LeaderboardPage", () => {
  beforeEach(() => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUsePlayers.mockReturnValue({ players: PLAYERS, loading: false });
    mockUseResults.mockReturnValue({ results: {}, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: false });
    render(<LeaderboardPage />);
    expect(screen.getByText("Bu bölüm şu anda kullanılamıyor.")).toBeInTheDocument();
  });

  it("shows the blocked message for a logged-out visitor even once the tournament has started", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: false });
    render(<LeaderboardPage />);
    expect(screen.getByText("Bu bölüm şu anda kullanılamıyor.")).toBeInTheDocument();
  });

  it("shows a skeleton placeholder while the leaderboard is loading", () => {
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: true });
    render(<LeaderboardPage />);
    expect(screen.getByTestId("leaderboard-skeleton")).toBeInTheDocument();
  });

  it("renders the leaderboard table once loaded", async () => {
    mockUseLeaderboard.mockReturnValue({
      entries: [{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 42, ranking: [] }],
      loading: false,
    });
    render(<LeaderboardPage />);
    // The page's own gate additionally preloads every team crest + player
    // avatar before revealing — always a microtask past mount, even with
    // test/setup.ts's instant Image mock (Promise.all(...).then(...) is
    // inherently async).
    await act(async () => {});
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("composes the team table and the hero carousel alongside the standings, once loaded", async () => {
    mockUseLeaderboard.mockReturnValue({
      entries: [{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 9, ranking: [] }],
      loading: false,
    });
    render(<LeaderboardPage />);
    await act(async () => {});
    // The team table (no frame header of its own anymore, just its rows) and
    // the hero carousel that replaced the stat widgets in this column.
    expect(screen.getAllByText(TEAMS[0].shortName).length).toBeGreaterThan(0);
    expect((await screen.findAllByTestId("hero-image")).length).toBeGreaterThan(0);
  });

  it("opens the Matchup Popup when a fixture row in the hero drawer is clicked", async () => {
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: false });
    render(<LeaderboardPage />);
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Yaklaşan maçları göster" }));
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // the first fixture row's own click target
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("renders the knockout bracket layout when the tournament phase is 'knockout'", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_knockout");
    mockUseTournamentPhase.mockReturnValue("knockout");
    mockUseLeaderboard.mockReturnValue({
      entries: [{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 36, ranking: [] }],
      loading: false,
    });
    render(<LeaderboardPage />);
    await act(async () => {});
    expect(screen.getByTestId("knockout-bracket-stub")).toBeInTheDocument();
  });

  it("does not render the team table in knockout phase", async () => {
    mockUseVisibilityState.mockReturnValue("loggedin_knockout");
    mockUseTournamentPhase.mockReturnValue("knockout");
    mockUseLeaderboard.mockReturnValue({
      entries: [{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 36, ranking: [] }],
      loading: false,
    });
    render(<LeaderboardPage />);
    await act(async () => {});
    // TeamTable's "AV" (Averaj) column header is unique to that component and
    // is absent in both the bracket and the hero carousel / fixtures drawer.
    expect(screen.queryByText("AV")).not.toBeInTheDocument();
  });
});
