import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UpcomingMatchesPreview } from "./UpcomingMatchesPreview";

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

describe("UpcomingMatchesPreview", () => {
  it("renders exactly 3 fixture rows (each row = 1 wrapper + 2 team buttons)", () => {
    render(<UpcomingMatchesPreview results={{}} />);
    expect(screen.getAllByRole("button")).toHaveLength(9);
  });

  it("has no collapse/expand affordance anywhere", () => {
    render(<UpcomingMatchesPreview results={{}} />);
    expect(screen.queryByLabelText("Yaklaşan maçları göster")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Yaklaşan maçları kapat")).not.toBeInTheDocument();
  });

  it("clicking a team fires onSelectTeam with that team's id", () => {
    const onSelectTeam = vi.fn();
    render(<UpcomingMatchesPreview results={{}} onSelectTeam={onSelectTeam} />);
    const [, firstTeamButton] = screen.getAllByRole("button");
    fireEvent.click(firstTeamButton);
    expect(onSelectTeam).toHaveBeenCalledTimes(1);
  });

  it("clicking a fixture row fires onSelectFixture with that fixture's id", () => {
    const onSelectFixture = vi.fn();
    render(<UpcomingMatchesPreview results={{}} onSelectFixture={onSelectFixture} />);
    const [firstRowButton] = screen.getAllByRole("button");
    fireEvent.click(firstRowButton);
    expect(onSelectFixture).toHaveBeenCalledTimes(1);
  });
});
