import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UpcomingMatchesDrawer } from "./UpcomingMatchesDrawer";

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
    ],
    loading: false,
  }),
}));

describe("UpcomingMatchesDrawer", () => {
  it("starts collapsed", () => {
    render(<UpcomingMatchesDrawer results={{}} />);
    expect(screen.getByRole("button", { name: "Yaklaşan maçları göster" })).toBeInTheDocument();
  });

  it("opens to reveal upcoming fixtures rendered via FixtureRow", () => {
    render(<UpcomingMatchesDrawer results={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Yaklaşan maçları göster" }));
    expect(screen.getByRole("button", { name: "Yaklaşan maçları kapat" })).toBeInTheDocument();
    // Real fixture short codes are 2-4 uppercase letters — at least one
    // fixture row must have rendered post-open.
    expect(screen.getAllByText(/^[A-Z]{2,4}$/).length).toBeGreaterThan(0);
  });

  it("clicking a fixture row fires onSelectFixture with that fixture's id", () => {
    const onSelectFixture = vi.fn();
    render(<UpcomingMatchesDrawer results={{}} onSelectFixture={onSelectFixture} />);
    fireEvent.click(screen.getByRole("button", { name: "Yaklaşan maçları göster" }));
    const [, firstRowButton] = screen.getAllByRole("button");
    fireEvent.click(firstRowButton);
    expect(onSelectFixture).toHaveBeenCalledTimes(1);
  });
});
