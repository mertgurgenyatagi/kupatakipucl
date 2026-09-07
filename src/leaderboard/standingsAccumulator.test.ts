import { describe, it, expect } from "vitest";
import { computeStandingsFromMatches, StandingsFixture } from "./standingsAccumulator";
import { TEAMS } from "../predictions/teams";

const [teamA, teamB, teamC] = TEAMS;
const fixture = (id: string, homeTeamId: string, awayTeamId: string): StandingsFixture => ({
  id,
  homeTeamId,
  awayTeamId,
});

describe("computeStandingsFromMatches", () => {
  it("gives every team position 1-36 with 0 points when no match has a score", () => {
    const results = computeStandingsFromMatches([fixture("f1", teamA.id, teamB.id)], {});
    const positions = TEAMS.map((t) => results[t.id].position).sort((a, b) => a - b);
    expect(positions).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
    expect(results[teamA.id].points).toBe(0);
  });

  it("computes points and real goal difference from actual scorelines, not a fixed margin", () => {
    const results = computeStandingsFromMatches([fixture("f1", teamA.id, teamB.id)], {
      f1: { homeGoals: 4, awayGoals: 1 },
    });
    expect(results[teamA.id].points).toBe(3);
    expect(results[teamA.id].goalDifference).toBe(3);
    expect(results[teamA.id].goalsFor).toBe(4);
    expect(results[teamA.id].goalsAgainst).toBe(1);
    expect(results[teamB.id].points).toBe(0);
    expect(results[teamB.id].goalDifference).toBe(-3);
  });

  it("splits points evenly on a draw regardless of the actual scoreline", () => {
    const results = computeStandingsFromMatches([fixture("f1", teamA.id, teamB.id)], {
      f1: { homeGoals: 2, awayGoals: 2 },
    });
    expect(results[teamA.id].points).toBe(1);
    expect(results[teamB.id].points).toBe(1);
    expect(results[teamA.id].goalDifference).toBe(0);
  });

  it("ignores a fixture missing from matchGoals, same as not yet played", () => {
    const results = computeStandingsFromMatches(
      [fixture("f1", teamA.id, teamB.id), fixture("f2", teamB.id, teamC.id)],
      { f1: { homeGoals: 1, awayGoals: 0 } }
    );
    expect(results[teamB.id].matchesPlayed).toBe(1);
    expect(results[teamC.id].matchesPlayed).toBe(0);
  });

  it("breaks a points tie by goal difference, then goals scored, then team name", () => {
    const results = computeStandingsFromMatches(
      [fixture("f1", teamA.id, teamB.id), fixture("f2", teamC.id, teamB.id)],
      {
        f1: { homeGoals: 3, awayGoals: 0 },
        f2: { homeGoals: 1, awayGoals: 0 },
      }
    );
    // Both teamA and teamC have 3 points from a win; teamA's bigger margin
    // (and higher goalsFor) should rank it above teamC.
    expect(results[teamA.id].position).toBeLessThan(results[teamC.id].position);
  });
});
