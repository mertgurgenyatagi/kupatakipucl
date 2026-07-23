import { describe, it, expect } from "vitest";
import {
  computeFootballKnowledgeDistribution,
  computeMessiRonaldoDistribution,
  computeSuperLigDistribution,
} from "./surveyAggregates";

describe("computeFootballKnowledgeDistribution", () => {
  it("always returns all 7 levels in order, zero-filled, and counts correctly", () => {
    expect(computeFootballKnowledgeDistribution([]).map((b) => b.label)).toEqual([
      "1", "2", "3", "4", "5", "6", "7",
    ]);
    const out = computeFootballKnowledgeDistribution([4, 4, 7]);
    expect(out.find((b) => b.label === "4")?.count).toBe(2);
    expect(out.find((b) => b.label === "7")?.count).toBe(1);
    expect(out.find((b) => b.label === "1")?.count).toBe(0);
  });
});

describe("computeMessiRonaldoDistribution", () => {
  it("always returns all 3 options in a fixed order, zero-filled, and counts correctly", () => {
    expect(computeMessiRonaldoDistribution([]).map((b) => b.label)).toEqual([
      "Messi", "Ronaldo", "Fikrim yok",
    ]);
    const out = computeMessiRonaldoDistribution(["messi", "messi", "no-opinion"]);
    expect(out.find((b) => b.label === "Messi")?.count).toBe(2);
    expect(out.find((b) => b.label === "Fikrim yok")?.count).toBe(1);
    expect(out.find((b) => b.label === "Ronaldo")?.count).toBe(0);
  });
});

describe("computeSuperLigDistribution", () => {
  it("omits teams with zero votes, sorts by count descending, and abbreviates known teams", () => {
    expect(computeSuperLigDistribution([])).toEqual([]);
    const out = computeSuperLigDistribution(["Galatasaray", "Fenerbahçe", "Galatasaray", "Galatasaray"]);
    expect(out).toEqual([
      { label: "GS", count: 3 },
      { label: "FB", count: 1 },
    ]);
  });

  it("shows an answer that isn't one of the known 6 options as-is", () => {
    // Real production data has legacy free-text answers pre-dating the
    // fixed dropdown — there's no abbreviation to look up for those.
    const out = computeSuperLigDistribution(["Manevi olarak Alanyasporluyum"]);
    expect(out).toEqual([{ label: "Manevi olarak Alanyasporluyum", count: 1 }]);
  });
});
