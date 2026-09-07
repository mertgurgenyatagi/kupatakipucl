import { describe, it, expect } from "vitest";
import { isFixtureLive, getLiveTeamIds, hasAnyLiveFixture } from "./liveFixtures";
import { RealFixture } from "./realFixtureTypes";

function fixture(overrides: Partial<RealFixture> = {}): RealFixture {
  return {
    id: "f1",
    matchday: 1,
    order: 1,
    homeTeamId: "arsenal",
    awayTeamId: "barcelona",
    kickoffUtc: "2026-09-08T16:45:00Z",
    status: "TIMED",
    homeGoals: null,
    awayGoals: null,
    ...overrides,
  };
}

describe("isFixtureLive", () => {
  it.each(["IN_PLAY", "PAUSED"])("is true for status %s", (status) => {
    expect(isFixtureLive(fixture({ status }))).toBe(true);
  });

  it.each(["TIMED", "FINISHED", "POSTPONED", "SUSPENDED"])("is false for status %s", (status) => {
    expect(isFixtureLive(fixture({ status }))).toBe(false);
  });
});

describe("getLiveTeamIds", () => {
  it("includes both home and away teams of a live fixture", () => {
    const ids = getLiveTeamIds([fixture({ status: "IN_PLAY" })]);
    expect(ids.has("arsenal")).toBe(true);
    expect(ids.has("barcelona")).toBe(true);
  });

  it("excludes teams whose fixture isn't live", () => {
    const ids = getLiveTeamIds([fixture({ status: "FINISHED" })]);
    expect(ids.size).toBe(0);
  });

  it("collects teams across multiple live fixtures", () => {
    const ids = getLiveTeamIds([
      fixture({ id: "f1", homeTeamId: "arsenal", awayTeamId: "barcelona", status: "IN_PLAY" }),
      fixture({ id: "f2", homeTeamId: "liverpool", awayTeamId: "real-madrid", status: "PAUSED" }),
    ]);
    expect([...ids].sort()).toEqual(["arsenal", "barcelona", "liverpool", "real-madrid"]);
  });
});

describe("hasAnyLiveFixture", () => {
  it("is false when nothing is live", () => {
    expect(hasAnyLiveFixture([fixture({ status: "TIMED" }), fixture({ status: "FINISHED" })])).toBe(false);
  });

  it("is true when at least one fixture is live", () => {
    expect(hasAnyLiveFixture([fixture({ status: "TIMED" }), fixture({ status: "IN_PLAY" })])).toBe(true);
  });
});
