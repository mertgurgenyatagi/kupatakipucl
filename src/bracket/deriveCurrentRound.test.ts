import { describe, it, expect } from "vitest";
import { deriveCurrentRound } from "./deriveCurrentRound";
import { BracketState } from "./bracketState";

describe("deriveCurrentRound", () => {
  it("returns ro16 when no matchups have been decided yet", () => {
    const state: BracketState = { ro16Teams: {}, winners: {} };
    expect(deriveCurrentRound(state)).toBe("ro16");
  });

  it("returns ro16 while any RO16 matchup is still undecided", () => {
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "ro16-2": "Real Madrid" },
    };
    expect(deriveCurrentRound(state)).toBe("ro16");
  });

  it("returns qf once all 8 RO16 matchups are decided but no QF is", () => {
    const winners: Record<string, string> = {};
    for (let i = 1; i <= 8; i++) winners[`ro16-${i}`] = "Team";
    const state: BracketState = { ro16Teams: {}, winners };
    expect(deriveCurrentRound(state)).toBe("qf");
  });

  it("returns sf once RO16 and QF are fully decided", () => {
    const winners: Record<string, string> = {};
    for (let i = 1; i <= 8; i++) winners[`ro16-${i}`] = "Team";
    for (let i = 1; i <= 4; i++) winners[`qf-${i}`] = "Team";
    const state: BracketState = { ro16Teams: {}, winners };
    expect(deriveCurrentRound(state)).toBe("sf");
  });

  it("returns final once RO16, QF, and SF are fully decided", () => {
    const winners: Record<string, string> = {};
    for (let i = 1; i <= 8; i++) winners[`ro16-${i}`] = "Team";
    for (let i = 1; i <= 4; i++) winners[`qf-${i}`] = "Team";
    winners["sf-1"] = "Team";
    winners["sf-2"] = "Team";
    const state: BracketState = { ro16Teams: {}, winners };
    expect(deriveCurrentRound(state)).toBe("final");
  });

  it("still returns final once the champion is decided (nothing further to advance to)", () => {
    const winners: Record<string, string> = {};
    for (let i = 1; i <= 8; i++) winners[`ro16-${i}`] = "Team";
    for (let i = 1; i <= 4; i++) winners[`qf-${i}`] = "Team";
    winners["sf-1"] = "Team";
    winners["sf-2"] = "Team";
    winners.final = "Team";
    const state: BracketState = { ro16Teams: {}, winners };
    expect(deriveCurrentRound(state)).toBe("final");
  });
});
