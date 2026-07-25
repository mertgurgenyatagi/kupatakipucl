import { describe, it, expect } from "vitest";
import { buildScoringExampleWindow, pickFallbackTeam } from "./scoringExampleWindow";
import { Team } from "./teams";

const teams: Team[] = Array.from({ length: 10 }, (_, i) => ({
  id: `t${i}`,
  name: `Team ${i}`,
  shortName: `T${i}`,
}));

describe("buildScoringExampleWindow", () => {
  it("centers a 7-team window on the given team when there's room either side", () => {
    const result = buildScoringExampleWindow(teams, "t5");
    expect(result.teams.map((t) => t.id)).toEqual(["t2", "t3", "t4", "t5", "t6", "t7", "t8"]);
    expect(result.centerIndex).toBe(3);
  });

  it("clamps the window at the start of the list, shifting the center instead", () => {
    const result = buildScoringExampleWindow(teams, "t0");
    expect(result.teams.map((t) => t.id)).toEqual(["t0", "t1", "t2", "t3", "t4", "t5", "t6"]);
    expect(result.centerIndex).toBe(0);
  });

  it("clamps the window at the end of the list, shifting the center instead", () => {
    const result = buildScoringExampleWindow(teams, "t9");
    expect(result.teams.map((t) => t.id)).toEqual(["t3", "t4", "t5", "t6", "t7", "t8", "t9"]);
    expect(result.centerIndex).toBe(6);
  });

  it("falls back to the first 7 teams if the id doesn't match anything", () => {
    const result = buildScoringExampleWindow(teams, "does-not-exist");
    expect(result.teams).toHaveLength(7);
    expect(result.centerIndex).toBe(0);
  });
});

describe("pickFallbackTeam", () => {
  it("deterministically picks the same team for the same uid", () => {
    const first = pickFallbackTeam(teams, "uid-123");
    const second = pickFallbackTeam(teams, "uid-123");
    expect(first).toEqual(second);
  });

  it("picks a team that's actually in the list", () => {
    const picked = pickFallbackTeam(teams, "some-uid");
    expect(teams).toContainEqual(picked);
  });
});
