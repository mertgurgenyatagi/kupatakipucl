import { describe, it, expect } from "vitest";
import {
  DEBOUNCE_MS,
  MAX_STALENESS_MS,
  COVERED_SKEW_MS,
  shouldSkipAlreadyCovered,
  shouldProceedAfterDebounce,
  shouldCommitRecompute,
} from "./recomputeGuard.js";

describe("recomputeGuard constants", () => {
  it("uses the debounce and ceiling values the design specifies", () => {
    expect(DEBOUNCE_MS).toBe(2000);
    expect(MAX_STALENESS_MS).toBe(30000);
  });
});

describe("shouldSkipAlreadyCovered", () => {
  it("does not skip when nothing has ever been computed", () => {
    expect(shouldSkipAlreadyCovered(null, 1_000_000)).toBe(false);
    expect(shouldSkipAlreadyCovered({}, 1_000_000)).toBe(false);
  });

  // The case this guard exists for: every other document in the same batch
  // committed before the recompute that has already run, so their triggers have
  // provably nothing left to contribute.
  it("skips when a finished compute began after this event was committed", () => {
    const control = { lastComputeReadStartedAt: 1_000_000 };
    expect(shouldSkipAlreadyCovered(control, 1_000_000 - COVERED_SKEW_MS - 1)).toBe(true);
  });

  it("does not skip when the last compute began before this event was committed", () => {
    const control = { lastComputeReadStartedAt: 1_000_000 };
    expect(shouldSkipAlreadyCovered(control, 1_000_500)).toBe(false);
  });

  // Prefers a redundant recompute over a missed one: event times come from
  // Eventarc and readStartedAt from the function's own clock, so a margin keeps
  // millisecond skew from silently dropping a real update.
  it("does not skip inside the clock-skew margin", () => {
    const control = { lastComputeReadStartedAt: 1_000_000 };
    expect(shouldSkipAlreadyCovered(control, 1_000_000 - COVERED_SKEW_MS + 1)).toBe(false);
  });

  it("does not skip when the event time is unknown", () => {
    const control = { lastComputeReadStartedAt: 1_000_000 };
    expect(shouldSkipAlreadyCovered(control, undefined)).toBe(false);
  });
});

describe("shouldProceedAfterDebounce", () => {
  it("proceeds when no control doc exists yet", () => {
    expect(shouldProceedAfterDebounce(null, "me", 1000)).toBe(true);
  });

  it("proceeds when this invocation still holds the newest token", () => {
    const control = { requestToken: "me", requestedAt: 500, computedAt: 400 };
    expect(shouldProceedAfterDebounce(control, "me", 2500)).toBe(true);
  });

  // This is the step that collapses a 36-doc results batch into one recompute.
  it("stands down when a newer request has taken the token", () => {
    const control = { requestToken: "someone-newer", requestedAt: 900, computedAt: 800 };
    expect(shouldProceedAfterDebounce(control, "me", 2500)).toBe(false);
  });

  // Without this, a sustained write stream means no request is ever the newest
  // at its own wake-up, so the leaderboard would stop updating entirely for as
  // long as the load lasted.
  it("proceeds despite a newer token once the stored result breaches the staleness ceiling", () => {
    const control = { requestToken: "someone-newer", requestedAt: 900, computedAt: 1000 };
    expect(shouldProceedAfterDebounce(control, "me", 1000 + MAX_STALENESS_MS)).toBe(true);
  });

  it("treats a never-computed leaderboard as maximally stale and proceeds", () => {
    const control = { requestToken: "someone-newer", requestedAt: 900 };
    expect(shouldProceedAfterDebounce(control, "me", 2500)).toBe(true);
  });
});

describe("shouldCommitRecompute", () => {
  it("commits when no control doc exists yet", () => {
    expect(shouldCommitRecompute(null, 5000)).toBe(true);
  });

  it("commits when nothing moved under this read", () => {
    const control = { requestedAt: 4000, lastComputeReadStartedAt: 3000 };
    expect(shouldCommitRecompute(control, 5000)).toBe(true);
  });

  // Guard (a): a newer request landed after this read began, so it will produce
  // a fresher result -- let it win rather than storing known-stale data.
  it("aborts when inputs changed after this read began", () => {
    const control = { requestedAt: 6000, lastComputeReadStartedAt: 3000 };
    expect(shouldCommitRecompute(control, 5000)).toBe(false);
  });

  // Guard (b) -- the load-bearing property. The staleness ceiling deliberately
  // allows concurrent recomputes, so without this an older read could land last
  // and silently erase a newer one: exactly the lost-update race this whole
  // design exists to remove.
  it("aborts when a compute from a fresher read has already landed", () => {
    const control = { requestedAt: 4000, lastComputeReadStartedAt: 7000 };
    expect(shouldCommitRecompute(control, 5000)).toBe(false);
  });

  it("commits when the stored compute came from this very same read", () => {
    const control = { requestedAt: 4000, lastComputeReadStartedAt: 5000 };
    expect(shouldCommitRecompute(control, 5000)).toBe(true);
  });

  it("treats absent numeric fields as zero rather than NaN-comparing them", () => {
    expect(shouldCommitRecompute({}, 5000)).toBe(true);
  });
});
