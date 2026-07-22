import { describe, it, expect } from "vitest";
import { computeScore, isPickCorrect, evaluatePicks } from "./scoring";
import { TeamResult } from "./teamResultTypes";

function result(position: number): TeamResult {
  return { position, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 };
}

describe("isPickCorrect", () => {
  it("is true when the prediction is within two places", () => {
    expect(isPickCorrect(1, 1)).toBe(true);
    expect(isPickCorrect(1, 3)).toBe(true);
    expect(isPickCorrect(5, 3)).toBe(true);
  });

  it("is false at a delta of exactly 3 (boundary excluded) or more", () => {
    expect(isPickCorrect(1, 4)).toBe(false);
    expect(isPickCorrect(10, 1)).toBe(false);
  });
});

describe("evaluatePicks", () => {
  it("marks placed picks correct/incorrect and carries unplaced picks as null", () => {
    const evals = evaluatePicks(["a", "b", "c"], { a: result(1), c: result(20) });
    expect(evals[0]).toMatchObject({ teamId: "a", predictedPosition: 1, actualPosition: 1, correct: true });
    expect(evals[1]).toMatchObject({ teamId: "b", predictedPosition: 2, actualPosition: null, correct: false });
    expect(evals[2]).toMatchObject({ teamId: "c", predictedPosition: 3, actualPosition: 20, correct: false });
  });
});

describe("computeScore", () => {
  it("awards 3 points for an exact position match", () => {
    expect(computeScore(["a"], { a: result(1) })).toBe(3);
  });

  it("awards 3 points when the delta is 1", () => {
    expect(computeScore(["a"], { a: result(2) })).toBe(3);
  });

  it("awards 3 points when the delta is 2", () => {
    expect(computeScore(["a"], { a: result(3) })).toBe(3);
  });

  it("awards 0 points when the delta is exactly 3 (boundary excluded)", () => {
    expect(computeScore(["a"], { a: result(4) })).toBe(0);
  });

  it("awards 0 points when the delta is large", () => {
    expect(computeScore(["a"], { a: result(20) })).toBe(0);
  });

  it("contributes 0 for a team missing from results, without throwing", () => {
    expect(computeScore(["a", "b"], { a: result(1) })).toBe(3);
  });

  it("sums points across multiple teams", () => {
    // "a" predicted 1st, actual 1st -> 3. "b" predicted 2nd, actual 2nd -> 3. "c" predicted 3rd, actual 10th -> 0.
    expect(computeScore(["a", "b", "c"], { a: result(1), b: result(2), c: result(10) })).toBe(6);
  });

  it("returns 0 for an empty ranking", () => {
    expect(computeScore([], { a: result(1) })).toBe(0);
  });
});
