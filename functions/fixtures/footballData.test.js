import { describe, it, expect } from "vitest";
import { mapStandingsToResults, mapMatchesToFixtures } from "./footballData.js";

const row = (id, overrides = {}) => ({
  position: 1,
  points: 0,
  goalDifference: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  playedGames: 0,
  team: { id, name: `Team ${id}` },
  ...overrides,
});

describe("mapStandingsToResults", () => {
  it("re-keys by team slug and renames playedGames to matchesPlayed", () => {
    const results = mapStandingsToResults([
      row(57, { position: 1, points: 9, goalDifference: 4, goalsFor: 6, goalsAgainst: 2, playedGames: 3 }),
    ]);

    expect(results).toEqual({
      arsenal: { position: 1, points: 9, goalDifference: 4, goalsFor: 6, goalsAgainst: 2, matchesPlayed: 3 },
    });
  });

  it("throws on an unmapped football-data.org team id rather than dropping it silently", () => {
    expect(() => mapStandingsToResults([row(999999)])).toThrow(/No team-id mapping/);
  });

  it("maps all 36 real teams with no collisions", () => {
    // Same 36 ids fetched live from /v4/competitions/CL/standings on 2026-09-07.
    const ids = [
      1899, 57, 58, 78, 81, 5, 5721, 4, 851, 7397, 613, 675, 610, 108, 2016, 546,
      521, 64, 65, 66, 113, 524, 503, 674, 721, 90, 86, 100, 10233, 1887, 930,
      7509, 498, 10, 5720, 94,
    ];
    const results = mapStandingsToResults(ids.map((id) => row(id)));
    expect(Object.keys(results)).toHaveLength(36);
  });
});

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
