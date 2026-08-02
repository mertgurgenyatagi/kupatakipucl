import { describe, it, expect } from "vitest";
import { buildRankHistoryPoints, findBracketHandoffMatchday } from "./rankHistoryChart";
import { RankSnapshot } from "./rankSnapshotTypes";

const SNAPSHOTS: RankSnapshot[] = [
  { matchday: 1, entries: [{ uid: "uid1", points: 3, rank: 2 }, { uid: "uid2", points: 6, rank: 1 }], computedAt: 1 },
  { matchday: 2, entries: [{ uid: "uid1", points: 6, rank: 1 }, { uid: "uid2", points: 6, rank: 1 }], computedAt: 2 },
  { matchday: 3, entries: [{ uid: "uid2", points: 9, rank: 1 }], computedAt: 3 },
];

describe("buildRankHistoryPoints", () => {
  it("returns one point per matchday the uid appears in, sorted ascending", () => {
    expect(buildRankHistoryPoints(SNAPSHOTS, "uid1")).toEqual([
      { matchday: 1, rank: 2 },
      { matchday: 2, rank: 1 },
    ]);
  });

  it("returns an empty array for a uid that never appears in any snapshot", () => {
    expect(buildRankHistoryPoints(SNAPSHOTS, "uid-never-scored")).toEqual([]);
  });

  it("skips matchdays where the uid is absent (e.g. dropped from a later cache)", () => {
    const points = buildRankHistoryPoints(SNAPSHOTS, "uid1");
    expect(points.find((p) => p.matchday === 3)).toBeUndefined();
  });
});

describe("findBracketHandoffMatchday", () => {
  it("returns null when every point is within the league phase's 8 matchdays", () => {
    const points = [{ matchday: 1, rank: 2 }, { matchday: 8, rank: 1 }];
    expect(findBracketHandoffMatchday(points)).toBeNull();
  });

  it("returns the first matchday beyond the league phase's own fixture list", () => {
    const points = [{ matchday: 7, rank: 2 }, { matchday: 8, rank: 1 }, { matchday: 9, rank: 3 }, { matchday: 10, rank: 2 }];
    expect(findBracketHandoffMatchday(points)).toBe(9);
  });

  it("returns null for an empty points list", () => {
    expect(findBracketHandoffMatchday([])).toBeNull();
  });
});
