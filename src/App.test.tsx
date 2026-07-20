import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { App } from "./App";

const mockUseAuth = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
}));

vi.mock("./firebase", () => ({ auth: {}, db: {} }));

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  getDocs: () => Promise.resolve({ docs: [] }),
}));

vi.mock("./auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

vi.mock("./profile/ProfileGate", () => ({
  ProfileGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("App routing integration", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("renders the home placeholder for the not-started/logged-out state by default", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    window.history.pushState({}, "", "?debugDate=2026-01-01");
    render(<App />);
    expect(await screen.findByText(/Not started, not logged in/)).toBeInTheDocument();
  });

  it("navigates to an allowed page via the nav link", () => {
    // Logged in (not logged-out) so Forum is actually in the NST_LI nav —
    // NST_NLI hides Forum too per SPEC.md §8, so that combination has no
    // Forum link to click.
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    window.history.pushState({}, "", "?debugDate=2026-01-01");
    render(<App />);
    fireEvent.click(screen.getByText("Forum"));
    expect(screen.getByText("Forum — coming soon.")).toBeInTheDocument();
  });

  it("shows the blocked message when a disallowed page is reached directly", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    window.history.pushState({}, "", "?debugDate=2026-01-01#/leaderboard");
    render(<App />);
    // LeaderboardPage still fires its data hooks even while blocked (Rules of
    // Hooks) — findByText lets that pending fetch settle before the test
    // ends, so it doesn't leak an unwrapped state update into a later test.
    expect(
      await screen.findByText("This section isn't available right now.")
    ).toBeInTheDocument();
  });
});
