// src/pages/HomePage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HomePage } from "./HomePage";

const mockUseVisibilityState = vi.fn();
const mockUseTournamentPhase = vi.fn();
const mockUseResults = vi.fn();
const mockUsePlayers = vi.fn();
const mockUseLeaderboard = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
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

vi.mock("../home/HomeLandingLoggedOut", () => ({
  HomeLandingLoggedOut: ({ players }: { players: unknown[] }) => (
    <div>home-landing-loggedout:{players.length}</div>
  ),
}));

vi.mock("../home/LoggedInHome", () => ({
  LoggedInHome: ({ players }: { players: unknown[] }) => <div>logged-in-home:{players.length}</div>,
}));

vi.mock("../home/HomeLandingLoggedOutStarted", () => ({
  HomeLandingLoggedOutStarted: ({ players }: { players: unknown[] }) => (
    <div>home-landing-loggedout-started:{players.length}</div>
  ),
}));

vi.mock("../home/LoggedInHomeStarted", () => ({
  LoggedInHomeStarted: ({ players, phase }: { players: unknown[]; phase: string }) => (
    <div>logged-in-home-started:{players.length}:{phase}</div>
  ),
}));

const emptyResults = { results: {}, loading: false };
const emptyPlayers = { players: [], loading: false };
const emptyLeaderboard = { entries: [], loading: false };

describe("HomePage", () => {
  beforeEach(() => {
    mockUseResults.mockReturnValue(emptyResults);
    mockUsePlayers.mockReturnValue(emptyPlayers);
    mockUseLeaderboard.mockReturnValue(emptyLeaderboard);
    mockUseTournamentPhase.mockReturnValue("leaguephase");
  });

  it("renders nothing while any data source is still loading", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    mockUseResults.mockReturnValue({ results: {}, loading: true });
    const { container } = render(<HomePage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("loggedout_notstarted: renders the dedicated landing page instead of the shared skeleton", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    mockUsePlayers.mockReturnValue({ players: [{ uid: "a" }, { uid: "b" }], loading: false });
    render(<HomePage />);
    expect(screen.getByText("home-landing-loggedout:2")).toBeInTheDocument();
    expect(screen.queryByText("team-table")).not.toBeInTheDocument();
    expect(screen.queryByText("leaderboard-table")).not.toBeInTheDocument();
  });

  it("loggedin_notstarted: renders the dedicated logged-in landing page instead of the shared skeleton", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePlayers.mockReturnValue({ players: [{ uid: "a" }, { uid: "b" }, { uid: "c" }], loading: false });
    render(<HomePage />);
    expect(screen.getByText("logged-in-home:3")).toBeInTheDocument();
    expect(screen.queryByText("team-table")).not.toBeInTheDocument();
    expect(screen.queryByText("leaderboard-table")).not.toBeInTheDocument();
  });

  it("loggedout_leaguephase: renders the dedicated started/logged-out landing page instead of the shared skeleton", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    mockUsePlayers.mockReturnValue({ players: [{ uid: "a" }], loading: false });
    render(<HomePage />);
    expect(screen.getByText("home-landing-loggedout-started:1")).toBeInTheDocument();
    expect(screen.queryByText("team-table")).not.toBeInTheDocument();
    expect(screen.queryByText("leaderboard-table")).not.toBeInTheDocument();
  });

  it.each(["loggedin_leaguephase", "loggedin_preknockout", "loggedin_knockout"] as const)(
    "%s: renders the dedicated started/logged-in landing page (reused as-is) instead of the shared skeleton",
    (state) => {
      mockUseVisibilityState.mockReturnValue(state);
      mockUseTournamentPhase.mockReturnValue(state.replace("loggedin_", ""));
      mockUsePlayers.mockReturnValue({ players: [{ uid: "a" }, { uid: "b" }, { uid: "c" }, { uid: "d" }], loading: false });
      render(<HomePage />);
      expect(screen.getByText(`logged-in-home-started:4:${state.replace("loggedin_", "")}`)).toBeInTheDocument();
      expect(screen.queryByText("team-table")).not.toBeInTheDocument();
      expect(screen.queryByText("leaderboard-table")).not.toBeInTheDocument();
    }
  );

  it("loggedout_knockout: shows the team table, a non-revealing player list, and the leaderboard", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_knockout");
    render(<HomePage />);
    expect(screen.getByText("team-table")).toBeInTheDocument();
    expect(screen.getByText("player-list:false:revealed")).toBeInTheDocument();
    expect(screen.getByText("leaderboard-table")).toBeInTheDocument();
  });
});
