import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LeaderboardHero } from "./LeaderboardHero";

vi.mock("./useFixtures", () => ({
  useFixtures: () => ({
    fixtures: [
      {
        id: "f1",
        matchday: 1,
        order: 1,
        homeTeamId: "arsenal",
        awayTeamId: "barcelona",
        kickoffUtc: "2026-09-08T16:45:00.000Z",
        status: "TIMED",
        homeGoals: null,
        awayGoals: null,
      },
    ],
    loading: false,
  }),
}));

describe("LeaderboardHero", () => {
  it("forwards onSelectFixture through to the embedded drawer", () => {
    const onSelectFixture = vi.fn();
    render(<LeaderboardHero results={{}} onSelectFixture={onSelectFixture} />);
    fireEvent.click(screen.getByRole("button", { name: "Yaklaşan maçları göster" }));
    const [, firstRowButton] = screen.getAllByRole("button");
    fireEvent.click(firstRowButton);
    expect(onSelectFixture).toHaveBeenCalledTimes(1);
  });
});
