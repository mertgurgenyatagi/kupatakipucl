import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MatchesPage } from "./MatchesPage";

const mockUseVisibilityState = vi.fn();
const mockUseFixtures = vi.fn();
const mockUseLeaderboard = vi.fn();
const mockUseResults = vi.fn();
const mockUsePlayers = vi.fn();
const mockUseTournamentPhase = vi.fn();
const mockUseIsMobile = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));
vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "test-user-id" }, loading: false }),
}));
vi.mock("../leaderboard/useFixtures", () => ({
  useFixtures: () => mockUseFixtures(),
}));
vi.mock("../leaderboard/useLeaderboard", () => ({
  useLeaderboard: () => mockUseLeaderboard(),
}));
vi.mock("../leaderboard/useResults", () => ({
  useResults: () => mockUseResults(),
}));
vi.mock("../profile/usePlayers", () => ({
  usePlayers: () => mockUsePlayers(),
}));
vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
}));
vi.mock("@/lib/useIsMobile", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

const fixture = (overrides = {}) => ({
  id: "f1",
  matchday: 1,
  stage: "LEAGUE_STAGE",
  order: 1,
  homeTeamId: "arsenal",
  awayTeamId: "barcelona",
  kickoffUtc: "2026-09-15T16:45:00.000Z",
  status: "TIMED",
  homeGoals: null,
  awayGoals: null,
  ...overrides,
});

// Matchday 1 across two evenings, matchday 2 a week later.
const FIXTURES = [
  fixture({ id: "md1-a", order: 1, kickoffUtc: "2026-09-15T16:45:00.000Z" }),
  fixture({ id: "md1-b", order: 2, homeTeamId: "inter-milan", awayTeamId: "porto", kickoffUtc: "2026-09-16T19:00:00.000Z" }),
  fixture({ id: "md2-a", matchday: 2, order: 3, homeTeamId: "fenerbahce", awayTeamId: "como", kickoffUtc: "2026-09-22T19:00:00.000Z" }),
];

// Two participants who disagree about Arsenal vs Barcelona.
const ENTRIES = [
  { uid: "u1", firstName: "Ada", photoURL: "", points: 0, ranking: ["arsenal", "barcelona"] },
  { uid: "u2", firstName: "Bo", photoURL: "", points: 0, ranking: ["barcelona", "arsenal"] },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <MatchesPage />
    </MemoryRouter>
  );
}

describe("MatchesPage", () => {
  beforeEach(() => {
    mockUseVisibilityState.mockReturnValue("loggedin_leaguephase");
    mockUseFixtures.mockReturnValue({ fixtures: FIXTURES, loading: false });
    mockUseLeaderboard.mockReturnValue({ entries: ENTRIES, loading: false });
    mockUseResults.mockReturnValue({ results: {}, loading: false });
    mockUsePlayers.mockReturnValue({ players: [], loading: false });
    mockUseTournamentPhase.mockReturnValue("leaguephase");
    mockUseIsMobile.mockReturnValue(false);
  });

  it("blocks a logged-out visitor even once the tournament has started", () => {
    mockUseVisibilityState.mockReturnValue("loggedout_leaguephase");
    renderPage();
    expect(screen.getByText("Bu bölüm şu anda kullanılamıyor.")).toBeInTheDocument();
  });

  it("blocks everyone before the tournament starts", () => {
    mockUseVisibilityState.mockReturnValue("loggedin_notstarted");
    renderPage();
    expect(screen.getByText("Bu bölüm şu anda kullanılamıyor.")).toBeInTheDocument();
  });

  it("shows a skeleton while the fixtures are loading", () => {
    mockUseFixtures.mockReturnValue({ fixtures: [], loading: true });
    renderPage();
    expect(screen.getByTestId("matches-skeleton")).toBeInTheDocument();
  });

  it("renders one tab per matchday", async () => {
    renderPage();
    await act(async () => {});
    expect(screen.getByRole("tab", { name: /1\. Hafta/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /2\. Hafta/ })).toBeInTheDocument();
  });

  it("groups the selected round's fixtures under date headers", async () => {
    renderPage();
    await act(async () => {});
    expect(screen.getByText(/15 Eylül/i)).toBeInTheDocument();
    expect(screen.getByText(/16 Eylül/i)).toBeInTheDocument();
    // Matchday 2's day header belongs to a different tab.
    expect(screen.queryByText(/22 Eylül/i)).not.toBeInTheDocument();
  });

  it("switches rounds when another tab is clicked", async () => {
    renderPage();
    await act(async () => {});
    fireEvent.click(screen.getByRole("tab", { name: /2\. Hafta/ }));
    expect(screen.getByText(/22 Eylül/i)).toBeInTheDocument();
    expect(screen.queryByText(/15 Eylül/i)).not.toBeInTheDocument();
  });

  it("shows the head-to-head consensus on each desktop row", async () => {
    renderPage();
    await act(async () => {});
    expect(screen.getByLabelText("Sıralamada üstte görenler: 1 - 1")).toBeInTheDocument();
  });

  it("leaves the consensus bar off the mobile rows", async () => {
    mockUseIsMobile.mockReturnValue(true);
    renderPage();
    await act(async () => {});
    expect(screen.getByRole("tab", { name: /1\. Hafta/ })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Sıralamada üstte görenler/)).not.toBeInTheDocument();
  });

  it("opens on the round holding a live match", async () => {
    mockUseFixtures.mockReturnValue({
      fixtures: [
        fixture({ id: "md1-a", order: 1, status: "FINISHED", homeGoals: 1, awayGoals: 0 }),
        fixture({ id: "md2-a", matchday: 2, order: 3, status: "IN_PLAY", homeGoals: 0, awayGoals: 0, kickoffUtc: "2026-09-22T19:00:00.000Z" }),
      ],
      loading: false,
    });
    renderPage();
    await act(async () => {});
    expect(screen.getByRole("tab", { name: /2\. Hafta/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /1\. Hafta/ })).toHaveAttribute("aria-selected", "false");
  });

  it("gives a knockout round its own tab, named for the round", async () => {
    mockUseFixtures.mockReturnValue({
      fixtures: [...FIXTURES, fixture({ id: "qf", stage: "QUARTER_FINALS", matchday: null, order: 200 })],
      loading: false,
    });
    renderPage();
    await act(async () => {});
    expect(screen.getByRole("tab", { name: /Çeyrek Final/ })).toBeInTheDocument();
  });
});
