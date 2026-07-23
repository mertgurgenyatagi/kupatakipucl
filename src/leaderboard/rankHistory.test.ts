import { describe, it, expect } from "vitest";
import { computeRankHistory } from "./rankHistory";
import { FIXTURES } from "../devpanel/fixtures";
import { computeStandings, MatchOutcome } from "../devpanel/standings";
import { LeaderboardEntry } from "./leaderboardTypes";

const FIXTURES_BY_ORDER = [...FIXTURES].sort((a, b) => a.order - b.order);

function entry(uid: string, ranking: string[]): LeaderboardEntry {
  return { uid, firstName: uid, lastName: "", photoURL: "", points: 0, ranking };
}

describe("computeRankHistory", () => {
  it("returns no checkpoints when nothing is decided", () => {
    const entries = [entry("a", []), entry("b", [])];
    expect(computeRankHistory("a", entries, {})).toEqual([]);
  });

  it("produces one checkpoint once a single match is decided", () => {
    const outcomes: Record<string, MatchOutcome> = {
      [FIXTURES_BY_ORDER[0].id]: "homewin",
    };
    const entries = [entry("a", []), entry("b", [])];
    const history = computeRankHistory("a", entries, outcomes);
    expect(history).toHaveLength(1);
    expect(history[0].fixtureId).toBe(FIXTURES_BY_ORDER[0].id);
    expect(history[0].matchday).toBe(FIXTURES_BY_ORDER[0].matchday);
  });

  it("stops at the first undecided match, even if a later one is decided", () => {
    const outcomes: Record<string, MatchOutcome> = {
      [FIXTURES_BY_ORDER[2].id]: "homewin",
    };
    const entries = [entry("a", []), entry("b", [])];
    expect(computeRankHistory("a", entries, outcomes)).toEqual([]);
  });

  it("produces one checkpoint per decided match, in fixture order", () => {
    const outcomes: Record<string, MatchOutcome> = {};
    const first3 = FIXTURES_BY_ORDER.slice(0, 3);
    first3.forEach((f) => (outcomes[f.id] = "homewin"));
    const entries = [entry("a", []), entry("b", [])];
    const history = computeRankHistory("a", entries, outcomes);
    expect(history.map((c) => c.fixtureId)).toEqual(first3.map((f) => f.id));
  });

  it("ranks a participant who predicted the actual leader after match 1 ahead of one who predicted the actual last-place team", () => {
    const outcomes: Record<string, MatchOutcome> = {
      [FIXTURES_BY_ORDER[0].id]: "homewin",
    };
    const results = computeStandings(outcomes);
    const leaderId = Object.keys(results).find((id) => results[id].position === 1)!;
    const lastId = Object.keys(results).find((id) => results[id].position === 36)!;

    const entries = [entry("good", [leaderId]), entry("bad", [lastId])];
    const goodHistory = computeRankHistory("good", entries, outcomes);
    const badHistory = computeRankHistory("bad", entries, outcomes);
    expect(goodHistory[0].rank).toBeLessThan(badHistory[0].rank);
  });
});
