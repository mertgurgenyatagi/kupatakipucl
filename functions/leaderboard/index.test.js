const { isPickCorrect, computeScore, assignRanks, buildRankSnapshotEntries, rankSnapshotDocId } = require("./index");

describe("isPickCorrect", () => {
  it("is correct within 2 positions", () => {
    expect(isPickCorrect(5, 6)).toBe(true);
    expect(isPickCorrect(5, 7)).toBe(true);
    expect(isPickCorrect(5, 3)).toBe(true);
  });
  it("is incorrect at 3 or more positions off", () => {
    expect(isPickCorrect(5, 8)).toBe(false);
    expect(isPickCorrect(5, 2)).toBe(false);
  });
});

describe("computeScore", () => {
  it("awards 3 points per correct pick and skips incorrect/missing ones", () => {
    const ranking = ["a", "b", "c"];
    const results = { a: { position: 1 }, b: { position: 5 }, c: { position: 3 } };
    // a: predicted 1, actual 1 -> correct (+3)
    // b: predicted 2, actual 5 -> incorrect
    // c: predicted 3, actual 3 -> correct (+3)
    expect(computeScore(ranking, results)).toBe(6);
  });
  it("returns 0 when no results exist yet", () => {
    expect(computeScore(["a"], {})).toBe(0);
  });
});

describe("assignRanks", () => {
  it("assigns sequential ranks when there are no ties", () => {
    const ranked = assignRanks([{ uid: "a", points: 10 }, { uid: "b", points: 5 }]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("uses standard competition ranking: ties share a rank and the next skips", () => {
    const entries = [
      { uid: "a", points: 10 },
      { uid: "b", points: 5 },
      { uid: "c", points: 5 },
      { uid: "d", points: 5 },
      { uid: "e", points: 1 },
    ];
    expect(assignRanks(entries).map((r) => r.rank)).toEqual([1, 2, 2, 2, 5]);
  });

  it("preserves input order", () => {
    const entries = [{ uid: "a", points: 5 }, { uid: "b", points: 5 }];
    expect(assignRanks(entries).map((r) => r.entry.uid)).toEqual(["a", "b"]);
  });

  it("returns an empty array for no entries", () => {
    expect(assignRanks([])).toEqual([]);
  });
});

describe("buildRankSnapshotEntries", () => {
  it("produces uid/points/rank triples in ranked order", () => {
    const entries = [{ uid: "a", points: 10 }, { uid: "b", points: 5 }];
    expect(buildRankSnapshotEntries(entries)).toEqual([
      { uid: "a", points: 10, rank: 1 },
      { uid: "b", points: 5, rank: 2 },
    ]);
  });
});

describe("rankSnapshotDocId", () => {
  it("returns the stringified matchday when it's a number", () => {
    expect(rankSnapshotDocId(4)).toBe("4");
    expect(rankSnapshotDocId(0)).toBe("0");
  });
  it("returns null when matchday is missing or not a number", () => {
    expect(rankSnapshotDocId(undefined)).toBeNull();
    expect(rankSnapshotDocId(null)).toBeNull();
    expect(rankSnapshotDocId("4")).toBeNull();
  });
});
