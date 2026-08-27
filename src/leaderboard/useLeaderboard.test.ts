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

// The cache is only readable once the phase leaves 'notstarted', so the hook
// asks before it subscribes. Default the tests to a started phase; the
// 'notstarted' behaviour gets its own cases at the bottom.
const mockUseTournamentPhase = vi.fn(() => "leaguephase");
vi.mock("../tournament/useTournamentPhase", () => ({
  useTournamentPhase: () => mockUseTournamentPhase(),
}));

import { useLeaderboard } from "./useLeaderboard";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;
type ErrorCallback = (err: Error) => void;

describe("useLeaderboard", () => {
  let capturedOnNext: SnapshotCallback;
  let capturedOnError: ErrorCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockUseTournamentPhase.mockReturnValue("leaguephase");
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

  /**
   * Every entry in the cache doc carries a participant's full 36-team
   * ranking, so it is unreadable until the league phase starts — the same
   * gate the predictions themselves are behind (firestore.rules,
   * 2026-08-27). Subscribing during 'notstarted' would guarantee a
   * permission error on pages that mount this hook in that phase, so the
   * hook does not subscribe at all.
   */
  describe("before the league phase", () => {
    it("does not subscribe at all", () => {
      mockUseTournamentPhase.mockReturnValue("notstarted");
      renderHook(() => useLeaderboard());
      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });

    it("settles as an empty, finished leaderboard rather than loading forever", async () => {
      mockUseTournamentPhase.mockReturnValue("notstarted");
      const { result } = renderHook(() => useLeaderboard());
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.entries).toEqual([]);
    });

    it("subscribes once the phase advances", async () => {
      mockUseTournamentPhase.mockReturnValue("notstarted");
      const { rerender } = renderHook(() => useLeaderboard());
      expect(mockOnSnapshot).not.toHaveBeenCalled();

      mockUseTournamentPhase.mockReturnValue("leaguephase");
      rerender();
      await waitFor(() => expect(mockOnSnapshot).toHaveBeenCalledTimes(1));
    });
  });
});
