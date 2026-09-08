import { describe, it, expect } from "vitest";
import { computeContrarianScores } from "./contrarianScore";
import { TeamResult } from "./teamResultTypes";

function result(position: number): TeamResult {
  return { position, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 };
}

describe("computeContrarianScores", () => {
  it("scores 0 for a correct pick that matches the crowd exactly", () => {
    const entries = [
      { uid: "a", ranking: ["team-1"] },
      { uid: "b", ranking: ["team-1"] },
    ];
    const scores = computeContrarianScores(entries, { "team-1": result(1) });
    expect(scores.a).toBe(0);
    expect(scores.b).toBe(0);
  });

  it("rewards a correct pick that strayed from the crowd average", () => {
    // Real Madrid: everyone else has it 3rd, one participant calls 16th, and
    // 16th is what actually happens.
    const entries = [
      { uid: "contrarian", ranking: ["real-madrid"] },
      { uid: "crowd-1", ranking: Array(15).fill("filler").concat("real-madrid") },
      { uid: "crowd-2", ranking: Array(15).fill("filler").concat("real-madrid") },
    ];
    // crowd-1/crowd-2 predict real-madrid at position 16; "contrarian" at 1.
    // Crowd average across all three entries = (1 + 16 + 16) / 3 = 11.
    const results = { "real-madrid": result(1) };
    const scores = computeContrarianScores(entries, results);
    expect(scores.contrarian).toBeCloseTo(10, 5); // |1 - 11|
    expect(scores["crowd-1"]).toBe(0); // not a correct pick (16 vs actual 1)
  });

  it("ignores incorrect picks entirely, however contrarian", () => {
    const entries = [
      { uid: "a", ranking: ["team-1"] },
      { uid: "b", ranking: ["team-1"] },
    ];
    // "a" predicts 1st, actual is 20th (wrong) — should not contribute.
    const scores = computeContrarianScores(entries, { "team-1": result(20) });
    expect(scores.a).toBe(0);
  });

  it("ignores teams with no result yet", () => {
    const entries = [{ uid: "a", ranking: ["team-1", "team-2"] }];
    const scores = computeContrarianScores(entries, { "team-1": result(1) });
    expect(scores.a).toBe(0);
  });

  it("sums deviation across multiple contrarian-correct picks rather than averaging", () => {
    const entries = [
      { uid: "a", ranking: ["team-1", "team-2"] },
      { uid: "b", ranking: ["team-2", "team-1"] },
    ];
    // team-1: a predicts 1, b predicts 2 -> crowd avg 1.5. actual 1 -> both correct (delta < 3).
    // team-2: a predicts 2, b predicts 1 -> crowd avg 1.5. actual 2 -> a exact-ish, b delta 1, both correct.
    const results = { "team-1": result(1), "team-2": result(2) };
    const scores = computeContrarianScores(entries, results);
    // a: |1-1.5| + |2-1.5| = 0.5 + 0.5 = 1
    expect(scores.a).toBeCloseTo(1, 5);
    expect(scores.b).toBeCloseTo(1, 5);
  });

  it("returns 0 for an entry with an empty ranking", () => {
    const entries = [{ uid: "a", ranking: [] }];
    expect(computeContrarianScores(entries, {}).a).toBe(0);
  });
});
