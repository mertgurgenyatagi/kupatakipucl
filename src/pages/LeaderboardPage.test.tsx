// src/pages/LeaderboardPage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LeaderboardPage } from "./LeaderboardPage";

const mockUseVisibilityState = vi.fn();
const mockUseLeaderboard = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../leaderboard/useLeaderboard", () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));

describe("LeaderboardPage", () => {
  beforeEach(() => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
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
    // The name now appears in both the standings row and the leader cell.
    expect(screen.getAllByText(/Ada Lovelace/).length).toBeGreaterThan(0);
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("shows the live participant count and current leader", () => {
    mockUseLeaderboard.mockReturnValue({
      entries: [
        { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", points: 9, ranking: [] },
        { uid: "uid2", firstName: "Alan", lastName: "Turing", photoURL: "b.png", points: 6, ranking: [] },
      ],
      loading: false,
    });
    render(<LeaderboardPage />);
    expect(screen.getByText("Lider")).toBeInTheDocument();
    // Also a table column header, so more than one match is expected.
    expect(screen.getAllByText("Katılımcı").length).toBeGreaterThan(0);
    // Live count, not a hard-coded masthead figure.
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("9 puan")).toBeInTheDocument();
  });
});
