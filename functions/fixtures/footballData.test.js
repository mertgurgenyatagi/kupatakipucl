import { describe, it, expect } from "vitest";
import { mapMatchesToFixtures } from "./footballData.js";

const match = (overrides = {}) => ({
  id: 1,
  matchday: 1,
  stage: "LEAGUE_STAGE",
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
      stage: "LEAGUE_STAGE",
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

  it("carries a knockout stage through with a null matchday", () => {
    const [fixture] = mapMatchesToFixtures([match({ stage: "QUARTER_FINALS", matchday: null })]);
    expect(fixture.stage).toBe("QUARTER_FINALS");
    expect(fixture.matchday).toBeNull();
  });

  it("skips an undrawn knockout fixture instead of throwing, and keeps `order` contiguous", () => {
    const fixtures = mapMatchesToFixtures([
      match({ id: 1, utcDate: "2027-03-10T20:00:00Z" }),
      match({ id: 2, stage: "LAST_16", matchday: null, homeTeam: {}, awayTeam: {}, utcDate: "2027-03-11T20:00:00Z" }),
      match({ id: 3, utcDate: "2027-03-12T20:00:00Z" }),
    ]);
    expect(fixtures.map((f) => f.id)).toEqual(["1", "3"]);
    expect(fixtures.map((f) => f.order)).toEqual([1, 2]);
  });
});
