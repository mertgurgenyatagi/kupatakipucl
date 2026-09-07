import { describe, it, expect } from "vitest";
import { TEAM_ID_MAP } from "./teamIdMap.js";
import { TEAMS } from "../../src/predictions/teams";

describe("TEAM_ID_MAP", () => {
  it("maps exactly the 36 football-data.org ids fetched live on 2026-09-07", () => {
    expect(Object.keys(TEAM_ID_MAP)).toHaveLength(36);
  });

  it("covers every slug in teams.ts exactly once, and nothing else", () => {
    const mappedSlugs = Object.values(TEAM_ID_MAP);
    const teamSlugs = TEAMS.map((team) => team.id);

    expect(new Set(mappedSlugs).size).toBe(mappedSlugs.length);
    expect([...mappedSlugs].sort()).toEqual([...teamSlugs].sort());
  });
});
