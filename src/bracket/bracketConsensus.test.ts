import { describe, it, expect } from "vitest";
import { computeBracketConsensus } from "./bracketConsensus";
import { BracketPrediction } from "./bracketPredictionTypes";

function prediction(picks: Record<string, string>): BracketPrediction {
  return { picks: picks as BracketPrediction["picks"], submittedAt: 1 };
}

describe("computeBracketConsensus", () => {
  it("returns an empty consensus list for no predictions", () => {
    expect(computeBracketConsensus([])).toEqual([]);
  });

  it("gives 100% for a unanimous pick", () => {
    const predictions = [prediction({ "ro16-1": "Arsenal" }), prediction({ "ro16-1": "Arsenal" })];
    const consensus = computeBracketConsensus(predictions);
    const ro16_1 = consensus.find((c) => c.matchupId === "ro16-1");
    expect(ro16_1?.teamPercentages).toEqual({ Arsenal: 100 });
  });

  it("splits percentages across a divided matchup", () => {
    const predictions = [
      prediction({ "ro16-1": "Arsenal" }),
      prediction({ "ro16-1": "Arsenal" }),
      prediction({ "ro16-1": "Napoli" }),
      prediction({ "ro16-1": "Napoli" }),
    ];
    const consensus = computeBracketConsensus(predictions);
    const ro16_1 = consensus.find((c) => c.matchupId === "ro16-1");
    expect(ro16_1?.teamPercentages).toEqual({ Arsenal: 50, Napoli: 50 });
  });

  it("ignores predictions that didn't pick a given matchup", () => {
    const predictions = [prediction({ "ro16-1": "Arsenal" }), prediction({ "ro16-2": "Bayern" })];
    const consensus = computeBracketConsensus(predictions);
    const ro16_1 = consensus.find((c) => c.matchupId === "ro16-1");
    expect(ro16_1?.teamPercentages).toEqual({ Arsenal: 100 });
  });

  it("covers all 15 matchup ids even with zero picks for some", () => {
    const predictions = [prediction({ "ro16-1": "Arsenal" })];
    const consensus = computeBracketConsensus(predictions);
    expect(consensus).toHaveLength(15);
    const final = consensus.find((c) => c.matchupId === "final");
    expect(final?.teamPercentages).toEqual({});
  });
});
