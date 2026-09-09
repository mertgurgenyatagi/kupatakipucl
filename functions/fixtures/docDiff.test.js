import { describe, it, expect } from "vitest";
import { isSameDoc, pickChangedDocs } from "./docDiff.js";

const fixture = (overrides = {}) => ({
  matchday: 1,
  stage: "LEAGUE_STAGE",
  order: 1,
  homeTeamId: "arsenal",
  awayTeamId: "barcelona",
  kickoffUtc: "2026-09-16T16:45:00Z",
  status: "TIMED",
  homeGoals: null,
  awayGoals: null,
  ...overrides,
});

describe("isSameDoc", () => {
  it("is true for identical documents", () => {
    expect(isSameDoc(fixture(), fixture())).toBe(true);
  });

  it("is false when any field differs", () => {
    expect(isSameDoc(fixture(), fixture({ status: "IN_PLAY" }))).toBe(false);
    expect(isSameDoc(fixture(), fixture({ homeGoals: 1 }))).toBe(false);
  });

  it("distinguishes null from zero, so a 0-0 result is never mistaken for undecided", () => {
    expect(isSameDoc(fixture({ homeGoals: null }), fixture({ homeGoals: 0 }))).toBe(false);
  });

  it("is false when the stored document is missing entirely", () => {
    expect(isSameDoc(undefined, fixture())).toBe(false);
  });

  it("is false when the stored document lacks a field the new one has", () => {
    // Exactly the `stage` backfill case: written before the field existed.
    const { stage, ...withoutStage } = fixture();
    expect(isSameDoc(withoutStage, fixture())).toBe(false);
  });
});

describe("pickChangedDocs", () => {
  it("returns nothing when every document is unchanged — the quiet-poll case", () => {
    const stored = { a: fixture(), b: fixture({ order: 2 }) };
    const next = { a: fixture(), b: fixture({ order: 2 }) };
    expect(pickChangedDocs(stored, next)).toEqual({});
  });

  it("returns only the documents that actually moved", () => {
    const stored = { a: fixture(), b: fixture({ order: 2 }), c: fixture({ order: 3 }) };
    const next = {
      a: fixture(),
      b: fixture({ order: 2, status: "IN_PLAY", homeGoals: 1, awayGoals: 0 }),
      c: fixture({ order: 3 }),
    };
    expect(Object.keys(pickChangedDocs(stored, next))).toEqual(["b"]);
  });

  it("includes documents that don't exist yet", () => {
    expect(Object.keys(pickChangedDocs({}, { a: fixture() }))).toEqual(["a"]);
  });

  it("still rewrites a document that drifted from what we compute", () => {
    // A hand-written dev-panel correction: the old unconditional overwrite
    // healed this, and diffing must not stop healing it.
    const stored = { madrid: { position: 20, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0, matchesPlayed: 0 } };
    const next = { madrid: { position: 1, points: 9, goalDifference: 6, goalsFor: 7, goalsAgainst: 1, matchesPlayed: 3 } };
    expect(pickChangedDocs(stored, next)).toEqual(next);
  });

  it("ignores stored documents that are no longer computed rather than touching them", () => {
    const stored = { a: fixture(), stale: fixture({ order: 99 }) };
    expect(pickChangedDocs(stored, { a: fixture() })).toEqual({});
  });
});
