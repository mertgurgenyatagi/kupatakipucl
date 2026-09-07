import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { clearSessionCache } from "../lib/sessionCache";

const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useResults } from "./useResults";

type Doc = { id: string; data: () => unknown };
type SnapshotCallback = (snapshot: { docs: Doc[] }) => void;
type ErrorCallback = (err: Error) => void;

describe("useResults", () => {
  let capturedOnNext: SnapshotCallback;
  let capturedOnError: ErrorCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    clearSessionCache();
    mockOnSnapshot.mockImplementation((_collectionRef: unknown, onNext: SnapshotCallback, onError: ErrorCallback) => {
      capturedOnNext = onNext;
      capturedOnError = onError;
      return mockUnsubscribe;
    });
  });

  it("returns an empty results map before any docs exist", async () => {
    const { result } = renderHook(() => useResults());
    act(() => capturedOnNext({ docs: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toEqual({});
  });

  it("keys results by doc id", async () => {
    const { result } = renderHook(() => useResults());
    act(() =>
      capturedOnNext({
        docs: [
          {
            id: "arsenal",
            data: () => ({ position: 1, points: 10, goalDifference: 5, goalsFor: 8, goalsAgainst: 3 }),
          },
          {
            id: "barcelona",
            data: () => ({ position: 2, points: 9, goalDifference: 4, goalsFor: 7, goalsAgainst: 3 }),
          },
        ],
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results.arsenal.position).toBe(1);
    expect(result.current.results.barcelona.position).toBe(2);
  });

  it("updates live when a sync rewrites a team's result, e.g. reordering positions", async () => {
    const { result } = renderHook(() => useResults());
    act(() =>
      capturedOnNext({
        docs: [{ id: "arsenal", data: () => ({ position: 5, points: 3, goalDifference: 0, goalsFor: 1, goalsAgainst: 1 }) }],
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results.arsenal.position).toBe(5);

    act(() =>
      capturedOnNext({
        docs: [{ id: "arsenal", data: () => ({ position: 1, points: 6, goalDifference: 3, goalsFor: 4, goalsAgainst: 1 }) }],
      })
    );
    expect(result.current.results.arsenal.position).toBe(1);
  });

  it("stops loading and leaves results empty when the listener errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useResults());
    act(() => capturedOnError(new Error("permission-denied")));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load results", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("unsubscribes the live listener on unmount", () => {
    const { unmount } = renderHook(() => useResults());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
