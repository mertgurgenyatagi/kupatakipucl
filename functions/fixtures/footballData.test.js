import { describe, it, expect } from "vitest";
import { mapMatchesToFixtures } from "./footballData.js";

const match = (overrides = {}) => ({
  id: 1,
  matchday: 1,
  utcDate: "2026-09-08T16:45:00Z",
  status: "TIMED",
  homeTeam: { id: 57 },
  awayTeam: { id: 58 },
  score: { fullTime: { home: null, away: null } },
  ...overrides,
});

describe("mapMatchesToFixtures", () => {
  it("re-keys teams by slug and carries status/goals through", () => {
    const [fixture] = mapMatchesToFixtures([
      match({ id: 42, status: "FINISHED", score: { fullTime: { home: 2, away: 1 } } }),
    ]);
    expect(fixture).toEqual({
      id: "42",
      matchday: 1,
      order: 1,
      homeTeamId: "arsenal",
      awayTeamId: "aston-villa",
      kickoffUtc: "2026-09-08T16:45:00Z",
      status: "FINISHED",
      homeGoals: 2,
      awayGoals: 1,
    });
  });

  it("treats a not-yet-played match's null score as null goals, not zero", () => {
    const [fixture] = mapMatchesToFixtures([match()]);
    expect(fixture.homeGoals).toBeNull();
    expect(fixture.awayGoals).toBeNull();
  });

  it("orders strictly by kickoff time, ties broken by match id, regardless of input order", () => {
    const early = match({ id: 2, utcDate: "2026-09-08T16:45:00Z" });
    const late = match({ id: 1, utcDate: "2026-09-09T16:45:00Z" });
    const fixtures = mapMatchesToFixtures([late, early]);
    expect(fixtures.map((f) => f.id)).toEqual(["2", "1"]);
    expect(fixtures.map((f) => f.order)).toEqual([1, 2]);
  });

  it("throws on an unmapped football-data.org team id rather than dropping it silently", () => {
    expect(() => mapMatchesToFixtures([match({ homeTeam: { id: 999999 } })])).toThrow(/No team-id mapping/);
  });
});
