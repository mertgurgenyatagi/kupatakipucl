// src/pages/LeaderboardPage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { LeaderboardPage } from "./LeaderboardPage";

const mockUseLeaderboard = vi.fn();

vi.mock("../leaderboard/useLeaderboard", () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));

describe("LeaderboardPage", () => {
  it("renders nothing while the leaderboard is loading", () => {
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: true });
    const { container } = render(<LeaderboardPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the leaderboard table once loaded", () => {
    mockUseLeaderboard.mockReturnValue({
      entries: [{ uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", points: 9, ranking: [] }],
      loading: false,
    });
    render(<LeaderboardPage />);
    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(screen.getByText(/9 puan/)).toBeInTheDocument();
  });
});
