// src/pages/StatsPage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { StatsPage } from "./StatsPage";

const mockUseVisibilityState = vi.fn();
const mockUseLeaderboard = vi.fn();
const mockUseResults = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../leaderboard/useLeaderboard", () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));

vi.mock("../leaderboard/useResults", () => ({
  useResults: () => mockUseResults(),
}));

vi.mock("../stats/AccuracyTable", () => ({
  AccuracyTable: ({ entries }: { entries: unknown[] }) => <div>accuracy-table:{entries.length}</div>,
}));

vi.mock("../stats/TeamBiasTable", () => ({
  TeamBiasTable: ({ teams }: { teams: unknown[] }) => <div>team-bias-table:{teams.length}</div>,
}));

describe("StatsPage", () => {
  beforeEach(() => {
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: false });
    mockUseResults.mockReturnValue({ results: {}, loading: false });
  });

  it("shows the blocked message when the page isn't allowed for this state", () => {
    mockUseVisibilityState.mockReturnValue("NST_NLI");
    render(<StatsPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("renders nothing while leaderboard or results are loading", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    mockUseLeaderboard.mockReturnValue({ entries: [], loading: true });
    const { container } = render(<StatsPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders both stat tables with computed data once loaded", () => {
    mockUseVisibilityState.mockReturnValue("ST_NLI");
    mockUseLeaderboard.mockReturnValue({
      entries: [{ uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "", points: 3, ranking: ["arsenal"] }],
      loading: false,
    });
    mockUseResults.mockReturnValue({
      results: { arsenal: { position: 1, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 } },
      loading: false,
    });
    render(<StatsPage />);
    expect(screen.getByText("accuracy-table:1")).toBeInTheDocument();
    expect(screen.getByText("team-bias-table:1")).toBeInTheDocument();
  });
});
