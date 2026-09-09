import { describe, it, expect } from "vitest";
import { isPersonalPicksViewer, getPersonalPickResult, PERSONAL_PICKS } from "./personalPicks";
import { RealFixture } from "./realFixtureTypes";

function fixture(overrides: Partial<RealFixture> = {}): RealFixture {
  return {
    id: "f1",
    matchday: 1,
    order: 1,
    homeTeamId: "atletico-madrid",
    awayTeamId: "viking",
    kickoffUtc: "2026-09-16T19:00:00Z",
    status: "TIMED",
    homeGoals: null,
    awayGoals: null,
    ...overrides,
  };
}

describe("isPersonalPicksViewer", () => {
  it("is true only for Mert's email", () => {
    expect(isPersonalPicksViewer("thisisfootballstuff@gmail.com")).toBe(true);
  });

  it.each([null, undefined, "someone-else@gmail.com", ""])("is false for %s", (email) => {
    expect(isPersonalPicksViewer(email)).toBe(false);
  });
});

describe("getPersonalPickResult", () => {
  // atletico-madrid:viking is picked "home" in PERSONAL_PICKS.
  it("is null when the match isn't decided yet", () => {
    expect(getPersonalPickResult(fixture({ homeGoals: null, awayGoals: null }))).toBeNull();
  });

  it("is correct when the pick matches the actual result", () => {
    expect(getPersonalPickResult(fixture({ homeGoals: 2, awayGoals: 0 }))).toBe("correct");
  });

  it("is incorrect when the pick doesn't match", () => {
    expect(getPersonalPickResult(fixture({ homeGoals: 0, awayGoals: 1 }))).toBe("incorrect");
  });

  it("is incorrect when the actual result is a draw but a side was picked", () => {
    expect(getPersonalPickResult(fixture({ homeGoals: 1, awayGoals: 1 }))).toBe("incorrect");
  });

  it("is null for a decided fixture with no recorded pick (e.g. a knockout tie)", () => {
    const knockout = fixture({ homeTeamId: "arsenal", awayTeamId: "atletico-madrid", homeGoals: 1, awayGoals: 0 });
    expect(getPersonalPickResult(knockout)).toBeNull();
  });

  it("covers all 144 league-phase pairings", () => {
    expect(Object.keys(PERSONAL_PICKS)).toHaveLength(144);
  });
});
