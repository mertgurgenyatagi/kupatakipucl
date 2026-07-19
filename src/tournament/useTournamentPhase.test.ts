import { renderHook } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useTournamentPhase } from "./useTournamentPhase";

function setDebugDate(date: string) {
  window.history.pushState({}, "", `?debugDate=${date}`);
}

describe("useTournamentPhase", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("reports pre before the cutoff via debug override", () => {
    setDebugDate("2026-01-01");
    const { result } = renderHook(() => useTournamentPhase());
    expect(result.current).toBe("pre");
  });

  it("reports post at/after the cutoff via debug override", () => {
    setDebugDate("2026-09-08");
    const { result } = renderHook(() => useTournamentPhase());
    expect(result.current).toBe("post");
  });

  it("ignores debug override when DEV is false", () => {
    vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
    vi.stubEnv("DEV", false);
    setDebugDate("2026-09-08");
    const { result } = renderHook(() => useTournamentPhase());
    // With DEV false, debug override is ignored, real Date is used (frozen before cutoff)
    expect(result.current).toBe("pre");
  });
});
