import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLoadingStuck } from "./useLoadingStuck";

describe("useLoadingStuck", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stays false while loading is false", () => {
    const { result } = renderHook(() => useLoadingStuck(false, 1000));
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current).toBe(false);
  });

  it("stays false until the delay has actually elapsed", () => {
    const { result } = renderHook(() => useLoadingStuck(true, 1000));
    act(() => vi.advanceTimersByTime(999));
    expect(result.current).toBe(false);
  });

  it("flips true once loading has stayed true past the delay", () => {
    const { result, rerender } = renderHook(() => useLoadingStuck(true, 1000));
    act(() => vi.advanceTimersByTime(1000));
    rerender();
    expect(result.current).toBe(true);
  });

  it("resets to false the moment loading clears, even after having been stuck", () => {
    const { result, rerender } = renderHook(({ loading }) => useLoadingStuck(loading, 1000), {
      initialProps: { loading: true },
    });
    act(() => vi.advanceTimersByTime(1000));
    rerender({ loading: true });
    expect(result.current).toBe(true);

    rerender({ loading: false });
    expect(result.current).toBe(false);
  });
});
