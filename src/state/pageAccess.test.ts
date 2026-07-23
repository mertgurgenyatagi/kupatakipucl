import { describe, it, expect } from "vitest";
import { isPageAllowed } from "./pageAccess";

describe("isPageAllowed", () => {
  it("blocks every gated page for NST_NLI", () => {
    expect(isPageAllowed("predictions", "NST_NLI")).toBe(false);
    expect(isPageAllowed("leaderboard", "NST_NLI")).toBe(false);
    expect(isPageAllowed("chat", "NST_NLI")).toBe(false);
    expect(isPageAllowed("forum", "NST_NLI")).toBe(false);
    expect(isPageAllowed("stats", "NST_NLI")).toBe(false);
  });

  it("allows predictions, chat and forum (not leaderboard/stats) for NST_LI", () => {
    expect(isPageAllowed("predictions", "NST_LI")).toBe(true);
    expect(isPageAllowed("chat", "NST_LI")).toBe(true);
    expect(isPageAllowed("forum", "NST_LI")).toBe(true);
    expect(isPageAllowed("leaderboard", "NST_LI")).toBe(false);
    expect(isPageAllowed("stats", "NST_LI")).toBe(false);
  });

  it("allows leaderboard and forum but not stats, chat or predictions for ST_NLI", () => {
    expect(isPageAllowed("leaderboard", "ST_NLI")).toBe(true);
    expect(isPageAllowed("forum", "ST_NLI")).toBe(true);
    expect(isPageAllowed("stats", "ST_NLI")).toBe(false);
    expect(isPageAllowed("chat", "ST_NLI")).toBe(false);
    expect(isPageAllowed("predictions", "ST_NLI")).toBe(false);
  });

  it("allows every gated page for ST_LI", () => {
    expect(isPageAllowed("predictions", "ST_LI")).toBe(true);
    expect(isPageAllowed("leaderboard", "ST_LI")).toBe(true);
    expect(isPageAllowed("chat", "ST_LI")).toBe(true);
    expect(isPageAllowed("forum", "ST_LI")).toBe(true);
    expect(isPageAllowed("stats", "ST_LI")).toBe(true);
  });
});
