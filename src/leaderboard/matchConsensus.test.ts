import { describe, it, expect } from "vitest";
import { LeaderboardEntry } from "./leaderboardTypes";
import { computeMatchConsensus } from "./matchConsensus";

function entry(uid: string, ranking: string[]): LeaderboardEntry {
  return { uid, firstName: uid, photoURL: "", points: 0, ranking };
}

describe("computeMatchConsensus", () => {
  it("counts who ranked the home team above the away team", () => {
    const entries = [
      entry("a", ["arsenal", "inter"]),
      entry("b", ["arsenal", "inter"]),
      entry("c", ["inter", "arsenal"]),
    ];
    expect(computeMatchConsensus("arsenal", "inter", entries)).toEqual({ home: 2, away: 1 });
  });

  it("is symmetric — swapping the teams swaps the counts", () => {
    const entries = [entry("a", ["arsenal", "inter"]), entry("b", ["inter", "arsenal"])];
    expect(computeMatchConsensus("inter", "arsenal", entries)).toEqual({ home: 1, away: 1 });
  });

  it("ignores a participant whose ranking is missing one of the teams", () => {
    const entries = [entry("a", ["arsenal", "inter"]), entry("b", ["arsenal", "porto"])];
    expect(computeMatchConsensus("arsenal", "inter", entries)).toEqual({ home: 1, away: 0 });
  });

  it("returns null when nobody has an opinion", () => {
    expect(computeMatchConsensus("arsenal", "inter", [])).toBeNull();
    expect(computeMatchConsensus("arsenal", "inter", [entry("a", ["porto", "ajax"])])).toBeNull();
  });
});
