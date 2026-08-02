import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AppShell } from "./AppShell";
import { isPageAllowed, PageKey } from "../state/pageAccess";
import { VisibilityState, getVisibilityState } from "../state/visibilityState";
import { TournamentPhase } from "../tournament/tournamentPhase";

const mockUseAuth = vi.fn();
const mockUseTournamentPhase = vi.fn();
const mockUseProfile = vi.fn();

const STATE_FIXTURES: { state: VisibilityState; user: { uid: string } | null; phase: TournamentPhase }[] = [
  { state: "loggedout_notstarted", user: null, phase: "notstarted" },
  { state: "loggedin_notstarted", user: { uid: "1" }, phase: "notstarted" },
  { state: "loggedout_leaguephase", user: null, phase: "leaguephase" },
  { state: "loggedin_leaguephase", user: { uid: "1" }, phase: "leaguephase" },
  { state: "loggedout_preknockout", user: null, phase: "preknockout" },
  { state: "loggedin_knockout", user: { uid: "1" }, phase: "knockout" },
];

const GATED_PAGES: PageKey[] = ["leaderboard", "forum", "stats"];

vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
}));

vi.mock("../profile/useProfile", () => ({
  useProfile: (uid: string | null) => mockUseProfile(uid),
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

beforeEach(() => {
  mockUseProfile.mockReturnValue({ profile: null, loading: false });
});

describe("AppShell nav gating", () => {
  it("shows only Home when not started and not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
    renderShell();
    expect(screen.getByText("Ana Sayfa")).toBeInTheDocument();
    expect(screen.getByText("Hakkında")).toBeInTheDocument();
    expect(screen.queryByText("Forum")).not.toBeInTheDocument();
    expect(screen.queryByText("Predictions")).not.toBeInTheDocument();
    expect(screen.queryByText("Puan Durumu")).not.toBeInTheDocument();
    expect(screen.queryByText("İstatistikler")).not.toBeInTheDocument();
  });

  it("shows forum (but never a Predictions link) when not started but logged in", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
    renderShell();
    expect(screen.getByText("Forum")).toBeInTheDocument();
    expect(screen.getByText("Hakkında")).toBeInTheDocument();
    expect(screen.queryByText("Predictions")).not.toBeInTheDocument();
    expect(screen.queryByText("Puan Durumu")).not.toBeInTheDocument();
    expect(screen.queryByText("İstatistikler")).not.toBeInTheDocument();
  });

  it("shows leaderboard and forum but not stats or predictions when started and not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    renderShell();
    expect(screen.getByText("Puan Durumu")).toBeInTheDocument();
    expect(screen.getByText("Forum")).toBeInTheDocument();
    expect(screen.getByText("Hakkında")).toBeInTheDocument();
    expect(screen.queryByText("İstatistikler")).not.toBeInTheDocument();
    expect(screen.queryByText("Predictions")).not.toBeInTheDocument();
  });

  it("shows every started link when logged in, but never a Predictions link, in any of the three phases", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    for (const phase of ["leaguephase", "preknockout", "knockout"] as TournamentPhase[]) {
      mockUseTournamentPhase.mockReturnValue(phase);
      renderShell();
      for (const label of ["Puan Durumu", "Forum", "İstatistikler", "Hakkında"]) {
        expect(screen.getAllByText(label).length).toBeGreaterThan(0);
      }
      expect(screen.queryByText("Predictions")).not.toBeInTheDocument();
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

describe("account-slot avatar/name link", () => {
  it("renders a link to /profile with the user's avatar and first name when logged in with a profile", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
    mockUseProfile.mockReturnValue({
      profile: { firstName: "Mert", lastName: "G", photoURL: "photo-url", createdAt: 1 },
      loading: false,
    });
    renderShell();
    const link = screen.getByText("Mert").closest("a");
    expect(link).toHaveAttribute("href", "/profile");
  });

  it("does not render the avatar/name link when logged out", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
    renderShell();
    expect(screen.queryAllByRole("link").map((l) => l.getAttribute("href"))).not.toContain("/profile");
  });

  it("does not render the avatar/name link when logged in but no profile exists yet", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "1" }, loading: false });
    mockUseTournamentPhase.mockReturnValue("notstarted");
    mockUseProfile.mockReturnValue({ profile: null, loading: false });
    renderShell();
    expect(screen.queryAllByRole("link").map((l) => l.getAttribute("href"))).not.toContain("/profile");
  });
});
