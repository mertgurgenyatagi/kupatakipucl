import { describe, it, expect } from "vitest";
import { computeTeamBias } from "./teamBias";
import { TEAMS } from "../predictions/teams";
import { TeamResult } from "../leaderboard/teamResultTypes";

function result(position: number): TeamResult {
  return { position, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 };
}

const teamA = TEAMS[0].id;
const teamB = TEAMS[1].id;

describe("computeTeamBias", () => {
  it("computes a negative averageDifference when the team finished better than predicted (underrated)", () => {
    // predicted 5th (index 4), actual 1st -> 1 - 5 = -4
    const ranking = [TEAMS[1].id, TEAMS[2].id, TEAMS[3].id, TEAMS[4].id, teamA];
    const out = computeTeamBias([ranking], { [teamA]: result(1) });
    const entry = out.find((t) => t.teamId === teamA);
    expect(entry?.averageDifference).toBe(-4);
  });

  it("computes a positive averageDifference when the team finished worse than predicted (overrated)", () => {
    // predicted 1st (index 0), actual 5th -> 5 - 1 = 4
    const out = computeTeamBias([[teamA]], { [teamA]: result(5) });
    const entry = out.find((t) => t.teamId === teamA);
    expect(entry?.averageDifference).toBe(4);
  });

  it("averages across multiple predictions that ranked the team", () => {
    // Both predict teamA 1st (index 0), actual 3rd -> both give 3 - 1 = 2, average 2.
    const out = computeTeamBias([[teamA], [teamA]], { [teamA]: result(3) });
    const entry = out.find((t) => t.teamId === teamA);
    expect(entry?.averageDifference).toBe(2);
  });

  it("excludes a team with no result", () => {
    const out = computeTeamBias([[teamA]], {});
    expect(out.find((t) => t.teamId === teamA)).toBeUndefined();
  });

  it("excludes a team that has a result but was never ranked by anyone", () => {
    const out = computeTeamBias([[teamB]], { [teamA]: result(1) });
    expect(out.find((t) => t.teamId === teamA)).toBeUndefined();
  });

  it("sorts ascending by averageDifference (most-underrated first)", () => {
    const out = computeTeamBias([[teamA, teamB]], { [teamA]: result(10), [teamB]: result(1) });
    // teamA: predicted 1st, actual 10th -> +9 (overrated). teamB: predicted 2nd, actual 1st -> -1 (underrated).
    expect(out.map((t) => t.teamId)).toEqual([teamB, teamA]);
  });

  it("returns an empty array for no rankings and no results", () => {
    expect(computeTeamBias([], {})).toEqual([]);
  });
});
