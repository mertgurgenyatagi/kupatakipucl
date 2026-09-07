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

import { useFixtures } from "./useFixtures";

type Doc = { id: string; data: () => unknown };
type SnapshotCallback = (snapshot: { docs: Doc[] }) => void;
type ErrorCallback = (err: Error) => void;

const doc = (id: string, order: number, overrides = {}): Doc => ({
  id,
  data: () => ({
    matchday: 1,
    order,
    homeTeamId: "arsenal",
    awayTeamId: "barcelona",
    kickoffUtc: "2026-09-08T16:45:00Z",
    status: "TIMED",
    homeGoals: null,
    awayGoals: null,
    ...overrides,
  }),
});

describe("useFixtures", () => {
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

  it("returns an empty list before any docs exist", async () => {
    const { result } = renderHook(() => useFixtures());
    act(() => capturedOnNext({ docs: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fixtures).toEqual([]);
  });

  it("sorts by order regardless of the snapshot's own document order", async () => {
    const { result } = renderHook(() => useFixtures());
    act(() => capturedOnNext({ docs: [doc("md-later", 2), doc("md-earlier", 1)] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fixtures.map((f) => f.id)).toEqual(["md-earlier", "md-later"]);
  });

  it("updates live when the sync writes a new score, e.g. a live match", async () => {
    const { result } = renderHook(() => useFixtures());
    act(() => capturedOnNext({ docs: [doc("m1", 1, { status: "IN_PLAY", homeGoals: 0, awayGoals: 0 })] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fixtures[0].homeGoals).toBe(0);

    act(() => capturedOnNext({ docs: [doc("m1", 1, { status: "IN_PLAY", homeGoals: 1, awayGoals: 0 })] }));
    expect(result.current.fixtures[0].homeGoals).toBe(1);
  });

  it("stops loading and leaves fixtures empty when the listener errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useFixtures());
    act(() => capturedOnError(new Error("permission-denied")));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fixtures).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load fixtures", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("unsubscribes the live listener on unmount", () => {
    const { unmount } = renderHook(() => useFixtures());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
