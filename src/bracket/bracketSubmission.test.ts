import { describe, it, expect } from "vitest";
import { teamsInMatchupForPicks, pickWinner, isSubmissionComplete } from "./bracketSubmission";
import { MatchupId } from "./bracketStructure";

describe("teamsInMatchupForPicks", () => {
  it("returns the drawn teams for an RO16 matchup regardless of picks", () => {
    const ro16Teams = { "ro16-1": ["Arsenal", "Napoli"] as [string, string] };
    expect(teamsInMatchupForPicks("ro16-1", ro16Teams, {})).toEqual(["Arsenal", "Napoli"]);
  });

  it("returns [null, null] for an undrawn RO16 matchup", () => {
    expect(teamsInMatchupForPicks("ro16-1", {}, {})).toEqual([null, null]);
  });

  it("derives a QF matchup's teams from the user's own RO16 picks", () => {
    const picks = { "ro16-1": "Arsenal", "ro16-2": "Real Madrid" };
    expect(teamsInMatchupForPicks("qf-1", {}, picks)).toEqual(["Arsenal", "Real Madrid"]);
  });

  it("returns a partial pair when only one feeder has been picked", () => {
    const picks = { "ro16-1": "Arsenal" };
    expect(teamsInMatchupForPicks("qf-1", {}, picks)).toEqual(["Arsenal", null]);
  });

  it("returns [null, null] for a QF matchup with no feeder picks yet", () => {
    expect(teamsInMatchupForPicks("qf-1", {}, {})).toEqual([null, null]);
  });

  it("derives the Final's teams from the user's own SF picks", () => {
    const picks = { "sf-1": "Arsenal", "sf-2": "Bayern" };
    expect(teamsInMatchupForPicks("final", {}, picks)).toEqual(["Arsenal", "Bayern"]);
  });
});

describe("pickWinner", () => {
  it("sets the pick for the given matchup", () => {
    const result = pickWinner({}, "ro16-1", "Arsenal");
    expect(result["ro16-1"]).toBe("Arsenal");
  });

  it("does not mutate the input object", () => {
    const original = { "ro16-1": "Napoli" };
    pickWinner(original, "ro16-1", "Arsenal");
    expect(original["ro16-1"]).toBe("Napoli");
  });

  it("clears the downstream QF pick when an RO16 pick changes", () => {
    const picks = { "ro16-1": "Arsenal", "qf-1": "Arsenal" };
    const result = pickWinner(picks, "ro16-1", "Napoli");
    expect(result["ro16-1"]).toBe("Napoli");
    expect(result["qf-1"]).toBeUndefined();
  });

  it("cascades the clear through QF, SF, and Final when an RO16 pick changes", () => {
    const picks = {
      "ro16-1": "Arsenal",
      "qf-1": "Arsenal",
      "sf-1": "Arsenal",
      final: "Arsenal",
    };
    const result = pickWinner(picks, "ro16-1", "Napoli");
    expect(result["qf-1"]).toBeUndefined();
    expect(result["sf-1"]).toBeUndefined();
    expect(result.final).toBeUndefined();
  });

  it("does not clear sibling branches untouched by the cascade", () => {
    const picks = {
      "ro16-1": "Arsenal",
      "ro16-3": "Napoli",
      "qf-1": "Arsenal",
      "qf-2": "Napoli",
    };
    const result = pickWinner(picks, "ro16-1", "Real Madrid");
    expect(result["qf-1"]).toBeUndefined();
    expect(result["qf-2"]).toBe("Napoli");
    expect(result["ro16-3"]).toBe("Napoli");
  });

  it("clears a downstream pick when re-picking the Final itself (no cascade needed, but overwrite still works)", () => {
    const picks = { final: "Arsenal" };
    const result = pickWinner(picks, "final", "Bayern");
    expect(result.final).toBe("Bayern");
  });
});

describe("isSubmissionComplete", () => {
  it("returns false when no picks have been made", () => {
    expect(isSubmissionComplete({})).toBe(false);
  });

  it("returns false when only some picks have been made", () => {
    const picks: Partial<Record<MatchupId, string>> = { "ro16-1": "Arsenal", "ro16-2": "Napoli" };
    expect(isSubmissionComplete(picks)).toBe(false);
  });

  it("returns true when all 15 matchups have a pick", () => {
    const picks: Partial<Record<MatchupId, string>> = {
      "ro16-1": "A", "ro16-2": "B", "ro16-3": "C", "ro16-4": "D",
      "ro16-5": "E", "ro16-6": "F", "ro16-7": "G", "ro16-8": "H",
      "qf-1": "A", "qf-2": "C", "qf-3": "E", "qf-4": "G",
      "sf-1": "A", "sf-2": "E",
      final: "A",
    };
    expect(isSubmissionComplete(picks)).toBe(true);
  });
});
