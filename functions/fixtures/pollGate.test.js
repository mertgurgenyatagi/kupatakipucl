import { describe, it, expect } from "vitest";
import { shouldPoll, isWithinLiveWindow, LIVE_WINDOW_MS, SPARSE_INTERVAL_MS } from "./pollGate.js";

const NOW = new Date("2026-09-08T18:00:00Z").getTime();
const fixture = (kickoffUtc) => ({ kickoffUtc });

describe("isWithinLiveWindow", () => {
  it("is true for a fixture that kicked off minutes ago", () => {
    expect(isWithinLiveWindow(NOW, [fixture("2026-09-08T17:45:00Z")])).toBe(true);
  });

  it("is true right up to the edge of the window (kickoff + 3.5h)", () => {
    const kickoffMs = NOW - LIVE_WINDOW_MS;
    expect(isWithinLiveWindow(NOW, [fixture(new Date(kickoffMs).toISOString())])).toBe(true);
  });

  it("is false just past the edge of the window", () => {
    const kickoffMs = NOW - LIVE_WINDOW_MS - 1000;
    expect(isWithinLiveWindow(NOW, [fixture(new Date(kickoffMs).toISOString())])).toBe(false);
  });

  it("is false with no fixtures at all", () => {
    expect(isWithinLiveWindow(NOW, [])).toBe(false);
  });

  it("is true if any one of several fixtures is live, even if others aren't", () => {
    const longAgo = new Date(NOW - LIVE_WINDOW_MS - 60_000).toISOString();
    const recent = new Date(NOW - 60_000).toISOString();
    expect(isWithinLiveWindow(NOW, [fixture(longAgo), fixture(recent)])).toBe(true);
  });
});

describe("shouldPoll", () => {
  it("polls when inside a live window, regardless of how recently synced", () => {
    expect(shouldPoll(NOW, [fixture("2026-09-08T17:45:00Z")], NOW - 1000)).toBe(true);
  });

  it("does not poll when nothing is live and the sparse interval hasn't elapsed", () => {
    expect(shouldPoll(NOW, [], NOW - 1000)).toBe(false);
  });

  it("polls once the sparse interval has elapsed, even with nothing live", () => {
    expect(shouldPoll(NOW, [], NOW - SPARSE_INTERVAL_MS)).toBe(true);
  });

  it("polls when never synced before (lastSyncedAtMs is null)", () => {
    expect(shouldPoll(NOW, [], null)).toBe(true);
  });
});
