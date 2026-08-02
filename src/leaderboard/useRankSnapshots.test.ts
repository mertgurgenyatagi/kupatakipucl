import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockOnSnapshot = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  query: (ref: unknown, ...constraints: unknown[]) => ({ ref, constraints }),
  orderBy: (field: string) => ({ field }),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useRankSnapshots } from "./useRankSnapshots";

type QueryCallback = (snapshot: { docs: { data: () => unknown }[] }) => void;

describe("useRankSnapshots", () => {
  let callback: QueryCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_q: unknown, onNext: QueryCallback) => {
      callback = onNext;
      return mockUnsubscribe;
    });
  });

  it("starts with an empty list and loading=true", () => {
    const { result } = renderHook(() => useRankSnapshots());
    expect(result.current.snapshots).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it("populates snapshots from the query results and stops loading", () => {
    const { result } = renderHook(() => useRankSnapshots());
    const data = [
      { matchday: 1, entries: [{ uid: "a", points: 3, rank: 1 }], computedAt: 100 },
      { matchday: 2, entries: [{ uid: "a", points: 6, rank: 1 }], computedAt: 200 },
    ];
    act(() => {
      callback({ docs: data.map((d) => ({ data: () => d })) });
    });
    expect(result.current.snapshots).toEqual(data);
    expect(result.current.loading).toBe(false);
  });

  it("stops loading without populating snapshots when the listener errors", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockOnSnapshot.mockImplementation((_q: unknown, _onNext: QueryCallback, onError: (err: Error) => void) => {
      onError(new Error("permission-denied"));
      return mockUnsubscribe;
    });
    const { result } = renderHook(() => useRankSnapshots());
    expect(result.current.snapshots).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load rank snapshots", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
