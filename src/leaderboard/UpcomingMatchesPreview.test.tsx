import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { UpcomingMatchesPreview } from "./UpcomingMatchesPreview";

// The "Tüm maçlar" link below the rows needs a router and the visibility
// state it gates itself on (AllMatchesLink.tsx). Signed-in league phase, so
// the link renders — the logged-out case has its own test below.
const mockUseVisibilityState = vi.fn(() => "loggedin_leaguephase");
vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

const fixture = (id: string, order: number, homeTeamId: string, awayTeamId: string) => ({
  id,
  matchday: 1,
  order,
  homeTeamId,
  awayTeamId,
  kickoffUtc: `2026-09-0${order}T16:45:00.000Z`,
  status: "TIMED",
  homeGoals: null,
  awayGoals: null,
});

vi.mock("./useFixtures", () => ({
  useFixtures: () => ({
    fixtures: [
      fixture("f1", 1, "arsenal", "barcelona"),
      fixture("f2", 2, "liverpool", "real-madrid"),
      fixture("f3", 3, "manchester-city", "bayern-munich"),
      fixture("f4", 4, "paris-saint-germain", "inter-milan"),
    ],
    loading: false,
  }),
}));

function renderPreview(props: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter>
      <UpcomingMatchesPreview results={{}} {...props} />
    </MemoryRouter>
  );
}

describe("UpcomingMatchesPreview", () => {
  it("renders exactly 3 fixture rows (each row = 1 wrapper + 2 team buttons)", () => {
    renderPreview();
    expect(screen.getAllByRole("button")).toHaveLength(9);
  });

  it("has no collapse/expand affordance anywhere", () => {
    renderPreview();
    expect(screen.queryByLabelText("Yaklaşan maçları göster")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Yaklaşan maçları kapat")).not.toBeInTheDocument();
  });

  it("clicking a team fires onSelectTeam with that team's id", () => {
    const onSelectTeam = vi.fn();
    renderPreview({ onSelectTeam });
    const [, firstTeamButton] = screen.getAllByRole("button");
    fireEvent.click(firstTeamButton);
    expect(onSelectTeam).toHaveBeenCalledTimes(1);
  });

  it("clicking a fixture row fires onSelectFixture with that fixture's id", () => {
    const onSelectFixture = vi.fn();
    renderPreview({ onSelectFixture });
    const [firstRowButton] = screen.getAllByRole("button");
    fireEvent.click(firstRowButton);
    expect(onSelectFixture).toHaveBeenCalledTimes(1);
  });

  it("links to the full matches page", () => {
    renderPreview();
    expect(screen.getByRole("link", { name: /Tüm maçlar/ })).toHaveAttribute("href", "/matches");
  });

  it("hides that link from a logged-out visitor, who can't open /matches", () => {
    mockUseVisibilityState.mockReturnValueOnce("loggedout_leaguephase");
    renderPreview();
    expect(screen.queryByRole("link", { name: /Tüm maçlar/ })).not.toBeInTheDocument();
  });
});
