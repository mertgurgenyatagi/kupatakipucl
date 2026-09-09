import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { LeaderboardHero } from "./LeaderboardHero";

// The drawer's footer "Tüm maçlar" link needs a router and the visibility
// state it gates itself on (AllMatchesLink.tsx).
vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => "loggedin_leaguephase",
}));

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
    render(
      <MemoryRouter>
        <LeaderboardHero results={{}} onSelectFixture={onSelectFixture} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: "Yaklaşan maçları göster" }));
    const [, firstRowButton] = screen.getAllByRole("button");
    fireEvent.click(firstRowButton);
    expect(onSelectFixture).toHaveBeenCalledTimes(1);
  });
});
