import { describe, it, expect } from "vitest";
import { shouldDisableBilling } from "./actionGuard.js";

const base = { costAmount: 1.65, budgetAmount: 1, billingEnabled: true, lastActionedCost: null };

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
});
