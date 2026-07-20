import { describe, it, expect } from "vitest";
import { computeAccuracy } from "./accuracy";
import { TeamResult } from "../leaderboard/teamResultTypes";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";

function result(position: number): TeamResult {
  return { position, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 };
}

function entry(uid: string, ranking: string[]): LeaderboardEntry {
  return { uid, firstName: `First-${uid}`, lastName: `Last-${uid}`, photoURL: "", points: 0, ranking };
}

describe("computeAccuracy", () => {
  it("computes 0 average deviation for an exact-match single-team prediction", () => {
    const out = computeAccuracy([entry("u1", ["a"])], { a: result(1) });
    expect(out).toEqual([{ uid: "u1", firstName: "First-u1", lastName: "Last-u1", averageDeviation: 0 }]);
  });

  it("averages deviation across multiple resolvable teams", () => {
    // "a" predicted 1st, actual 1st -> deviation 0. "b" predicted 2nd, actual 5th -> deviation 3.
    const out = computeAccuracy([entry("u1", ["a", "b"])], { a: result(1), b: result(5) });
    expect(out[0].averageDeviation).toBeCloseTo(1.5);
  });

  it("excludes teams with no result from the average", () => {
    // "b" has no result entry, so only "a" (deviation 0) counts.
    const out = computeAccuracy([entry("u1", ["a", "b"])], { a: result(1) });
    expect(out[0].averageDeviation).toBe(0);
  });

  it("excludes an entry entirely when none of its ranked teams have a result", () => {
    const out = computeAccuracy([entry("u1", ["a"])], {});
    expect(out).toEqual([]);
  });

  it("sorts multiple entries ascending by averageDeviation", () => {
    const out = computeAccuracy(
      [entry("less-accurate", ["a"]), entry("more-accurate", ["b"])],
      { a: result(10), b: result(1) }
    );
    expect(out.map((e) => e.uid)).toEqual(["more-accurate", "less-accurate"]);
  });

  it("returns an empty array for no entries", () => {
    expect(computeAccuracy([], {})).toEqual([]);
  });
});
