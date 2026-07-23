import { describe, it, expect } from "vitest";
import { getVisibilityState } from "./visibilityState";
import { TournamentPhase } from "../tournament/tournamentPhase";

const PHASES: TournamentPhase[] = ["notstarted", "leaguephase", "preknockout", "knockout"];

describe("getVisibilityState", () => {
  it.each(PHASES)("returns loggedout_%s when logged out", (phase) => {
    expect(getVisibilityState(false, phase)).toBe(`loggedout_${phase}`);
  });

  it.each(PHASES)("returns loggedin_%s when logged in", (phase) => {
    expect(getVisibilityState(true, phase)).toBe(`loggedin_${phase}`);
  });
});
