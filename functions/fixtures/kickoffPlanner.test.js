import { describe, it, expect } from "vitest";
import { fixturesNeedingArrival, PLANNER_LOOKAHEAD_MS } from "./kickoffPlanner.js";

const NOW = new Date("2026-09-08T12:00:00Z").getTime();
const fixture = (id, kickoffUtc) => ({ id, kickoffUtc });

describe("fixturesNeedingArrival", () => {
  it("includes a fixture kicking off soon", () => {
    const soon = new Date(NOW + 60 * 60 * 1000).toISOString(); // +1h
    const result = fixturesNeedingArrival([fixture("f1", soon)], NOW);
    expect(result.map((f) => f.id)).toEqual(["f1"]);
  });

  it("excludes a fixture that already kicked off", () => {
    const past = new Date(NOW - 60 * 1000).toISOString();
    expect(fixturesNeedingArrival([fixture("f1", past)], NOW)).toEqual([]);
  });

  it("includes a fixture right at the lookahead horizon", () => {
    const atHorizon = new Date(NOW + PLANNER_LOOKAHEAD_MS).toISOString();
    const result = fixturesNeedingArrival([fixture("f1", atHorizon)], NOW);
    expect(result.map((f) => f.id)).toEqual(["f1"]);
  });

  it("excludes a fixture just past the lookahead horizon", () => {
    const pastHorizon = new Date(NOW + PLANNER_LOOKAHEAD_MS + 1000).toISOString();
    expect(fixturesNeedingArrival([fixture("f1", pastHorizon)], NOW)).toEqual([]);
  });

  it("filters a mixed batch down to only the ones needing an arrival", () => {
    const fixtures = [
      fixture("past", new Date(NOW - 1000).toISOString()),
      fixture("soon", new Date(NOW + 60 * 1000).toISOString()),
      fixture("far", new Date(NOW + PLANNER_LOOKAHEAD_MS * 2).toISOString()),
    ];
    expect(fixturesNeedingArrival(fixtures, NOW).map((f) => f.id)).toEqual(["soon"]);
  });

  it("returns nothing for an empty fixture list", () => {
    expect(fixturesNeedingArrival([], NOW)).toEqual([]);
  });
});
