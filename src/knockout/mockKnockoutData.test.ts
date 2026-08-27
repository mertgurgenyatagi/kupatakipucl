import { describe, it, expect } from "vitest";
import { MOCK_ROUND_OF_16 } from "./mockKnockoutData";
import { TEAMS } from "../predictions/teams";

/**
 * The Round of 16 is invented (PROJECT.md §11 problem 23), but it still has
 * to be *coherent*, and nothing checked that before: the 2026-08-27 team-list
 * swap left four of these pairings naming clubs that no longer exist, which
 * no test caught, because the whole file was only ever read by UI.
 */
describe("MOCK_ROUND_OF_16", () => {
  it("has 8 ties", () => {
    expect(MOCK_ROUND_OF_16).toHaveLength(8);
  });

  it("references only teams that exist", () => {
    const valid = new Set(TEAMS.map((t) => t.id));
    const unknown = MOCK_ROUND_OF_16.flatMap((m) =>
      [m.homeTeamId, m.awayTeamId].filter((id) => !valid.has(id)),
    );
    expect(unknown).toEqual([]);
  });

  it("uses 16 distinct teams — nobody plays twice or plays themselves", () => {
    const ids = MOCK_ROUND_OF_16.flatMap((m) => [m.homeTeamId, m.awayTeamId]);
    expect(new Set(ids).size).toBe(16);
  });

  it("has unique matchup ids", () => {
    const ids = MOCK_ROUND_OF_16.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
