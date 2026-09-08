import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: vi.fn(),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useGracePeriodOpen } from "./useGracePeriodOpen";
import { PREDICTION_GRACE_END_ISO } from "./deadlines";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;

describe("useGracePeriodOpen", () => {
  let onNext: SnapshotCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_docRef: unknown, cb: SnapshotCallback) => {
      onNext = cb;
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  function fireDevConfig(data: unknown) {
    act(() => {
      onNext({ exists: () => true, data: () => data });
    });
  }

  it("reflects the real wall clock when there's no override", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(new Date(PREDICTION_GRACE_END_ISO).getTime() - 1000));
    const { result } = renderHook(() => useGracePeriodOpen());
    expect(result.current).toBe(true);

    vi.setSystemTime(new Date(new Date(PREDICTION_GRACE_END_ISO).getTime() + 1000));
    const { result: afterEnd } = renderHook(() => useGracePeriodOpen());
    expect(afterEnd.current).toBe(false);
  });

  it("dev override forces open even when the real clock is past the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(new Date(PREDICTION_GRACE_END_ISO).getTime() + 1000));
    const { result } = renderHook(() => useGracePeriodOpen());
    expect(result.current).toBe(false);
    fireDevConfig({ gracePeriodOverride: "open" });
    expect(result.current).toBe(true);
  });

  it("dev override forces closed even when the real clock is still within the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(new Date(PREDICTION_GRACE_END_ISO).getTime() - 1000));
    const { result } = renderHook(() => useGracePeriodOpen());
    expect(result.current).toBe(true);
    fireDevConfig({ gracePeriodOverride: "closed" });
    expect(result.current).toBe(false);
  });

  it("ignores the dev override when DEV is false", () => {
    vi.stubEnv("DEV", false);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(new Date(PREDICTION_GRACE_END_ISO).getTime() + 1000));
    const { result } = renderHook(() => useGracePeriodOpen());
    expect(result.current).toBe(false);
  });
});
