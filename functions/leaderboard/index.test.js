const {
  isPickCorrect,
  computeScore,
  assignRanks,
  buildRankSnapshotEntries,
  rankSnapshotDocId,
  computeBracketScore,
  buildLeaderboardEntries,
} = require("./index");

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

describe("computeBracketScore", () => {
  it("returns 0 when there is no bracket submission", () => {
    expect(computeBracketScore(undefined, { ro16Teams: {}, winners: {} })).toBe(0);
  });

  it("stacks RO16+QF+SF+Final for a fully correct bracket run", () => {
    const picks = { "ro16-1": "Arsenal", "qf-1": "Arsenal", "sf-1": "Arsenal", final: "Arsenal" };
    const bracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal", "sf-1": "Arsenal", final: "Arsenal" },
    };
    expect(computeBracketScore(picks, bracketState)).toBe(3 + 4 + 5 + 6);
  });

  it("awards 0 for an incorrect pick", () => {
    const picks = { "ro16-1": "Napoli" };
    const bracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };
    expect(computeBracketScore(picks, bracketState)).toBe(0);
  });
});

describe("recomputeLeaderboard combined scoring (via buildLeaderboardEntries)", () => {
  it("gives a participant with only a bracket prediction their bracket points and 0 league points", () => {
    const profilesById = new Map([["uid1", { firstName: "A", lastName: "B", photoURL: "" }]]);
    const predictionsById = new Map();
    const bracketPredictionsById = new Map([["uid1", { picks: { "ro16-1": "Arsenal" }, submittedAt: 1 }]]);
    const results = {};
    const bracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };

    const entries = buildLeaderboardEntries({
      profilesById,
      predictionsById,
      bracketPredictionsById,
      results,
      bracketState,
    });

    expect(entries).toEqual([
      {
        uid: "uid1",
        firstName: "A",
        lastName: "B",
        photoURL: "",
        points: 3,
        ranking: undefined,
        submittedAt: undefined,
      },
    ]);
  });

  it("gives a participant with only a league prediction their league points and 0 bracket points", () => {
    const profilesById = new Map([["uid1", { firstName: "A", lastName: "B", photoURL: "" }]]);
    const predictionsById = new Map([["uid1", { ranking: ["a"], submittedAt: 1 }]]);
    const bracketPredictionsById = new Map();
    const results = { a: { position: 1 } };
    const bracketState = { ro16Teams: {}, winners: {} };

    const entries = buildLeaderboardEntries({
      profilesById,
      predictionsById,
      bracketPredictionsById,
      results,
      bracketState,
    });

    expect(entries).toEqual([
      {
        uid: "uid1",
        firstName: "A",
        lastName: "B",
        photoURL: "",
        points: 3,
        ranking: ["a"],
        submittedAt: 1,
      },
    ]);
  });

  it("combines league and bracket points for a participant with both", () => {
    const profilesById = new Map([["uid1", { firstName: "A", lastName: "B", photoURL: "" }]]);
    const predictionsById = new Map([["uid1", { ranking: ["a"], submittedAt: 1 }]]);
    const bracketPredictionsById = new Map([["uid1", { picks: { "ro16-1": "Arsenal" }, submittedAt: 2 }]]);
    const results = { a: { position: 1 } };
    const bracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };

    const entries = buildLeaderboardEntries({
      profilesById,
      predictionsById,
      bracketPredictionsById,
      results,
      bracketState,
    });

    expect(entries[0].points).toBe(3 + 3);
  });

  it("skips a uid with no profile even if they have a bracket prediction", () => {
    const profilesById = new Map();
    const predictionsById = new Map();
    const bracketPredictionsById = new Map([["uid1", { picks: { "ro16-1": "Arsenal" }, submittedAt: 1 }]]);
    const results = {};
    const bracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };

    const entries = buildLeaderboardEntries({
      profilesById,
      predictionsById,
      bracketPredictionsById,
      results,
      bracketState,
    });

    expect(entries).toEqual([]);
  });
});
