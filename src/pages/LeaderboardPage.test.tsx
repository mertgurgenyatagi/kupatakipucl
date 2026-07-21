// src/pages/LeaderboardPage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LeaderboardPage } from "./LeaderboardPage";

const mockUseVisibilityState = vi.fn();
const mockUseLeaderboard = vi.fn();
const mockUseResults = vi.fn();
const mockUseTournamentPhase = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../leaderboard/useLeaderboard", () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));

vi.mock("../leaderboard/useResults", () => ({
  useResults: () => mockUseResults(),
}));

vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
}));

describe("LeaderboardPage", () => {
  beforeEach(() => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    mockUseResults.mockReturnValue({ results: {}, loading: false });
    mockUseTournamentPhase.mockReturnValue("pre");
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("NST_NLI");
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: false });
    render(<LeaderboardPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("shows a skeleton placeholder while the leaderboard is loading", () => {
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: true });
    render(<LeaderboardPage />);
    expect(screen.getByTestId("leaderboard-skeleton")).toBeInTheDocument();
  });

  it("renders the leaderboard table once loaded", () => {
    mockUseLeaderboard.mockReturnValue({
      entries: [{ uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", points: 9, ranking: [] }],
      loading: false,
    });
    render(<LeaderboardPage />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("composes the team table and three stat widgets alongside the standings, once loaded", () => {
    mockUseLeaderboard.mockReturnValue({
      entries: [{ uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", points: 9, ranking: [] }],
      loading: false,
    });
    render(<LeaderboardPage />);
    // The team table (its frame title) and the three honestly-empty stat widgets.
    expect(screen.getByText("Puan Durumu")).toBeInTheDocument();
    expect(screen.getAllByTestId("stat-widget")).toHaveLength(3);
  });
});
