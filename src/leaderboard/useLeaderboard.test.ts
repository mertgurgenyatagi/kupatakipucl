import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { clearSessionCache } from "../lib/sessionCache";

const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useLeaderboard } from "./useLeaderboard";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;
type ErrorCallback = (err: Error) => void;

describe("useLeaderboard", () => {
  let capturedOnNext: SnapshotCallback;
  let capturedOnError: ErrorCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    clearSessionCache();
    mockOnSnapshot.mockImplementation((_docRef: unknown, onNext: SnapshotCallback, onError: ErrorCallback) => {
      capturedOnNext = onNext;
      capturedOnError = onError;
      return mockUnsubscribe;
    });
  });

  it("reads the precomputed leaderboardCache/current doc, not the raw collections", () => {
    renderHook(() => useLeaderboard());
    expect(mockDoc).toHaveBeenCalledWith({}, "leaderboardCache", "current");
  });

  it("returns an empty list when the cache doc doesn't exist yet", async () => {
    const { result } = renderHook(() => useLeaderboard());
    act(() => capturedOnNext({ exists: () => false, data: () => undefined }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([]);
  });

  it("returns the precomputed entries once the cache doc loads", async () => {
    const entries = [{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 9, ranking: ["arsenal"] }];
    const { result } = renderHook(() => useLeaderboard());
    act(() => capturedOnNext({ exists: () => true, data: () => ({ entries, computedAt: 100 }) }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual(entries);
  });

  it("updates live when the Cloud Function recomputes and rewrites the cache doc", async () => {
    const { result } = renderHook(() => useLeaderboard());
    act(() => capturedOnNext({ exists: () => true, data: () => ({ entries: [], computedAt: 100 }) }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const updated = [{ uid: "uid1", firstName: "Ada", photoURL: "a.png", points: 12, ranking: [] }];
    act(() => capturedOnNext({ exists: () => true, data: () => ({ entries: updated, computedAt: 200 }) }));
    expect(result.current.entries).toEqual(updated);
  });

  it("stops loading and leaves entries empty when the listener errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useLeaderboard());
    act(() => capturedOnError(new Error("permission-denied")));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load leaderboard", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("unsubscribes the live listener on unmount", () => {
    const { unmount } = renderHook(() => useLeaderboard());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
