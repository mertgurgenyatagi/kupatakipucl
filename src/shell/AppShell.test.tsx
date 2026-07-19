import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, afterEach } from "vitest";
import { AppShell } from "./AppShell";

const mockUseAuth = vi.fn();

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

  it("shows leaderboard, stats and forum but not chat when started and not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    setDebugDate("2026-09-09");
    renderShell();
    expect(screen.getByText("Leaderboard")).toBeInTheDocument();
    expect(screen.getByText("Stats")).toBeInTheDocument();
    expect(screen.getByText("Forum")).toBeInTheDocument();
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
