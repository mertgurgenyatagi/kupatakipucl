// src/pages/StatsPage.test.tsx
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { StatsPage } from "./StatsPage";
import { TEAMS } from "../predictions/teams";

const mockUseVisibilityState = vi.fn();
const mockUseLeaderboard = vi.fn();
const mockUseResults = vi.fn();
const mockUsePlayers = vi.fn();
const mockUseSurveyResponses = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
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
vi.mock("../predictions/useSurveyResponses", () => ({
  useSurveyResponses: () => mockUseSurveyResponses(),
}));

vi.mock("../stats/RankedStatList", () => ({
  RankedStatList: ({ label, rows }: { label: string; rows: unknown[] }) => (
    <div>{label}:{rows.length}</div>
  ),
}));
vi.mock("../stats/BarChartWidget", () => ({
  BarChartWidget: ({ label, bars }: { label: string; bars: unknown[] }) => (
    <div>{label}:{bars.length}</div>
  ),
}));
vi.mock("../stats/NumberBox", () => ({
  NumberBox: ({ label, value }: { label: string; value: number }) => (
    <div>{label}:{value}</div>
  ),
}));

const teamA = TEAMS[0].id;
const teamB = TEAMS[1].id;

describe("StatsPage", () => {
  beforeEach(() => {
    mockUseLeaderboard.mockReturnValue({
      entries: [
        { uid: "u1", firstName: "Ada", lastName: "Lovelace", photoURL: "", points: 10, ranking: [teamA, teamB] },
        { uid: "u2", firstName: "Alan", lastName: "Turing", photoURL: "", points: 8, ranking: [teamB, teamA] },
      ],
      loading: false,
    });
    mockUseResults.mockReturnValue({
      results: {
        [teamA]: { position: 1, points: 9, goalDifference: 5, goalsFor: 5, goalsAgainst: 0 },
        [teamB]: { position: 2, points: 6, goalDifference: 2, goalsFor: 4, goalsAgainst: 2 },
      },
      loading: false,
    });
    mockUsePlayers.mockReturnValue({
      players: [
        { uid: "u1", firstName: "Ada", lastName: "Lovelace", photoURL: "", createdAt: 1 },
        { uid: "u2", firstName: "Alan", lastName: "Turing", photoURL: "", createdAt: 2 },
        { uid: "u3", firstName: "Grace", lastName: "Hopper", photoURL: "", createdAt: 3 },
      ],
      loading: false,
    });
    mockUseSurveyResponses.mockReturnValue({
      responses: [
        { uid: "u1", age: 22, footballKnowledge: 5, messiOrRonaldo: "messi", superLigTeam: "Galatasaray", uclTeam: null, device: "both", submittedAt: 1 },
        { uid: "u2", age: 30, footballKnowledge: 3, messiOrRonaldo: "ronaldo", superLigTeam: "Fenerbahçe", uclTeam: "Arsenal", device: "phone", submittedAt: 2 },
      ],
      loading: false,
    });
  });

  it("blocks a page-not-allowed state, including logged-out visitors after the tournament has started (ST_NLI)", () => {
    mockUseVisibilityState.mockReturnValue("NST_NLI");
    const { rerender } = render(<StatsPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();

    mockUseVisibilityState.mockReturnValue("ST_NLI");
    rerender(<StatsPage />);
    expect(screen.getByText("This section isn't available right now.")).toBeInTheDocument();
  });

  it("renders nothing while any data source is still loading", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    mockUsePlayers.mockReturnValue({ players: [], loading: true });
    const { container } = render(<StatsPage />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders all 7 tournament-stat widgets and 6 participant-stat widgets with computed data once loaded", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    render(<StatsPage />);

    // Left: 3 existing dummy widgets, always 3 rows each.
    expect(screen.getByText("En İyiler:3")).toBeInTheDocument();
    expect(screen.getByText("Gol Krallığı:3")).toBeInTheDocument();
    expect(screen.getByText("Asist Krallığı:3")).toBeInTheDocument();
    // Left: the 4 new team-based widgets. Both fixture teams have results
    // and are ranked by both participants, so every one of these resolves
    // to the same 2 teams (teamBias.test.ts/teamAgreement.test.ts cover the
    // actual sort/split correctness — this just checks the page wires the
    // right computed data into the right widget).
    expect(screen.getByText("Beklenti Üstü:2")).toBeInTheDocument();
    expect(screen.getByText("Beklenti Altı:2")).toBeInTheDocument();
    expect(screen.getByText("Hemfikir Olunanlar:2")).toBeInTheDocument();
    expect(screen.getByText("Tartışmalı Takımlar:2")).toBeInTheDocument();

    // Right: straight number box counts every signed-up profile, not just predictors.
    expect(screen.getByText("Katılımcı Sayısı:3")).toBeInTheDocument();
    // Right: age/knowledge/messi-ronaldo always show every fixed bucket/level/option.
    expect(screen.getByText("Yaş:5")).toBeInTheDocument();
    expect(screen.getByText("Futbol Bilgisi:7")).toBeInTheDocument();
    expect(screen.getByText("Messi mi Ronaldo mu?:3")).toBeInTheDocument();
    // Right: Süper Lig only shows the 2 teams actually picked (zero-vote omitted).
    expect(screen.getByText("Süper Lig Takımı:2")).toBeInTheDocument();
    // Right: UCL is placeholder data — constant regardless of responses.
    expect(screen.getByText("UCL Takımı:5")).toBeInTheDocument();
    // Third section: the same hero carousel as the leaderboard page, minus its drawer.
    expect(screen.getAllByTestId("hero-image").length).toBeGreaterThan(0);
  });
});
