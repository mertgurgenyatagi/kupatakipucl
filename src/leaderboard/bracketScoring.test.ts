import { describe, it, expect } from "vitest";
import { computeBracketScore, BRACKET_POINTS } from "./bracketScoring";
import { BracketState } from "../bracket/bracketState";

describe("BRACKET_POINTS", () => {
  it("is keyed one round earlier than the spec's stage-reached table, since winning a matchup of round R is what makes a team reach the next stage", () => {
    // GREAT_LEAP_SPEC.md §5.3: reaching QF=3pts is earned by a correct RO16
    // pick, reaching SF=4pts by a correct QF pick, reaching Final=5pts by a
    // correct SF pick, and Champion=6pts by a correct Final pick.
    expect(BRACKET_POINTS.ro16).toBe(3);
    expect(BRACKET_POINTS.qf).toBe(4);
    expect(BRACKET_POINTS.sf).toBe(5);
    expect(BRACKET_POINTS.final).toBe(6);
  });
});

describe("computeBracketScore", () => {
  it("returns 0 when picks is undefined (no submission)", () => {
    const state: BracketState = { ro16Teams: {}, winners: {} };
    expect(computeBracketScore(undefined, state)).toBe(0);
  });

  it("returns 0 when no real winners are decided yet", () => {
    const picks = { "ro16-1": "Arsenal" } as Record<string, string>;
    const state: BracketState = { ro16Teams: {}, winners: {} };
    expect(computeBracketScore(picks as any, state)).toBe(0);
  });

  it("awards 3 points for a correctly predicted RO16 winner (team reaches QF)", () => {
    const picks = { "ro16-1": "Arsenal" } as Record<string, string>;
    const state: BracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };
    expect(computeBracketScore(picks as any, state)).toBe(3);
  });

  it("awards 0 for an incorrect RO16 pick", () => {
    const picks = { "ro16-1": "Napoli" } as Record<string, string>;
    const state: BracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal" } };
    expect(computeBracketScore(picks as any, state)).toBe(0);
  });

  it("awards 4 points for a correctly predicted QF winner (team reaches SF)", () => {
    const picks = { "qf-1": "Arsenal" } as Record<string, string>;
    const state: BracketState = { ro16Teams: {}, winners: { "qf-1": "Arsenal" } };
    expect(computeBracketScore(picks as any, state)).toBe(4);
  });

  it("stacks points across correctly-picked rounds for the same team (RO16 + QF = 7)", () => {
    const picks = { "ro16-1": "Arsenal", "qf-1": "Arsenal" } as Record<string, string>;
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal" },
    };
    expect(computeBracketScore(picks as any, state)).toBe(3 + 4);
  });

  it("awards the full 18 points for a team correctly predicted to win it all (RO16+QF+SF+Final)", () => {
    const picks = {
      "ro16-1": "Arsenal",
      "qf-1": "Arsenal",
      "sf-1": "Arsenal",
      final: "Arsenal",
    } as Record<string, string>;
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal", "sf-1": "Arsenal", final: "Arsenal" },
    };
    expect(computeBracketScore(picks as any, state)).toBe(3 + 4 + 5 + 6);
  });

  it("awards 6 points for a correctly predicted Final winner (Champion)", () => {
    const picks = { final: "Arsenal" } as Record<string, string>;
    const state: BracketState = { ro16Teams: {}, winners: { final: "Arsenal" } };
    expect(computeBracketScore(picks as any, state)).toBe(6);
  });

  it("stops awarding once a team's predicted run diverges from reality, even if earlier rounds were right (RO16+QF correct, SF wrong = 7)", () => {
    const picks = {
      "ro16-1": "Arsenal",
      "qf-1": "Arsenal",
      "sf-1": "Arsenal",
    } as Record<string, string>;
    const state: BracketState = {
      ro16Teams: {},
      winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal", "sf-1": "Bayern" },
    };
    expect(computeBracketScore(picks as any, state)).toBe(3 + 4);
  });

  it("ignores matchups the user didn't pick", () => {
    const picks = { "qf-1": "Arsenal" } as Record<string, string>;
    const state: BracketState = { ro16Teams: {}, winners: { "ro16-1": "Arsenal", "qf-1": "Arsenal" } };
    expect(computeBracketScore(picks as any, state)).toBe(4);
  });
});
