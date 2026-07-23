import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, afterEach } from "vitest";
import { AppShell } from "./AppShell";
import { isPageAllowed, PageKey } from "../state/pageAccess";
import { VisibilityState } from "../state/visibilityState";

const mockUseAuth = vi.fn();

const STATE_FIXTURES: { state: VisibilityState; user: { uid: string } | null; debugDate: string }[] = [
  { state: "NST_NLI", user: null, debugDate: "2026-01-01" },
  { state: "NST_LI", user: { uid: "1" }, debugDate: "2026-01-01" },
  { state: "ST_NLI", user: null, debugDate: "2026-09-09" },
  { state: "ST_LI", user: { uid: "1" }, debugDate: "2026-09-09" },
];

const GATED_PAGES: PageKey[] = ["predictions", "leaderboard", "chat", "forum", "stats"];

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../auth/LoginButton", () => ({
  LoginButton: () => <button>Sign in with Google</button>,
}));

vi.mock("../auth/LogoutButton", () => ({
  LogoutButton: () => <button>Sign out</button>,
}));

function setDebugDate(date: string) {
  window.history.pushState({}, "", `?debugDate=${date}`);
}

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
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("shows only Home when not started and not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setDebugDate("2026-01-01");
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
    setDebugDate("2026-01-01");
    renderShell();
    expect(screen.getByText("Predictions")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Forum")).toBeInTheDocument();
    expect(screen.queryByText("Leaderboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Stats")).not.toBeInTheDocument();
  });

  it("shows leaderboard and forum but not stats or chat when started and not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setDebugDate("2026-09-09");
    renderShell();
    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
    expect(screen.getByText("Forum")).toBeInTheDocument();
    expect(screen.queryByText("Stats")).not.toBeInTheDocument();
    expect(screen.queryByText("Chat")).not.toBeInTheDocument();
    expect(screen.queryByText("Predictions")).not.toBeInTheDocument();
  });

  it("shows every link when started and logged in", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    setDebugDate("2026-09-09");
    renderShell();
    for (const label of ["Predictions", "Leaderboard", "Chat", "Forum", "Stats"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("shows LoginButton when logged out and LogoutButton when logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setDebugDate("2026-01-01");
    renderShell();
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();

    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    renderShell();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });
});

describe("NAV_LINKS matches PAGE_ACCESS", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it.each(STATE_FIXTURES)("shows exactly the pages isPageAllowed grants for $state", ({ user, state, debugDate }) => {
    mockUseAuth.mockReturnValue({ user, loading: false });
    setDebugDate(debugDate);
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
