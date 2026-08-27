import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useKnockoutPicks } from "./useKnockoutPicks";

/**
 * The bracket's rules, tested directly rather than through either layout.
 *
 * Both brackets (desktop's mirrored halves, mobile's one-sided scroller) now
 * share this hook, so these are the assertions that keep them agreeing. The
 * eviction cases are the ones worth having: they are the reason this is a
 * state machine and not four `useState`s, and they are invisible in any
 * screenshot.
 */
describe("useKnockoutPicks", () => {
  it("starts empty and incomplete", () => {
    const { result } = renderHook(() => useKnockoutPicks());
    expect(result.current.r16Picks).toEqual(Array(8).fill(null));
    expect(result.current.qfPicks).toEqual(Array(4).fill(null));
    expect(result.current.sfPicks).toEqual(Array(2).fill(null));
    expect(result.current.championPick).toBeNull();
    expect(result.current.isComplete).toBe(false);
    expect(result.current.toPrediction()).toBeNull();
  });

  it("seeds from an existing prediction", () => {
    const { result } = renderHook(() =>
      useKnockoutPicks({
        quarterFinalists: ["a", "b", "c", "d", "e", "f", "g", "h"],
        semiFinalists: ["a", "c", "e", "g"],
        finalists: ["a", "e"],
        champion: "a",
        submittedAt: 1,
        updatedAt: 2,
      })
    );
    expect(result.current.championPick).toBe("a");
    expect(result.current.isComplete).toBe(true);
    expect(result.current.toPrediction()).toEqual({
      quarterFinalists: ["a", "b", "c", "d", "e", "f", "g", "h"],
      semiFinalists: ["a", "c", "e", "g"],
      finalists: ["a", "e"],
      champion: "a",
    });
  });

  it("toggles a pick off when the same team is picked twice", () => {
    const { result } = renderHook(() => useKnockoutPicks());
    act(() => result.current.pickR16(0, "real-madrid"));
    expect(result.current.r16Picks[0]).toBe("real-madrid");
    act(() => result.current.pickR16(0, "real-madrid"));
    expect(result.current.r16Picks[0]).toBeNull();
  });

  // The rule that makes this a machine: a team removed from an early round
  // cannot survive in a later one, or the bracket claims a final between a
  // team that isn't in it.
  it("evicts a team from every later round when it is deselected at R16", () => {
    const { result } = renderHook(() => useKnockoutPicks());
    act(() => result.current.pickR16(0, "aek-athens"));
    act(() => result.current.pickQf(0, "aek-athens"));
    act(() => result.current.pickSf(0, "aek-athens"));
    act(() => result.current.pickChampion("aek-athens"));
    expect(result.current.championPick).toBe("aek-athens");

    act(() => result.current.pickR16(0, "aek-athens")); // deselect

    expect(result.current.r16Picks[0]).toBeNull();
    expect(result.current.qfPicks[0]).toBeNull();
    expect(result.current.sfPicks[0]).toBeNull();
    expect(result.current.championPick).toBeNull();
  });

  it("evicts the replaced team when an R16 slot is overwritten", () => {
    const { result } = renderHook(() => useKnockoutPicks());
    act(() => result.current.pickR16(0, "aek-athens"));
    act(() => result.current.pickQf(0, "aek-athens"));
    act(() => result.current.pickChampion("aek-athens"));

    act(() => result.current.pickR16(0, "stuttgart")); // the other side wins instead

    expect(result.current.r16Picks[0]).toBe("stuttgart");
    expect(result.current.qfPicks[0]).toBeNull();
    expect(result.current.championPick).toBeNull();
  });

  it("clears the champion when the quarter-final pick that produced them changes", () => {
    const { result } = renderHook(() => useKnockoutPicks());
    act(() => result.current.pickQf(0, "inter-milan"));
    act(() => result.current.pickChampion("inter-milan"));
    act(() => result.current.pickQf(0, "roma"));
    expect(result.current.championPick).toBeNull();
  });

  it("clears the champion when their semi-final pick is deselected", () => {
    const { result } = renderHook(() => useKnockoutPicks());
    act(() => result.current.pickSf(1, "napoli"));
    act(() => result.current.pickChampion("napoli"));
    act(() => result.current.pickSf(1, "napoli")); // deselect
    expect(result.current.sfPicks[1]).toBeNull();
    expect(result.current.championPick).toBeNull();
  });

  it("reports complete and produces a payload only once every round is filled", () => {
    const { result } = renderHook(() => useKnockoutPicks());
    const eight = ["a", "b", "c", "d", "e", "f", "g", "h"];
    eight.forEach((id, i) => act(() => result.current.pickR16(i, id)));
    expect(result.current.isComplete).toBe(false);

    ["a", "c", "e", "g"].forEach((id, i) => act(() => result.current.pickQf(i, id)));
    ["a", "e"].forEach((id, i) => act(() => result.current.pickSf(i, id)));
    expect(result.current.isComplete).toBe(false);

    act(() => result.current.pickChampion("a"));
    expect(result.current.isComplete).toBe(true);
    expect(result.current.toPrediction()).toEqual({
      quarterFinalists: eight,
      semiFinalists: ["a", "c", "e", "g"],
      finalists: ["a", "e"],
      champion: "a",
    });
  });

  it("reset empties every round", () => {
    const { result } = renderHook(() => useKnockoutPicks());
    act(() => result.current.pickR16(3, "porto"));
    act(() => result.current.pickChampion("porto"));
    act(() => result.current.reset());
    expect(result.current.r16Picks).toEqual(Array(8).fill(null));
    expect(result.current.championPick).toBeNull();
    expect(result.current.isComplete).toBe(false);
  });
});
