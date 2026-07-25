import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCountdown } from "./useCountdown";

const TARGET = "2026-09-08T00:00:00+03:00";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes days/hours/minutes/seconds remaining until the target", () => {
    vi.setSystemTime(new Date("2026-09-05T00:00:00+03:00"));
    const { result } = renderHook(() => useCountdown(TARGET));
    expect(result.current).toEqual({ days: 3, hours: 0, minutes: 0, seconds: 0, done: false });
  });

  it("ticks down every second", () => {
    vi.setSystemTime(new Date("2026-09-07T23:59:58+03:00"));
    const { result } = renderHook(() => useCountdown(TARGET));
    expect(result.current.seconds).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.seconds).toBe(1);
    expect(result.current.done).toBe(false);
  });

  it("clamps to zero and reports done once the target has passed", () => {
    vi.setSystemTime(new Date("2026-09-09T00:00:00+03:00"));
    const { result } = renderHook(() => useCountdown(TARGET));
    expect(result.current).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true });
  });
});
