// src/pages/HomePage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HomePage } from "./HomePage";

const mockUseVisibilityState = vi.fn();
const mockUseResults = vi.fn();
const mockUsePlayers = vi.fn();
const mockUseLeaderboard = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../leaderboard/useResults", () => ({
  useResults: () => mockUseResults(),
}));

vi.mock("../profile/usePlayers", () => ({
  usePlayers: () => mockUsePlayers(),
}));

vi.mock("../leaderboard/useLeaderboard", () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));

vi.mock("../leaderboard/TeamTable", () => ({
  TeamTable: () => <div>team-table</div>,
}));

vi.mock("../leaderboard/PlayerList", () => ({
  PlayerList: ({ showFullNames, leaderboardEntries }: { showFullNames: boolean; leaderboardEntries?: unknown[] }) => (
    <div>
      player-list:{String(showFullNames)}:{leaderboardEntries ? "revealed" : "hidden"}
    </div>
  ),
}));

vi.mock("../leaderboard/LeaderboardTable", () => ({
  LeaderboardTable: () => <div>leaderboard-table</div>,
}));

const emptyResults = { results: {}, loading: false };
const emptyPlayers = { players: [], loading: false };
const emptyLeaderboard = { entries: [], loading: false };

describe("HomePage", () => {
  beforeEach(() => {
    mockUseResults.mockReturnValue(emptyResults);
    mockUsePlayers.mockReturnValue(emptyPlayers);
    mockUseLeaderboard.mockReturnValue(emptyLeaderboard);
  });

  it("renders nothing while any data source is still loading", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    mockUseResults.mockReturnValue({ results: {}, loading: true });
    const { container } = render(<HomePage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("loggedout_notstarted: shows the team table and a first-names-only player list, no leaderboard", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    render(<HomePage />);
    expect(screen.getByText("team-table")).toBeInTheDocument();
    expect(screen.getByText("player-list:false:hidden")).toBeInTheDocument();
    expect(screen.queryByText("leaderboard-table")).not.toBeInTheDocument();
  });

  it("loggedin_notstarted: shows the team table and a full-name player list, no leaderboard", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    render(<HomePage />);
    expect(screen.getByText("team-table")).toBeInTheDocument();
    expect(screen.getByText("player-list:true:hidden")).toBeInTheDocument();
    expect(screen.queryByText("leaderboard-table")).not.toBeInTheDocument();
  });

  it("loggedout_leaguephase: shows the team table, a revealing first-names-only player list (logged out), and the leaderboard", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    render(<HomePage />);
    expect(screen.getByText("team-table")).toBeInTheDocument();
    expect(screen.getByText("player-list:false:revealed")).toBeInTheDocument();
    expect(screen.getByText("leaderboard-table")).toBeInTheDocument();
  });

  it("loggedin_knockout: shows the team table, a revealing full-name player list, and the leaderboard", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_knockout");
    render(<HomePage />);
    expect(screen.getByText("team-table")).toBeInTheDocument();
    expect(screen.getByText("player-list:true:revealed")).toBeInTheDocument();
    expect(screen.getByText("leaderboard-table")).toBeInTheDocument();
  });
});
