import { describe, it, expect } from "vitest";
import { shouldDisableBilling } from "./actionGuard.js";

const base = {
  costAmount: 1.65,
  budgetAmount: 1,
  billingEnabled: true,
  lastActionedCost: null,
  highestKnownBudget: null,
};

describe("shouldDisableBilling", () => {
  it("does nothing when cost is within budget", () => {
    expect(shouldDisableBilling({ ...base, costAmount: 0.5 })).toBe(false);
  });

  it("does nothing when billing is already disabled", () => {
    expect(shouldDisableBilling({ ...base, billingEnabled: false })).toBe(false);
  });

  it("acts on the first-ever trip, with no prior action recorded", () => {
    expect(shouldDisableBilling({ ...base, lastActionedCost: null })).toBe(true);
  });

  it("stands down on a stale re-notification of the exact same overage", () => {
    expect(shouldDisableBilling({ ...base, costAmount: 1.65, lastActionedCost: 1.65 })).toBe(false);
  });

  it("acts again when cost has genuinely risen since the last action", () => {
    expect(shouldDisableBilling({ ...base, costAmount: 1.75, lastActionedCost: 1.65 })).toBe(true);
  });

  it("acts when cost is lower than last time — a new billing period started", () => {
    expect(shouldDisableBilling({ ...base, costAmount: 1.02, lastActionedCost: 1.65 })).toBe(true);
  });

  it("this is exactly the 2026-09-09 trip #4 scenario: re-link into a still-stale month, now suppressed", () => {
    // Trip #3 disabled billing at cost 1.65. Mert re-links to deploy a fix.
    // 12 minutes later Google re-reports the same 1.65 month-to-date total —
    // nothing new happened, so this must NOT disable billing again.
    expect(
      shouldDisableBilling({ costAmount: 1.65, budgetAmount: 1, billingEnabled: true, lastActionedCost: 1.65 })
    ).toBe(false);
  });

  it("ignores a message reporting a lower budget than one already seen — the 2026-09-10 outage #6 scenario", () => {
    // Real trace, 2026-09-10 13:13:07: a fresh notification correctly
    // reported budget=2 (the real, current figure) and was a no-op. 0.35s
    // later a second, stale notification arrived reporting budget=1 (the
    // pre-raise figure — Pub/Sub gives no ordering guarantee, especially
    // draining a backlog from hours earlier) and disabled billing anyway,
    // because the old guard only reasoned about whether *cost* had moved,
    // never whether the *budget figure itself* was already superseded.
    // Once we've seen budget=2 for real, a later message claiming budget=1
    // must never be trusted again, regardless of what cost it reports.
    expect(
      shouldDisableBilling({
        costAmount: 1.65,
        budgetAmount: 1,
        billingEnabled: true,
        lastActionedCost: 1.67,
        highestKnownBudget: 2,
      })
    ).toBe(false);
  });

  it("still acts normally when the incoming budget matches the highest known one", () => {
    expect(
      shouldDisableBilling({
        costAmount: 2.5,
        budgetAmount: 2,
        billingEnabled: true,
        lastActionedCost: 1.67,
        highestKnownBudget: 2,
      })
    ).toBe(true);
  });

  it("raises the bar: a message with a higher budget than ever seen is trusted", () => {
    expect(
      shouldDisableBilling({
        costAmount: 12,
        budgetAmount: 10,
        billingEnabled: true,
        lastActionedCost: 1.67,
        highestKnownBudget: 2,
      })
    ).toBe(true);
  });
});
