import { describe, expect, it } from "vitest";
import {
  RankerState,
  createRankerState,
  rankerReducer,
} from "./rankerState";

/** Three ranks, so a full board is short enough to read in an assertion. */
function state(ranking: (string | null)[], held: RankerState["held"] = null): RankerState {
  return { ranking, held };
}

describe("createRankerState", () => {
  it("starts empty when no initial order is given", () => {
    expect(createRankerState(3)).toEqual(state([null, null, null]));
  });

  it("pre-fills from a full-length initial order", () => {
    expect(createRankerState(3, ["a", "b", "c"])).toEqual(state(["a", "b", "c"]));
  });

  it("ignores an initial order of the wrong length", () => {
    expect(createRankerState(3, ["a", "b"])).toEqual(state([null, null, null]));
  });
});

describe("picking a team up", () => {
  it("holds a pool team", () => {
    const result = rankerReducer(state([null, null, null]), {
      type: "clickPoolTeam",
      teamId: "a",
    });
    expect(result).toEqual(state([null, null, null], { teamId: "a", origin: "pool" }));
  });

  it("holds a ranked team without moving it", () => {
    const result = rankerReducer(state(["a", null, null]), { type: "clickSlot", index: 0 });
    expect(result).toEqual(state(["a", null, null], { teamId: "a", origin: 0 }));
  });

  it("does nothing when an empty rank is clicked with nothing held", () => {
    const before = state(["a", null, null]);
    expect(rankerReducer(before, { type: "clickSlot", index: 1 })).toBe(before);
  });
});

describe("placing a held team", () => {
  it("places a pool team into an empty rank", () => {
    const before = state([null, null, null], { teamId: "a", origin: "pool" });
    expect(rankerReducer(before, { type: "clickSlot", index: 1 })).toEqual(
      state([null, "a", null])
    );
  });

  it("sends the occupant back to the pool when a pool team takes its rank", () => {
    const before = state(["a", null, null], { teamId: "b", origin: "pool" });
    expect(rankerReducer(before, { type: "clickSlot", index: 0 })).toEqual(
      state(["b", null, null])
    );
  });

  it("moves a ranked team to an empty rank, emptying the old one", () => {
    const before = state(["a", null, null], { teamId: "a", origin: 0 });
    expect(rankerReducer(before, { type: "clickSlot", index: 2 })).toEqual(
      state([null, null, "a"])
    );
  });

  it("swaps two ranked teams", () => {
    const before = state(["a", "b", null], { teamId: "b", origin: 1 });
    expect(rankerReducer(before, { type: "clickSlot", index: 0 })).toEqual(
      state(["b", "a", null])
    );
  });

  it("swaps a ranked team with a pool team", () => {
    const before = state(["a", null, null], { teamId: "a", origin: 0 });
    expect(rankerReducer(before, { type: "clickPoolTeam", teamId: "c" })).toEqual(
      state(["c", null, null])
    );
  });
});

describe("clearing the selection", () => {
  it("cancels when the held pool team is clicked again", () => {
    const before = state([null, null, null], { teamId: "a", origin: "pool" });
    expect(rankerReducer(before, { type: "clickPoolTeam", teamId: "a" })).toEqual(
      state([null, null, null])
    );
  });

  it("cancels when the held team's own rank is clicked again", () => {
    const before = state(["a", "b", null], { teamId: "a", origin: 0 });
    expect(rankerReducer(before, { type: "clickSlot", index: 0 })).toEqual(
      state(["a", "b", null])
    );
  });

  it("moves the selection to another pool team", () => {
    const before = state([null, null, null], { teamId: "a", origin: "pool" });
    expect(rankerReducer(before, { type: "clickPoolTeam", teamId: "b" })).toEqual(
      state([null, null, null], { teamId: "b", origin: "pool" })
    );
  });

  it("cancels on the explicit cancel action", () => {
    const before = state(["a", null, null], { teamId: "a", origin: 0 });
    expect(rankerReducer(before, { type: "cancel" })).toEqual(state(["a", null, null]));
  });

  it("is a no-op to cancel with nothing held", () => {
    const before = state(["a", null, null]);
    expect(rankerReducer(before, { type: "cancel" })).toBe(before);
  });
});

describe("the pool background", () => {
  it("returns a held ranked team to the pool, emptying its rank", () => {
    const before = state(["a", "b", null], { teamId: "a", origin: 0 });
    expect(rankerReducer(before, { type: "clickPoolBackground" })).toEqual(
      state([null, "b", null])
    );
  });

  it("just cancels when the held team came from the pool", () => {
    const before = state(["a", null, null], { teamId: "c", origin: "pool" });
    expect(rankerReducer(before, { type: "clickPoolBackground" })).toEqual(
      state(["a", null, null])
    );
  });

  it("is a no-op with nothing held", () => {
    const before = state(["a", null, null]);
    expect(rankerReducer(before, { type: "clickPoolBackground" })).toBe(before);
  });
});

describe("reset", () => {
  it("empties every rank and drops the selection", () => {
    const before = state(["a", "b", "c"], { teamId: "a", origin: 0 });
    expect(rankerReducer(before, { type: "reset" })).toEqual(state([null, null, null]));
  });
});

describe("a full 36-rank board", () => {
  it("swaps two distant ranks and leaves everything else alone", () => {
    const ranking = Array.from({ length: 36 }, (_, i) => `t${i}`);
    const before = state(ranking, { teamId: "t35", origin: 35 });
    const { ranking: after } = rankerReducer(before, { type: "clickSlot", index: 2 });

    expect(after[2]).toBe("t35");
    expect(after[35]).toBe("t2");
    expect(after.filter((id, i) => i !== 2 && i !== 35 && id !== `t${i}`)).toEqual([]);
  });
});
