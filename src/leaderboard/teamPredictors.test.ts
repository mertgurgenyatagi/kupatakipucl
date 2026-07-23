import { describe, it, expect } from "vitest";
import { getTeamPredictors } from "./teamPredictors";
import { LeaderboardEntry } from "./leaderboardTypes";
import { TeamResult } from "./teamResultTypes";

function entry(uid: string, points: number, ranking: string[]): LeaderboardEntry {
  return { uid, firstName: uid, lastName: "", photoURL: "", points, ranking };
}

describe("getTeamPredictors", () => {
  it("orders participants by their overall leaderboard standing, not by how bullish their pick was", () => {
    // entries pre-sorted by points descending, as useLeaderboard provides them.
    const entries = [
      entry("leader", 20, ["arsenal", "ajax"]), // predicts arsenal 1st, but ranked 1st overall
      entry("laggard", 3, ["ajax", "arsenal"]), // predicts arsenal 2nd, ranked 2nd overall
    ];
    const predictors = getTeamPredictors("arsenal", entries, {});
    // "leader" is first on the real leaderboard, so first here too —
    // even though both entries predict a similar position.
    expect(predictors.map((p) => p.entry.uid)).toEqual(["leader", "laggard"]);
  });

  it("still reports each participant's own predicted position as their row value", () => {
    const entries = [entry("a", 10, ["ajax", "arsenal"])];
    const predictors = getTeamPredictors("arsenal", entries, {});
    expect(predictors[0].predictedPosition).toBe(2);
  });

  it("omits participants who never ranked the team at all", () => {
    const entries = [entry("a", 10, ["ajax"]), entry("b", 5, ["arsenal"])];
    const predictors = getTeamPredictors("arsenal", entries, {});
    expect(predictors.map((p) => p.entry.uid)).toEqual(["b"]);
  });

  it("marks a pick correct only once the team has a result and it's within the scoring window", () => {
    const entries = [entry("a", 10, ["arsenal"])];
    const results: Record<string, TeamResult> = {
      arsenal: { position: 2, points: 6, goalDifference: 2, goalsFor: 4, goalsAgainst: 2, matchesPlayed: 2 },
    };
    expect(getTeamPredictors("arsenal", entries, {})[0].correct).toBe(false);
    expect(getTeamPredictors("arsenal", entries, results)[0].correct).toBe(true);
  });
});
