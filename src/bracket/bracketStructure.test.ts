import { describe, it, expect } from "vitest";
import {
  BRACKET_MATCHUPS,
  ROUND_ORDER,
  matchupById,
  matchupsForRound,
  childrenOf,
  nextRound,
  previousRound,
  MatchupId,
} from "./bracketStructure";

describe("BRACKET_MATCHUPS", () => {
  it("has 15 matchups total (8 RO16 + 4 QF + 2 SF + 1 Final)", () => {
    expect(BRACKET_MATCHUPS.length).toBe(15);
  });
});

describe("matchupsForRound", () => {
  it("returns the 8 RO16 matchups", () => {
    expect(matchupsForRound("ro16").map((m) => m.id)).toEqual([
      "ro16-1", "ro16-2", "ro16-3", "ro16-4", "ro16-5", "ro16-6", "ro16-7", "ro16-8",
    ]);
  });
  it("returns the 4 QF matchups", () => {
    expect(matchupsForRound("qf").map((m) => m.id)).toEqual(["qf-1", "qf-2", "qf-3", "qf-4"]);
  });
  it("returns the 2 SF matchups", () => {
    expect(matchupsForRound("sf").map((m) => m.id)).toEqual(["sf-1", "sf-2"]);
  });
  it("returns the 1 Final matchup", () => {
    expect(matchupsForRound("final").map((m) => m.id)).toEqual(["final"]);
  });
});

describe("matchupById", () => {
  it("returns the matchup definition for a known id", () => {
    expect(matchupById("qf-1")).toEqual({ id: "qf-1", round: "qf", feedsInto: "sf-1" });
  });
  it("throws for an unknown id", () => {
    expect(() => matchupById("not-real" as MatchupId)).toThrow("Unknown matchup id: not-real");
  });
});

describe("childrenOf", () => {
  it("returns the two RO16 matchups that feed a QF matchup", () => {
    expect(childrenOf("qf-1")).toEqual(["ro16-1", "ro16-2"]);
  });
  it("returns the two QF matchups that feed an SF matchup", () => {
    expect(childrenOf("sf-2")).toEqual(["qf-3", "qf-4"]);
  });
  it("returns the two SF matchups that feed the Final", () => {
    expect(childrenOf("final")).toEqual(["sf-1", "sf-2"]);
  });
  it("returns null for an RO16 matchup (nothing feeds it)", () => {
    expect(childrenOf("ro16-1")).toBeNull();
  });
});

describe("nextRound / previousRound", () => {
  it("walks ro16 -> qf -> sf -> final", () => {
    expect(nextRound("ro16")).toBe("qf");
    expect(nextRound("qf")).toBe("sf");
    expect(nextRound("sf")).toBe("final");
    expect(nextRound("final")).toBeNull();
  });
  it("walks final -> sf -> qf -> ro16", () => {
    expect(previousRound("final")).toBe("sf");
    expect(previousRound("sf")).toBe("qf");
    expect(previousRound("qf")).toBe("ro16");
    expect(previousRound("ro16")).toBeNull();
  });
  it("ROUND_ORDER lists all four rounds in bracket order", () => {
    expect(ROUND_ORDER).toEqual(["ro16", "qf", "sf", "final"]);
  });
});
