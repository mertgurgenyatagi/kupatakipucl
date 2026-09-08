import { describe, it, expect } from "vitest";
import { assignRanks } from "./ranking";
import { LeaderboardEntry } from "./leaderboardTypes";

function entry(uid: string, points: number, contrarianScore = 0): LeaderboardEntry {
  return { uid, firstName: uid, photoURL: "", points, ranking: [], contrarianScore };
}

describe("assignRanks", () => {
  it("assigns sequential ranks when there are no ties", () => {
    const ranked = assignRanks([entry("a", 30), entry("b", 20), entry("c", 10)]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("uses standard competition ranking: ties share a rank and the next skips", () => {
    const ranked = assignRanks([
      entry("a", 30),
      entry("b", 30),
      entry("c", 20),
      entry("d", 20),
      entry("e", 20),
      entry("f", 10),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3, 3, 3, 6]);
  });

  it("preserves input order", () => {
    const ranked = assignRanks([entry("a", 5), entry("b", 5)]);
    expect(ranked.map((r) => r.entry.uid)).toEqual(["a", "b"]);
  });

  it("returns an empty array for no entries", () => {
    expect(assignRanks([])).toEqual([]);
  });

  it("breaks a points tie using contrarianScore instead of sharing a rank", () => {
    const ranked = assignRanks([
      entry("a", 30, 10),
      entry("b", 30, 4),
      entry("c", 20, 0),
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("still shares a rank when both points and contrarianScore match", () => {
    const ranked = assignRanks([entry("a", 30, 5), entry("b", 30, 5), entry("c", 20, 0)]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 3]);
  });

  it("treats a missing contrarianScore as 0", () => {
    const withScore: LeaderboardEntry = { uid: "a", firstName: "a", photoURL: "", points: 30, ranking: [], contrarianScore: 0 };
    const withoutScore: LeaderboardEntry = { uid: "b", firstName: "b", photoURL: "", points: 30, ranking: [] };
    const ranked = assignRanks([withScore, withoutScore]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1]);
  });
});
