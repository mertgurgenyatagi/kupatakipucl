// src/pages/LeaderboardPage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LeaderboardPage } from "./LeaderboardPage";
import { TEAMS } from "../predictions/teams";

const mockUseVisibilityState = vi.fn();
const mockUseLeaderboard = vi.fn();
const mockUsePlayers = vi.fn();
const mockUseResults = vi.fn();
const mockUseTournamentPhase = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
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

  it("renders the leaderboard table once loaded", () => {
    mockUseLeaderboard.mockReturnValue({
      entries: [{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 42, ranking: [] }],
      loading: false,
    });
    render(<LeaderboardPage />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("composes the team table and the hero carousel alongside the standings, once loaded", () => {
    mockUseLeaderboard.mockReturnValue({
      entries: [{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 9, ranking: [] }],
      loading: false,
    });
    render(<LeaderboardPage />);
    // The team table (no frame header of its own anymore, just its rows) and
    // the hero carousel that replaced the stat widgets in this column.
    expect(screen.getAllByText(TEAMS[0].shortName).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("hero-image").length).toBeGreaterThan(0);
  });
});
