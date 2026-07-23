import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect } from "vitest";
import { AppShell } from "./AppShell";
import { isPageAllowed, PageKey } from "../state/pageAccess";
import { VisibilityState, getVisibilityState } from "../state/visibilityState";
import { TournamentPhase } from "../tournament/tournamentPhase";

const mockUseAuth = vi.fn();
const mockUseTournamentPhase = vi.fn();

const STATE_FIXTURES: { state: VisibilityState; user: { uid: string } | null; phase: TournamentPhase }[] = [
  { state: "loggedout_notstarted", user: null, phase: "notstarted" },
  { state: "loggedin_notstarted", user: { uid: "1" }, phase: "notstarted" },
  { state: "loggedout_leaguephase", user: null, phase: "leaguephase" },
  { state: "loggedin_leaguephase", user: { uid: "1" }, phase: "leaguephase" },
  { state: "loggedout_preknockout", user: null, phase: "preknockout" },
  { state: "loggedin_knockout", user: { uid: "1" }, phase: "knockout" },
];

const GATED_PAGES: PageKey[] = ["predictions", "leaderboard", "chat", "forum", "stats"];

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
}));

vi.mock("../auth/LoginButton", () => ({
  LoginButton: () => <button>Sign in with Google</button>,
}));

vi.mock("../auth/LogoutButton", () => ({
  LogoutButton: () => <button>Sign out</button>,
}));

function renderShell() {
  render(
    <MemoryRouter>
      <AppShell>
        <div>content</div>
      </AppShell>
    </MemoryRouter>
  );
}

describe("AppShell nav gating", () => {
  it("shows only Home when not started and not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
    renderShell();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.queryByText("Chat")).not.toBeInTheDocument();
    expect(screen.queryByText("Forum")).not.toBeInTheDocument();
    expect(screen.queryByText("Predictions")).not.toBeInTheDocument();
    expect(screen.queryByText("Leaderboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Stats")).not.toBeInTheDocument();
  });

  it("shows predictions, chat and forum when not started but logged in", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
    renderShell();
    expect(screen.getByText("Predictions")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Forum")).toBeInTheDocument();
    expect(screen.queryByText("Leaderboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Stats")).not.toBeInTheDocument();
  });

  it("shows leaderboard but not forum, stats or chat when started and not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    renderShell();
    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
    expect(screen.queryByText("Forum")).not.toBeInTheDocument();
    expect(screen.queryByText("Stats")).not.toBeInTheDocument();
    expect(screen.queryByText("Chat")).not.toBeInTheDocument();
    expect(screen.queryByText("Predictions")).not.toBeInTheDocument();
  });

  it("shows every link when started (any of the three phases) and logged in", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    for (const phase of ["leaguephase", "preknockout", "knockout"] as TournamentPhase[]) {
      mockUseTournamentPhase.mockReturnValue(phase);
      renderShell();
      for (const label of ["Predictions", "Leaderboard", "Chat", "Forum", "Stats"]) {
        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      }
    }
  });

  it("shows LoginButton when logged out and LogoutButton when logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
    renderShell();
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();

    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    renderShell();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });
});

describe("NAV_LINKS matches PAGE_ACCESS", () => {
  it.each(STATE_FIXTURES)("shows exactly the pages isPageAllowed grants for $state", ({ user, phase, state }) => {
    expect(getVisibilityState(user !== null, phase)).toBe(state);
    mockUseAuth.mockReturnValue({ user, loading: false });
    mockUseTournamentPhase.mockReturnValue(phase);
    renderShell();

    const renderedPaths = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => href !== null && href !== "/");

    for (const page of GATED_PAGES) {
      const expectedVisible = isPageAllowed(page, state);
      const isRendered = renderedPaths.includes(`/${page}`);
      expect(isRendered).toBe(expectedVisible);
    }
  });
});
