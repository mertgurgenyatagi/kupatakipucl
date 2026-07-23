import { describe, it, expect } from "vitest";
import { isPageAllowed } from "./pageAccess";

describe("isPageAllowed", () => {
  it("blocks every gated page for loggedout_notstarted", () => {
    expect(isPageAllowed("predictions", "loggedout_notstarted")).toBe(false);
    expect(isPageAllowed("leaderboard", "loggedout_notstarted")).toBe(false);
    expect(isPageAllowed("chat", "loggedout_notstarted")).toBe(false);
    expect(isPageAllowed("forum", "loggedout_notstarted")).toBe(false);
    expect(isPageAllowed("stats", "loggedout_notstarted")).toBe(false);
  });

  it("allows predictions, chat and forum (not leaderboard/stats) for loggedin_notstarted", () => {
    expect(isPageAllowed("predictions", "loggedin_notstarted")).toBe(true);
    expect(isPageAllowed("chat", "loggedin_notstarted")).toBe(true);
    expect(isPageAllowed("forum", "loggedin_notstarted")).toBe(true);
    expect(isPageAllowed("leaderboard", "loggedin_notstarted")).toBe(false);
    expect(isPageAllowed("stats", "loggedin_notstarted")).toBe(false);
  });

  it("allows leaderboard but not forum/stats/chat/predictions for a logged-out visitor once started, in every started phase", () => {
    for (const state of ["loggedout_leaguephase", "loggedout_preknockout", "loggedout_knockout"] as const) {
      expect(isPageAllowed("leaderboard", state)).toBe(true);
      expect(isPageAllowed("forum", state)).toBe(false);
      expect(isPageAllowed("stats", state)).toBe(false);
      expect(isPageAllowed("chat", state)).toBe(false);
      expect(isPageAllowed("predictions", state)).toBe(false);
    }
  });

  it("allows every gated page for a logged-in visitor in every started phase", () => {
    for (const state of ["loggedin_leaguephase", "loggedin_preknockout", "loggedin_knockout"] as const) {
      expect(isPageAllowed("predictions", state)).toBe(true);
      expect(isPageAllowed("leaderboard", state)).toBe(true);
      expect(isPageAllowed("chat", state)).toBe(true);
      expect(isPageAllowed("forum", state)).toBe(true);
      expect(isPageAllowed("stats", state)).toBe(true);
    }
  });
});
