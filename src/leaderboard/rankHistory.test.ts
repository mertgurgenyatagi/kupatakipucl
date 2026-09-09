import { describe, it, expect } from "vitest";
import { computeRankHistory } from "./rankHistory";
import { computeStandingsFromMatches } from "./standingsAccumulator";
import { getLeagueFixtures } from "./fixtureStages";
import { LeaderboardEntry } from "./leaderboardTypes";
import { RealFixture } from "./realFixtureTypes";
import { TEAMS } from "../predictions/teams";

/** 3 disjoint fixtures (no team repeats) so each one's outcome is independent
 *  — mirrors devpanel/standings.test.ts's own disjointFixtures helper. */
const FIXTURES: RealFixture[] = [
  {
    id: "f1",
    matchday: 1,
    order: 1,
    homeTeamId: TEAMS[0].id,
    awayTeamId: TEAMS[1].id,
    kickoffUtc: "2026-09-08T16:45:00Z",
    status: "TIMED",
    homeGoals: null,
    awayGoals: null,
  },
  {
    id: "f2",
    matchday: 1,
    order: 2,
    homeTeamId: TEAMS[2].id,
    awayTeamId: TEAMS[3].id,
    kickoffUtc: "2026-09-08T19:00:00Z",
    status: "TIMED",
    homeGoals: null,
    awayGoals: null,
  },
  {
    id: "f3",
    matchday: 2,
    order: 3,
    homeTeamId: TEAMS[4].id,
    awayTeamId: TEAMS[5].id,
    kickoffUtc: "2026-09-30T16:45:00Z",
    status: "TIMED",
    homeGoals: null,
    awayGoals: null,
  },
];

function decided(id: string, homeGoals: number, awayGoals: number): RealFixture {
  const fixture = FIXTURES.find((f) => f.id === id)!;
  return { ...fixture, status: "FINISHED", homeGoals, awayGoals };
}

function withFixture(updated: RealFixture): RealFixture[] {
  return FIXTURES.map((f) => (f.id === updated.id ? updated : f));
}

function entry(uid: string, ranking: string[]): LeaderboardEntry {
  return { uid, firstName: uid, photoURL: "", points: 0, ranking };
}

describe("computeRankHistory", () => {
  it("returns no checkpoints when nothing is decided", () => {
    const entries = [entry("a", []), entry("b", [])];
    expect(computeRankHistory("a", entries, FIXTURES)).toEqual([]);
  });

  it("produces one checkpoint once a single match is decided", () => {
    const fixtures = withFixture(decided("f1", 2, 0));
    const entries = [entry("a", []), entry("b", [])];
    const history = computeRankHistory("a", entries, fixtures);
    expect(history).toHaveLength(1);
    expect(history[0].fixtureId).toBe("f1");
    expect(history[0].matchday).toBe(1);
  });

  it("stops at the first undecided match, even if a later one is decided", () => {
    const fixtures = withFixture(decided("f2", 1, 1));
    const entries = [entry("a", []), entry("b", [])];
    expect(computeRankHistory("a", entries, fixtures)).toEqual([]);
  });

  it("produces one checkpoint per decided match, in fixture order", () => {
    let fixtures = withFixture(decided("f1", 1, 0));
    fixtures = fixtures.map((f) => (f.id === "f2" ? decided("f2", 2, 1) : f));
    const entries = [entry("a", []), entry("b", [])];
    const history = computeRankHistory("a", entries, fixtures);
    expect(history.map((c) => c.fixtureId)).toEqual(["f1", "f2"]);
  });

  it("ranks a participant who predicted the actual leader after match 1 ahead of one who predicted the actual last-place team", () => {
    const fixtures = withFixture(decided("f1", 3, 0));
    const results = computeStandingsFromMatches(getLeagueFixtures(fixtures), { f1: { homeGoals: 3, awayGoals: 0 } });
    const leaderId = Object.keys(results).find((id) => results[id].position === 1)!;
    const lastId = Object.keys(results).find((id) => results[id].position === 36)!;

    const entries = [entry("good", [leaderId]), entry("bad", [lastId])];
    const goodHistory = computeRankHistory("good", entries, fixtures);
    const badHistory = computeRankHistory("bad", entries, fixtures);
    expect(goodHistory[0].rank).toBeLessThan(badHistory[0].rank);
  });

  it("ignores knockout fixtures — this chart replays the league table only", () => {
    const knockout: RealFixture = {
      id: "qf1",
      matchday: null,
      stage: "QUARTER_FINALS",
      order: 4,
      homeTeamId: TEAMS[0].id,
      awayTeamId: TEAMS[1].id,
      kickoffUtc: "2027-04-07T19:00:00Z",
      status: "FINISHED",
      homeGoals: 4,
      awayGoals: 0,
    };
    const fixtures = [...withFixture(decided("f1", 1, 0)), knockout];
    const entries = [entry("a", []), entry("b", [])];
    const history = computeRankHistory("a", entries, fixtures);
    expect(history.map((c) => c.fixtureId)).toEqual(["f1"]);
  });
});
