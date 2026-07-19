import { renderHook } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useTournamentPhase } from "./useTournamentPhase";

function setDebugDate(date: string) {
  window.history.pushState({}, "", `?debugDate=${date}`);
}

describe("useTournamentPhase", () => {
  afterEach(() => {
    window.history.pushState({}, "", "/");
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
    vi.stubEnv("DEV", false);
    setDebugDate("2026-09-08");
    const { result } = renderHook(() => useTournamentPhase());
    // With DEV false, debug override is ignored, real Date is used (today in 2026 is before cutoff)
    expect(result.current).toBe("pre");
    vi.unstubAllEnvs();
  });
});
