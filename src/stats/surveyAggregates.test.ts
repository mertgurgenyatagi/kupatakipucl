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
  it("omits teams with zero votes and sorts by count descending", () => {
    expect(computeSuperLigDistribution([])).toEqual([]);
    const out = computeSuperLigDistribution(["Galatasaray", "Fenerbahçe", "Galatasaray", "Galatasaray"]);
    expect(out).toEqual([
      { label: "Galatasaray", count: 3 },
      { label: "Fenerbahçe", count: 1 },
    ]);
  });
});
