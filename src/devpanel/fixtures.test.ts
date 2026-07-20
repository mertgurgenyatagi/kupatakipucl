import { describe, it, expect } from "vitest";
import { FIXTURES } from "./fixtures";
import { TEAMS } from "../predictions/teams";

describe("FIXTURES", () => {
  it("has exactly 144 matches (8 matchdays x 18 matches)", () => {
    expect(FIXTURES).toHaveLength(144);
  });

  it("has exactly 18 matches per matchday, matchdays 1-8", () => {
    for (let md = 1; md <= 8; md++) {
      expect(FIXTURES.filter((f) => f.matchday === md)).toHaveLength(18);
    }
  });

  it("has unique, sequential order values from 1 to 144", () => {
    const orders = FIXTURES.map((f) => f.order).sort((a, b) => a - b);
    expect(orders).toEqual(Array.from({ length: 144 }, (_, i) => i + 1));
  });

  it("has unique ids", () => {
    const ids = FIXTURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("references only valid, existing team ids", () => {
    const validIds = new Set(TEAMS.map((t) => t.id));
    FIXTURES.forEach((f) => {
      expect(validIds.has(f.homeTeamId)).toBe(true);
      expect(validIds.has(f.awayTeamId)).toBe(true);
    });
  });

  it("never has a team play itself", () => {
    FIXTURES.forEach((f) => {
      expect(f.homeTeamId).not.toBe(f.awayTeamId);
    });
  });

  it("has every team playing exactly 8 matches total", () => {
    const appearances = new Map<string, number>();
    FIXTURES.forEach((f) => {
      appearances.set(f.homeTeamId, (appearances.get(f.homeTeamId) ?? 0) + 1);
      appearances.set(f.awayTeamId, (appearances.get(f.awayTeamId) ?? 0) + 1);
    });
    TEAMS.forEach((team) => {
      expect(appearances.get(team.id)).toBe(8);
    });
  });

  it("has no team playing the same opponent twice", () => {
    const pairingsByTeam = new Map<string, Set<string>>();
    FIXTURES.forEach((f) => {
      for (const [team, opponent] of [
        [f.homeTeamId, f.awayTeamId],
        [f.awayTeamId, f.homeTeamId],
      ]) {
        const set = pairingsByTeam.get(team) ?? new Set<string>();
        expect(set.has(opponent)).toBe(false);
        set.add(opponent);
        pairingsByTeam.set(team, set);
      }
    });
  });

  it("has all kickoff times as valid, parseable UTC ISO timestamps", () => {
    FIXTURES.forEach((f) => {
      const parsed = new Date(f.kickoffUtc);
      expect(Number.isNaN(parsed.getTime())).toBe(false);
      expect(f.kickoffUtc.endsWith("Z")).toBe(true);
    });
  });

  it("keeps matchdays in chronological order overall", () => {
    for (let i = 1; i < FIXTURES.length; i++) {
      const prevMd = FIXTURES[i - 1].matchday;
      const currMd = FIXTURES[i].matchday;
      expect(currMd).toBeGreaterThanOrEqual(prevMd);
    }
  });
});
