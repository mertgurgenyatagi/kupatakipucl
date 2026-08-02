import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { HomePage } from "./HomePage";

const mockUseVisibilityState = vi.fn();
const mockUseResults = vi.fn();
const mockUsePlayers = vi.fn();
const mockUseLeaderboard = vi.fn();
const mockUseTournamentPhase = vi.fn();
const mockUseBracketState = vi.fn();

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

vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
}));

vi.mock("../bracket/useBracketState", () => ({
  useBracketState: () => mockUseBracketState(),
}));

vi.mock("../home/HomeLandingLoggedOut", () => ({
  HomeLandingLoggedOut: ({ players }: { players: unknown[] }) => (
    <div>home-landing-loggedout:{players.length}</div>
  ),
}));

vi.mock("../home/LoggedInHome", () => ({
  LoggedInHome: ({ players }: { players: unknown[] }) => <div>logged-in-home:{players.length}</div>,
}));

vi.mock("../home/StartedHomeLoggedOut", () => ({
  StartedHomeLoggedOut: () => <div>started-home-loggedout</div>,
}));

const emptyResults = { results: {}, loading: false };
const emptyPlayers = { players: [], loading: false };
const emptyLeaderboard = { entries: [], loading: false };
const emptyBracketState = { bracketState: { ro16Teams: {}, winners: {} }, loading: false };

describe("HomePage", () => {
  beforeEach(() => {
    mockUseResults.mockReturnValue(emptyResults);
    mockUsePlayers.mockReturnValue(emptyPlayers);
    mockUseLeaderboard.mockReturnValue(emptyLeaderboard);
    mockUseTournamentPhase.mockReturnValue({ phase: "notstarted", loading: false });
    mockUseBracketState.mockReturnValue(emptyBracketState);
  });

  it("renders nothing while any data source is still loading", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    mockUseResults.mockReturnValue({ results: {}, loading: true });
    const { container } = render(<HomePage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("loggedout_notstarted: renders the dedicated landing page instead of any started composition", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_notstarted");
    mockUsePlayers.mockReturnValue({ players: [{ uid: "a" }, { uid: "b" }], loading: false });
    render(<HomePage />);
    expect(screen.getByText("home-landing-loggedout:2")).toBeInTheDocument();
    expect(screen.queryByText("started-home-loggedout")).not.toBeInTheDocument();
  });

  it("loggedin_notstarted: renders the dedicated logged-in landing page", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    mockUsePlayers.mockReturnValue({ players: [{ uid: "a" }, { uid: "b" }, { uid: "c" }], loading: false });
    render(<HomePage />);
    expect(screen.getByText("logged-in-home:3")).toBeInTheDocument();
  });

  it("loggedout_leaguephase: routes to StartedHomeLoggedOut, not the old BLURB skeleton", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    mockUseTournamentPhase.mockReturnValue({ phase: "leaguephase", loading: false });
    render(<HomePage />);
    expect(screen.getByText("started-home-loggedout")).toBeInTheDocument();
  });

  it("loggedin_knockout: routes to LoggedInHome, not the old BLURB skeleton", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_knockout");
    mockUseTournamentPhase.mockReturnValue({ phase: "knockout", loading: false });
    mockUsePlayers.mockReturnValue({ players: [{ uid: "a" }], loading: false });
    render(<HomePage />);
    expect(screen.getByText("logged-in-home:1")).toBeInTheDocument();
  });

  it("waits for bracketState before rendering the signed-out started composition", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    mockUseTournamentPhase.mockReturnValue({ phase: "leaguephase", loading: false });
    mockUseBracketState.mockReturnValue({ bracketState: { ro16Teams: {}, winners: {} }, loading: true });
    const { container } = render(<HomePage />);
    expect(container).toBeEmptyDOMElement();
  });
});
