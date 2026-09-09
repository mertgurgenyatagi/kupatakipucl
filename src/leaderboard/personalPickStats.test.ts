import { describe, it, expect } from "vitest";
import {
  computePersonalPickStats,
  computeCommunityPickStats,
  computeContrarianStats,
  computeSelfContradictionStats,
} from "./personalPickStats";
import { RealFixture } from "./realFixtureTypes";
import { LeaderboardEntry } from "./leaderboardTypes";

let nextOrder = 1;
let nextUid = 1;

function entry(ranking: string[]): LeaderboardEntry {
  return { uid: `p${nextUid++}`, firstName: "Test", photoURL: "", points: 0, ranking };
}

function fixture(overrides: Partial<RealFixture> = {}): RealFixture {
  return {
    id: `f${nextOrder}`,
    matchday: 1,
    order: nextOrder++,
    homeTeamId: "arsenal",
    awayTeamId: "napoli", // not a real pairing in PERSONAL_PICKS unless overridden
    kickoffUtc: "2026-09-16T19:00:00Z",
    status: "TIMED",
    homeGoals: null,
    awayGoals: null,
    ...overrides,
  };
}

describe("computePersonalPickStats", () => {
  it("returns an empty-but-sane shape for no fixtures", () => {
    const stats = computePersonalPickStats([]);
    expect(stats.totalPicks).toBe(0);
    expect(stats.decided).toBe(0);
    expect(stats.pending).toBe(0);
    expect(stats.accuracyPct).toBeNull();
    expect(stats.currentStreak).toBeNull();
    expect(stats.bestCorrectStreak).toBe(0);
    expect(stats.favoriteTeam).toBeNull();
    expect(stats.mostReliableTeam).toBeNull();
    expect(stats.leastReliableTeam).toBeNull();
  });

  it("ignores fixtures with no recorded pick (e.g. a knockout tie)", () => {
    // arsenal:napoli isn't a real league-phase pairing in PERSONAL_PICKS.
    const stats = computePersonalPickStats([fixture({ homeTeamId: "arsenal", awayTeamId: "napoli" })]);
    expect(stats.totalPicks).toBe(0);
  });

  it("counts decided/pending/correct/incorrect and derives accuracy", () => {
    const fixtures = [
      // pick "home" (atletico-madrid), actual home win -> correct
      fixture({ homeTeamId: "atletico-madrid", awayTeamId: "viking", homeGoals: 2, awayGoals: 0 }),
      // pick "home" (liverpool), actual away win -> incorrect
      fixture({ homeTeamId: "liverpool", awayTeamId: "porto", homeGoals: 0, awayGoals: 1 }),
      // pick "home" (lask), not yet played -> pending
      fixture({ homeTeamId: "lask", awayTeamId: "slovan-bratislava", homeGoals: null, awayGoals: null }),
    ];
    const stats = computePersonalPickStats(fixtures);
    expect(stats.totalPicks).toBe(3);
    expect(stats.decided).toBe(2);
    expect(stats.pending).toBe(1);
    expect(stats.correct).toBe(1);
    expect(stats.incorrect).toBe(1);
    expect(stats.accuracyPct).toBe(50);
  });

  it("tracks the current and best streak in chronological (order) sequence", () => {
    const fixtures = [
      // correct
      fixture({ homeTeamId: "atletico-madrid", awayTeamId: "viking", homeGoals: 2, awayGoals: 0 }),
      // incorrect (pick home, away won)
      fixture({ homeTeamId: "liverpool", awayTeamId: "porto", homeGoals: 0, awayGoals: 1 }),
      // correct (pick away = bodo-glimt, away won)
      fixture({ homeTeamId: "lens", awayTeamId: "bodo-glimt", homeGoals: 0, awayGoals: 2 }),
      // correct (pick draw, actual draw)
      fixture({ homeTeamId: "feyenoord", awayTeamId: "como", homeGoals: 1, awayGoals: 1 }),
    ];
    const stats = computePersonalPickStats(fixtures);
    expect(stats.currentStreak).toEqual({ kind: "correct", length: 2 });
    expect(stats.bestCorrectStreak).toBe(2);
  });

  it("is order-independent — shuffled input still streaks in true chronological order", () => {
    const chronological = [
      fixture({ homeTeamId: "atletico-madrid", awayTeamId: "viking", homeGoals: 2, awayGoals: 0 }), // correct
      fixture({ homeTeamId: "liverpool", awayTeamId: "porto", homeGoals: 0, awayGoals: 1 }), // incorrect
      fixture({ homeTeamId: "lens", awayTeamId: "bodo-glimt", homeGoals: 0, awayGoals: 2 }), // correct
      fixture({ homeTeamId: "feyenoord", awayTeamId: "como", homeGoals: 1, awayGoals: 1 }), // correct
    ];
    const shuffled = [chronological[3], chronological[0], chronological[2], chronological[1]];
    expect(computePersonalPickStats(shuffled).currentStreak).toEqual({ kind: "correct", length: 2 });
  });

  it("splits by outcome type (home/away/draw)", () => {
    const fixtures = [
      fixture({ homeTeamId: "atletico-madrid", awayTeamId: "viking", homeGoals: 2, awayGoals: 0 }), // home pick, correct
      fixture({ homeTeamId: "liverpool", awayTeamId: "porto", homeGoals: 0, awayGoals: 1 }), // home pick, incorrect
      fixture({ homeTeamId: "lens", awayTeamId: "bodo-glimt", homeGoals: 0, awayGoals: 2 }), // away pick, correct
      fixture({ homeTeamId: "feyenoord", awayTeamId: "como", homeGoals: 1, awayGoals: 1 }), // draw pick, correct
    ];
    const stats = computePersonalPickStats(fixtures);
    expect(stats.byOutcome.home).toEqual({ total: 2, decided: 2, correct: 1 });
    expect(stats.byOutcome.away).toEqual({ total: 1, decided: 1, correct: 1 });
    expect(stats.byOutcome.draw).toEqual({ total: 1, decided: 1, correct: 1 });
  });

  it("picks the most-backed team as favorite, breaking ties by team id", () => {
    const fixtures = [
      fixture({ homeTeamId: "atletico-madrid", awayTeamId: "viking" }), // backs atletico-madrid
      fixture({ homeTeamId: "lens", awayTeamId: "bodo-glimt" }), // backs bodo-glimt
      fixture({ homeTeamId: "napoli", awayTeamId: "bodo-glimt" }), // backs napoli (home pick)
    ];
    // atletico-madrid: 1, bodo-glimt: 1, napoli: 1 — all tied, alphabetically first wins.
    expect(computePersonalPickStats(fixtures).favoriteTeam?.teamId).toBe("atletico-madrid");

    const withRepeat = [...fixtures, fixture({ homeTeamId: "bodo-glimt", awayTeamId: "lask" })];
    // now bodo-glimt has 2 picks (once as away winner, once as home winner) — clear favorite.
    expect(computePersonalPickStats(withRepeat).favoriteTeam?.teamId).toBe("bodo-glimt");
  });

  it("requires at least 2 decided picks before naming a most/least reliable team", () => {
    const oneDecided = [fixture({ homeTeamId: "atletico-madrid", awayTeamId: "viking", homeGoals: 2, awayGoals: 0 })];
    expect(computePersonalPickStats(oneDecided).mostReliableTeam).toBeNull();
    expect(computePersonalPickStats(oneDecided).leastReliableTeam).toBeNull();
  });

  it("finds the most and least reliable backed teams by hit rate", () => {
    const fixtures = [
      // fenerbahce backed twice, both correct -> 100%
      fixture({ homeTeamId: "fenerbahce", awayTeamId: "slavia-prague", homeGoals: 2, awayGoals: 0 }),
      fixture({ homeTeamId: "shakhtar-donetsk", awayTeamId: "fenerbahce", homeGoals: 0, awayGoals: 1 }),
      // napoli backed twice, one correct -> 50%
      fixture({ homeTeamId: "sabah", awayTeamId: "napoli", homeGoals: 0, awayGoals: 2 }),
      fixture({ homeTeamId: "villarreal", awayTeamId: "napoli", homeGoals: 1, awayGoals: 0 }),
    ];
    const stats = computePersonalPickStats(fixtures);
    expect(stats.mostReliableTeam?.teamId).toBe("fenerbahce");
    expect(stats.leastReliableTeam?.teamId).toBe("napoli");
  });
});

describe("computeCommunityPickStats", () => {
  it("scores the crowd's implied pick (majority ranks winner above loser) against the actual result", () => {
    // 2 of 3 rank atlético above viking; pick is "home", actual is a home win -> crowd right too.
    const entries = [
      entry(["atletico-madrid", "viking", "liverpool", "porto"]),
      entry(["atletico-madrid", "viking", "liverpool", "porto"]),
      entry(["viking", "atletico-madrid", "porto", "liverpool"]),
    ];
    const fixtures = [
      fixture({ homeTeamId: "atletico-madrid", awayTeamId: "viking", homeGoals: 2, awayGoals: 0 }),
      // 2 of 3 rank liverpool above porto -> implied "home"; actual is an away win -> crowd wrong here.
      fixture({ homeTeamId: "liverpool", awayTeamId: "porto", homeGoals: 0, awayGoals: 1 }),
    ];
    const stats = computeCommunityPickStats(fixtures, entries);
    expect(stats.decided).toBe(2);
    expect(stats.correct).toBe(1);
    expect(stats.accuracyPct).toBe(50);
  });

  it("skips fixtures with no recorded personal pick and ones nobody has an opinion on", () => {
    const noOpinion = fixture({ homeTeamId: "arsenal", awayTeamId: "napoli", homeGoals: 1, awayGoals: 0 });
    expect(computeCommunityPickStats([noOpinion], []).decided).toBe(0);
  });
});

describe("computeContrarianStats", () => {
  it("splits with-grain vs against-grain picks and their hit rates", () => {
    // majority ranks lens above bodø/glimt -> implied "home"; Mert picked "away" (bodø/glimt) -> against the grain.
    const entries = [entry(["lens", "bodo-glimt"]), entry(["lens", "bodo-glimt"]), entry(["bodo-glimt", "lens"])];
    // away win -> Mert's contrarian "away" pick was correct.
    const fixtures = [fixture({ homeTeamId: "lens", awayTeamId: "bodo-glimt", homeGoals: 0, awayGoals: 2 })];
    const stats = computeContrarianStats(fixtures, entries);
    expect(stats.againstGrain).toEqual({ decided: 1, correct: 1, incorrect: 0, accuracyPct: 100 });
    expect(stats.withGrain).toEqual({ decided: 0, correct: 0, incorrect: 0, accuracyPct: null });
  });

  it("counts a pick that matches the crowd as with-grain", () => {
    const entries = [entry(["atletico-madrid", "viking"]), entry(["atletico-madrid", "viking"])];
    // majority ranks atlético above viking -> implied "home", matches Mert's actual "home" pick.
    const fixtures = [fixture({ homeTeamId: "atletico-madrid", awayTeamId: "viking", homeGoals: 2, awayGoals: 0 })];
    const stats = computeContrarianStats(fixtures, entries);
    expect(stats.withGrain).toEqual({ decided: 1, correct: 1, incorrect: 0, accuracyPct: 100 });
    expect(stats.againstGrain.decided).toBe(0);
  });
});

describe("computeSelfContradictionStats", () => {
  it("returns all zeros/null when there's no ranking to compare against", () => {
    const fixtures = [fixture({ homeTeamId: "lens", awayTeamId: "bodo-glimt", homeGoals: 0, awayGoals: 2 })];
    expect(computeSelfContradictionStats(fixtures, null)).toEqual({
      total: 0,
      decided: 0,
      correct: 0,
      incorrect: 0,
      accuracyPct: null,
    });
  });

  it("counts backing a team ranked below the opponent in Mert's own table", () => {
    // Mert's own table has lens above bodø/glimt, but he picked bodø/glimt (away) to win this match.
    const ranking = ["lens", "bodo-glimt"];
    const fixtures = [fixture({ homeTeamId: "lens", awayTeamId: "bodo-glimt", homeGoals: 0, awayGoals: 2 })];
    const stats = computeSelfContradictionStats(fixtures, ranking);
    expect(stats.total).toBe(1);
    expect(stats.decided).toBe(1);
    expect(stats.correct).toBe(1); // bodø/glimt actually won
  });

  it("doesn't count a pick that agrees with Mert's own table", () => {
    // atlético ranked above viking, and he picked atlético (home) to win -> no contradiction.
    const ranking = ["atletico-madrid", "viking"];
    const fixtures = [fixture({ homeTeamId: "atletico-madrid", awayTeamId: "viking", homeGoals: 2, awayGoals: 0 })];
    expect(computeSelfContradictionStats(fixtures, ranking).total).toBe(0);
  });

  it("ignores draw picks — there's no 'backed team' to contradict the table with", () => {
    const ranking = ["como", "feyenoord"];
    const fixtures = [fixture({ homeTeamId: "feyenoord", awayTeamId: "como", homeGoals: 1, awayGoals: 1 })];
    expect(computeSelfContradictionStats(fixtures, ranking).total).toBe(0);
  });
});
