import { describe, it, expect } from "vitest";
import { isPageAllowed } from "./pageAccess";

describe("isPageAllowed", () => {
  it("blocks every gated page for loggedout_notstarted", () => {
    expect(isPageAllowed("predictions", "loggedout_notstarted")).toBe(false);
    expect(isPageAllowed("leaderboard", "loggedout_notstarted")).toBe(false);
    expect(isPageAllowed("forum", "loggedout_notstarted")).toBe(false);
    expect(isPageAllowed("stats", "loggedout_notstarted")).toBe(false);
  });

  it("allows predictions and forum (not leaderboard/stats) for loggedin_notstarted", () => {
    expect(isPageAllowed("predictions", "loggedin_notstarted")).toBe(true);
    expect(isPageAllowed("forum", "loggedin_notstarted")).toBe(true);
    expect(isPageAllowed("leaderboard", "loggedin_notstarted")).toBe(false);
    expect(isPageAllowed("stats", "loggedin_notstarted")).toBe(false);
  });

  it("allows forum (not leaderboard/stats/predictions) for a logged-out visitor once started, in every started phase", () => {
    for (const state of ["loggedout_leaguephase", "loggedout_preknockout", "loggedout_knockout"] as const) {
      expect(isPageAllowed("leaderboard", state)).toBe(false);
      expect(isPageAllowed("forum", state)).toBe(true);
      expect(isPageAllowed("stats", state)).toBe(false);
      expect(isPageAllowed("predictions", state)).toBe(false);
    }
  });

  it("allows every gated page for a logged-in visitor in every started phase", () => {
    for (const state of ["loggedin_leaguephase", "loggedin_preknockout", "loggedin_knockout"] as const) {
      expect(isPageAllowed("predictions", state)).toBe(true);
      expect(isPageAllowed("leaderboard", state)).toBe(true);
      expect(isPageAllowed("forum", state)).toBe(true);
      expect(isPageAllowed("stats", state)).toBe(true);
    }
  });

  /**
   * Narrowed 2026-08-27. The bracket renders invented pairings until the
   * real Round of 16 is drawn, so offering it during 'notstarted' or the
   * league phase means collecting predictions against a draw that has not
   * happened.
   */
  it("allows knockout predictions only in the knockout phases, and only logged in", () => {
    expect(isPageAllowed("knockoutPredictions", "loggedin_notstarted")).toBe(false);
    expect(isPageAllowed("knockoutPredictions", "loggedin_leaguephase")).toBe(false);
    expect(isPageAllowed("knockoutPredictions", "loggedin_preknockout")).toBe(true);
    expect(isPageAllowed("knockoutPredictions", "loggedin_knockout")).toBe(true);

    for (const state of [
      "loggedout_notstarted",
      "loggedout_leaguephase",
      "loggedout_preknockout",
      "loggedout_knockout",
    ] as const) {
      expect(isPageAllowed("knockoutPredictions", state)).toBe(false);
    }
  });

  it("allows profile for every logged-in state and blocks it for every logged-out state", () => {
    for (const state of [
      "loggedin_notstarted",
      "loggedin_leaguephase",
      "loggedin_preknockout",
      "loggedin_knockout",
    ] as const) {
      expect(isPageAllowed("profile", state)).toBe(true);
    }
    for (const state of [
      "loggedout_notstarted",
      "loggedout_leaguephase",
      "loggedout_preknockout",
      "loggedout_knockout",
    ] as const) {
      expect(isPageAllowed("profile", state)).toBe(false);
    }
  });
});
