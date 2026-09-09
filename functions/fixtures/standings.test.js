import { describe, it, expect } from "vitest";
import { computeStandingsTable } from "./standings.js";

function fixture(overrides = {}) {
  return {
    id: "f1",
    matchday: 1,
    stage: "LEAGUE_STAGE",
    order: 1,
    homeTeamId: "a",
    awayTeamId: "b",
    kickoffUtc: "2026-09-08T16:45:00Z",
    status: "TIMED",
    homeGoals: null,
    awayGoals: null,
    ...overrides,
  };
}

const OPTA_ABCD = ["a", "b", "c", "d"]; // a best, d worst

describe("computeStandingsTable", () => {
  it("orders every team by the Opta prediction when nobody has played yet", () => {
    const fixtures = [
      fixture({ id: "f1", homeTeamId: "d", awayTeamId: "c" }),
      fixture({ id: "f2", homeTeamId: "b", awayTeamId: "a" }),
    ];
    const results = computeStandingsTable(fixtures, OPTA_ABCD);
    expect(results.a.position).toBe(1);
    expect(results.b.position).toBe(2);
    expect(results.c.position).toBe(3);
    expect(results.d.position).toBe(4);
    Object.values(results).forEach((r) => expect(r.matchesPlayed).toBe(0));
  });

  it("sorts by points first", () => {
    const fixtures = [fixture({ id: "f1", homeTeamId: "b", awayTeamId: "a", homeGoals: 1, awayGoals: 0 })];
    const results = computeStandingsTable(fixtures, OPTA_ABCD);
    expect(results.b.position).toBe(1);
    expect(results.a.position).toBe(2);
    expect(results.b.points).toBe(3);
    expect(results.a.points).toBe(0);
  });

  it("breaks a points tie on goal difference", () => {
    const fixtures = [
      fixture({ id: "f1", homeTeamId: "a", awayTeamId: "c", homeGoals: 3, awayGoals: 0 }),
      fixture({ id: "f2", homeTeamId: "b", awayTeamId: "d", homeGoals: 1, awayGoals: 0 }),
    ];
    // Both a and b have 3 points; a has GD +3, b has GD +1.
    const results = computeStandingsTable(fixtures, OPTA_ABCD);
    expect(results.a.position).toBe(1);
    expect(results.b.position).toBe(2);
  });

  it("breaks a goal-difference tie on total goals scored", () => {
    const fixtures = [
      fixture({ id: "f1", homeTeamId: "a", awayTeamId: "c", homeGoals: 3, awayGoals: 1 }), // GD +2, GF 3
      fixture({ id: "f2", homeTeamId: "b", awayTeamId: "d", homeGoals: 2, awayGoals: 0 }), // GD +2, GF 2
    ];
    const results = computeStandingsTable(fixtures, OPTA_ABCD);
    expect(results.a.position).toBe(1);
    expect(results.b.position).toBe(2);
  });

  it("breaks a goals-scored tie on away goals scored", () => {
    const fixtures = [
      // a scores its 2 goals away; b scores its 2 goals at home. Same
      // points/GD/goals-for, a should rank above b.
      fixture({ id: "f1", homeTeamId: "c", awayTeamId: "a", homeGoals: 0, awayGoals: 2 }),
      fixture({ id: "f2", homeTeamId: "b", awayTeamId: "d", homeGoals: 2, awayGoals: 0 }),
    ];
    const results = computeStandingsTable(fixtures, OPTA_ABCD);
    expect(results.a.position).toBe(1);
    expect(results.b.position).toBe(2);
  });

  it("breaks an away-goals tie on total wins", () => {
    // a: 2 wins (home 2-1, away 1-0) -> pts6, GD+2, GF3, awayGoals1, wins2.
    // b: 1 win + 3 draws (home 2-0, away 1-1, home 0-0, home 0-0) -> same
    // pts6/GD+2/GF3/awayGoals1, but only 1 win.
    const fixtures = [
      fixture({ id: "a1", homeTeamId: "a", awayTeamId: "x", homeGoals: 2, awayGoals: 1 }),
      fixture({ id: "a2", homeTeamId: "y", awayTeamId: "a", homeGoals: 0, awayGoals: 1 }),
      fixture({ id: "b1", homeTeamId: "b", awayTeamId: "x", homeGoals: 2, awayGoals: 0 }),
      fixture({ id: "b2", homeTeamId: "y", awayTeamId: "b", homeGoals: 1, awayGoals: 1 }),
      fixture({ id: "b3", homeTeamId: "b", awayTeamId: "z", homeGoals: 0, awayGoals: 0 }),
      fixture({ id: "b4", homeTeamId: "w", awayTeamId: "b", homeGoals: 0, awayGoals: 0 }),
    ];
    const results = computeStandingsTable(fixtures, ["a", "b", "w", "x", "y", "z"]);
    expect(results.a.points).toBe(results.b.points);
    expect(results.a.goalDifference).toBe(results.b.goalDifference);
    expect(results.a.goalsFor).toBe(results.b.goalsFor);
    expect(results.a.position).toBeLessThan(results.b.position);
  });

  it("breaks a wins tie on away wins", () => {
    // a: away win 1-0 + home draw 1-1 -> pts4, GD+1, GF2, awayGoals1, wins1, awayWins1.
    // b: home win 1-0 + away draw 1-1 -> same pts/GD/GF/awayGoals/wins, but awayWins0.
    const fixtures = [
      fixture({ id: "a1", homeTeamId: "x", awayTeamId: "a", homeGoals: 0, awayGoals: 1 }),
      fixture({ id: "a2", homeTeamId: "a", awayTeamId: "y", homeGoals: 1, awayGoals: 1 }),
      fixture({ id: "b1", homeTeamId: "b", awayTeamId: "z", homeGoals: 1, awayGoals: 0 }),
      fixture({ id: "b2", homeTeamId: "w", awayTeamId: "b", homeGoals: 1, awayGoals: 1 }),
    ];
    const results = computeStandingsTable(fixtures, ["a", "b", "w", "x", "y", "z"]);
    expect(results.a.points).toBe(results.b.points);
    expect(results.a.goalDifference).toBe(results.b.goalDifference);
    expect(results.a.goalsFor).toBe(results.b.goalsFor);
    expect(results.a.position).toBeLessThan(results.b.position);
  });

  it("falls back to alphabetical order for a genuine mid-season tie on all five criteria", () => {
    // z and y both drew 1-1 — identical stats, both have played.
    const fixtures = [fixture({ id: "f1", homeTeamId: "z", awayTeamId: "y", homeGoals: 1, awayGoals: 1 })];
    const results = computeStandingsTable(fixtures, ["y", "z"]);
    expect(results.y.position).toBe(1);
    expect(results.z.position).toBe(2);
  });

  it("does not apply opponent-strength or Opta tiebreaks before Matchday 8 completes", () => {
    const fixtures = [fixture({ id: "f1", matchday: 7, homeTeamId: "z", awayTeamId: "y", homeGoals: 1, awayGoals: 1 })];
    const results = computeStandingsTable(fixtures, ["y", "z"]);
    // No matchday-8 fixtures at all -> phase not complete -> alphabetical, not Opta.
    expect(results.y.position).toBe(1);
    expect(results.z.position).toBe(2);
  });

  it("once Matchday 8 completes, breaks a tie on opponents' collective points", () => {
    // a and b are tied on the first five criteria (both drew 0-0 once).
    // a's opponent (x) has 3 points from beating w; b's opponent (y) has 0.
    const fixtures = [
      fixture({ id: "m8-1", matchday: 8, homeTeamId: "a", awayTeamId: "x", homeGoals: 0, awayGoals: 0 }),
      fixture({ id: "m8-2", matchday: 8, homeTeamId: "b", awayTeamId: "y", homeGoals: 0, awayGoals: 0 }),
      fixture({ id: "other", matchday: 3, homeTeamId: "x", awayTeamId: "w", homeGoals: 1, awayGoals: 0 }),
    ];
    const results = computeStandingsTable(fixtures, ["a", "b", "w", "x", "y"]);
    expect(results.a.points).toBe(results.b.points);
    expect(results.a.goalDifference).toBe(results.b.goalDifference);
    expect(results.a.position).toBeLessThan(results.b.position);
  });

  it("once Matchday 8 completes, a tie surviving every real criterion falls back to Opta order", () => {
    const fixtures = [fixture({ id: "m8-1", matchday: 8, homeTeamId: "a", awayTeamId: "b", homeGoals: 0, awayGoals: 0 })];
    const results = computeStandingsTable(fixtures, ["b", "a"]); // b ranked ahead of a by Opta
    expect(results.b.position).toBe(1);
    expect(results.a.position).toBe(2);
  });

  it("throws when the Opta ranking doesn't cover every team in the fixture list", () => {
    const fixtures = [fixture({ id: "f1", homeTeamId: "a", awayTeamId: "b" })];
    expect(() => computeStandingsTable(fixtures, ["a"])).toThrow(/missing team/);
  });

  it("ignores knockout fixtures entirely — they never touch the league table", () => {
    const fixtures = [
      fixture({ id: "lg", homeTeamId: "a", awayTeamId: "b", homeGoals: 1, awayGoals: 0 }),
      fixture({
        id: "ko",
        stage: "QUARTER_FINALS",
        matchday: null,
        homeTeamId: "b",
        awayTeamId: "a",
        homeGoals: 5,
        awayGoals: 0,
      }),
    ];
    const results = computeStandingsTable(fixtures, ["a", "b"]);
    // Without the LEAGUE_STAGE filter b's 5-0 would put it top on goal difference.
    expect(results.a.position).toBe(1);
    expect(results.a.points).toBe(3);
    expect(results.b.points).toBe(0);
    expect(results.a.matchesPlayed).toBe(1);
    expect(results.b.matchesPlayed).toBe(1);
  });

  it("only counts decided fixtures toward matchesPlayed", () => {
    const fixtures = [
      fixture({ id: "f1", homeTeamId: "a", awayTeamId: "b", homeGoals: null, awayGoals: null }),
      fixture({ id: "f2", homeTeamId: "a", awayTeamId: "b", homeGoals: 1, awayGoals: 1 }),
    ];
    const results = computeStandingsTable(fixtures, ["a", "b"]);
    expect(results.a.matchesPlayed).toBe(1);
    expect(results.b.matchesPlayed).toBe(1);
  });
});
