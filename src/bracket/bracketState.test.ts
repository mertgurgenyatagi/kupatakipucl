import { describe, it, expect } from "vitest";
import { BracketState, teamsInMatchup, stageReached } from "./bracketState";

function emptyState(): BracketState {
  return { ro16Teams: {}, winners: {} };
}

describe("teamsInMatchup", () => {
  it("returns the drawn teams for a populated RO16 matchup", () => {
    const state: BracketState = { ro16Teams: { "ro16-1": ["Arsenal", "Napoli"] }, winners: {} };
    expect(teamsInMatchup("ro16-1", state)).toEqual(["Arsenal", "Napoli"]);
  });

  it("returns [null, null] for an undrawn RO16 matchup", () => {
    expect(teamsInMatchup("ro16-1", emptyState())).toEqual([null, null]);
  });

  it("derives a QF matchup's teams from its two RO16 winners", () => {
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "ro16-2": "Real Madrid" },
    };
    expect(teamsInMatchup("qf-1", state)).toEqual(["Arsenal", "Real Madrid"]);
  });

  it("returns [null, null] for a QF matchup whose feeder RO16 games aren't decided yet", () => {
    expect(teamsInMatchup("qf-1", emptyState())).toEqual([null, null]);
  });

  it("returns a partial pair when only one feeder is decided", () => {
    const state: BracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };
    expect(teamsInMatchup("qf-1", state)).toEqual(["Arsenal", null]);
  });

  it("derives the Final's teams from the two SF winners", () => {
    const state: BracketState = {
      ro16Teams: {},
      winners: { "sf-1": "Arsenal", "sf-2": "Bayern" },
    };
    expect(teamsInMatchup("final", state)).toEqual(["Arsenal", "Bayern"]);
  });
});

describe("stageReached", () => {
  it("returns null for a team that hasn't won anything", () => {
    expect(stageReached("Arsenal", emptyState())).toBeNull();
  });

  it("returns 'qf' for a team that won only its RO16 matchup", () => {
    const state: BracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };
    expect(stageReached("Arsenal", state)).toBe("qf");
  });

  it("returns 'sf' for a team that also won its QF matchup", () => {
    const state: BracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal" } };
    expect(stageReached("Arsenal", state)).toBe("sf");
  });

  it("returns 'final' for a team that also won its SF matchup", () => {
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal", "sf-1": "Arsenal" },
    };
    expect(stageReached("Arsenal", state)).toBe("final");
  });

  it("returns 'champion' for a team that won the Final", () => {
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal", "sf-1": "Arsenal", final: "Arsenal" },
    };
    expect(stageReached("Arsenal", state)).toBe("champion");
  });

  it("takes the furthest stage regardless of object key order", () => {
    const state: BracketState = {
      ro16Teams: {},
      winners: { final: "Arsenal", "ro16-1": "Arsenal", "sf-1": "Arsenal", "qf-1": "Arsenal" },
    };
    expect(stageReached("Arsenal", state)).toBe("champion");
  });
});
