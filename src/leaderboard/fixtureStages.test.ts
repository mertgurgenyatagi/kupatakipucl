import { describe, it, expect } from "vitest";
import { RealFixture } from "./realFixtureTypes";
import { buildStageTabs, defaultStageKey, getLeagueFixtures, groupFixturesByDay } from "./fixtureStages";

function fixture(overrides: Partial<RealFixture> = {}): RealFixture {
  return {
    id: "f1",
    matchday: 1,
    stage: "LEAGUE_STAGE",
    order: 1,
    homeTeamId: "arsenal",
    awayTeamId: "barcelona",
    kickoffUtc: "2026-09-16T16:45:00.000Z",
    status: "TIMED",
    homeGoals: null,
    awayGoals: null,
    ...overrides,
  };
}

describe("getLeagueFixtures", () => {
  it("keeps league-phase fixtures and drops knockout ones", () => {
    const league = fixture({ id: "lg" });
    const knockout = fixture({ id: "ko", stage: "QUARTER_FINALS", matchday: null });
    expect(getLeagueFixtures([league, knockout]).map((f) => f.id)).toEqual(["lg"]);
  });

  it("treats a fixture synced before `stage` existed as league-phase", () => {
    const legacy = fixture({ id: "old", stage: undefined });
    expect(getLeagueFixtures([legacy]).map((f) => f.id)).toEqual(["old"]);
  });
});

describe("buildStageTabs", () => {
  it("makes one tab per matchday, labelled in Turkish, in chronological order", () => {
    const tabs = buildStageTabs([
      fixture({ id: "b", matchday: 2, order: 3 }),
      fixture({ id: "a", matchday: 1, order: 1 }),
      fixture({ id: "c", matchday: 1, order: 2 }),
    ]);
    expect(tabs.map((t) => t.key)).toEqual(["md-1", "md-2"]);
    expect(tabs.map((t) => t.label)).toEqual(["1. Hafta", "2. Hafta"]);
    expect(tabs[0].fixtures.map((f) => f.id)).toEqual(["a", "c"]);
  });

  it("adds knockout tabs after the league phase, with their real round names", () => {
    const tabs = buildStageTabs([
      fixture({ id: "md8", matchday: 8, order: 144 }),
      fixture({ id: "qf", stage: "QUARTER_FINALS", matchday: null, order: 170 }),
      fixture({ id: "po", stage: "PLAYOFFS", matchday: null, order: 150 }),
    ]);
    expect(tabs.map((t) => t.key)).toEqual(["md-8", "PLAYOFFS", "QUARTER_FINALS"]);
    expect(tabs.map((t) => t.label)).toEqual(["8. Hafta", "Play-Off", "Çeyrek Final"]);
  });

  it("falls back to the raw stage string for a round it doesn't have a label for", () => {
    const tabs = buildStageTabs([fixture({ stage: "THIRD_PLACE", matchday: null })]);
    expect(tabs[0].label).toBe("THIRD_PLACE");
  });

  it("returns no tabs at all for an empty fixture list", () => {
    expect(buildStageTabs([])).toEqual([]);
  });
});

describe("defaultStageKey", () => {
  it("prefers the round holding a live match over everything else", () => {
    const tabs = buildStageTabs([
      fixture({ id: "a", matchday: 1, order: 1, status: "FINISHED", homeGoals: 1, awayGoals: 0 }),
      fixture({ id: "b", matchday: 2, order: 2, status: "IN_PLAY", homeGoals: 0, awayGoals: 0 }),
      fixture({ id: "c", matchday: 3, order: 3, status: "TIMED" }),
    ]);
    expect(defaultStageKey(tabs)).toBe("md-2");
  });

  it("otherwise picks the earliest round with anything left to play", () => {
    const tabs = buildStageTabs([
      fixture({ id: "a", matchday: 1, order: 1, status: "FINISHED", homeGoals: 1, awayGoals: 0 }),
      fixture({ id: "b", matchday: 2, order: 2, status: "TIMED" }),
      fixture({ id: "c", matchday: 3, order: 3, status: "TIMED" }),
    ]);
    expect(defaultStageKey(tabs)).toBe("md-2");
  });

  it("picks the last round once the whole competition is finished", () => {
    const tabs = buildStageTabs([
      fixture({ id: "a", matchday: 1, order: 1, status: "FINISHED", homeGoals: 1, awayGoals: 0 }),
      fixture({ id: "b", stage: "FINAL", matchday: null, order: 2, status: "FINISHED", homeGoals: 2, awayGoals: 1 }),
    ]);
    expect(defaultStageKey(tabs)).toBe("FINAL");
  });

  it("returns null when there are no tabs", () => {
    expect(defaultStageKey([])).toBeNull();
  });
});

describe("groupFixturesByDay", () => {
  it("groups by the Istanbul calendar date, oldest day first", () => {
    const days = groupFixturesByDay([
      fixture({ id: "tue-early", kickoffUtc: "2026-09-15T16:45:00.000Z" }),
      fixture({ id: "wed", kickoffUtc: "2026-09-16T19:00:00.000Z" }),
      fixture({ id: "tue-late", kickoffUtc: "2026-09-15T19:00:00.000Z" }),
    ]);
    expect(days.map((d) => d.key)).toEqual(["2026-09-15", "2026-09-16"]);
    expect(days[0].fixtures.map((f) => f.id)).toEqual(["tue-early", "tue-late"]);
  });

  it("keeps a 22:00 Istanbul kickoff on its Istanbul date, not the UTC one", () => {
    // 21:00 UTC on the 16th is 00:00 Istanbul on the 17th.
    const days = groupFixturesByDay([fixture({ kickoffUtc: "2026-09-16T21:00:00.000Z" })]);
    expect(days[0].key).toBe("2026-09-17");
  });
});
