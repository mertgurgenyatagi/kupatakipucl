import { act, renderHook, waitFor } from "@testing-library/react";
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

import { usePlayers } from "./usePlayers";

type SnapshotCallback = (snapshot: { docs: { id: string; data: () => unknown }[] }) => void;
type ErrorCallback = (err: Error) => void;

describe("usePlayers", () => {
  let capturedOnNext: SnapshotCallback;
  let capturedOnError: ErrorCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    clearSessionCache();
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: SnapshotCallback, onError: ErrorCallback) => {
      capturedOnNext = onNext;
      capturedOnError = onError;
      return mockUnsubscribe;
    });
  });

  it("returns an empty list before any profiles exist", async () => {
    const { result } = renderHook(() => usePlayers());
    act(() => capturedOnNext({ docs: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([]);
  });

  it("maps each profile doc to a Player with uid set from the doc id", async () => {
    const { result } = renderHook(() => usePlayers());
    act(() =>
      capturedOnNext({
        docs: [
          {
            id: "uid1",
            data: () => ({ firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 }),
          },
        ],
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([
      { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
    ]);
  });

  it("stops loading and leaves players empty when the listener errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => usePlayers());
    act(() => capturedOnError(new Error("permission-denied")));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load players", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("updates live when a new profile is added to a later snapshot", async () => {
    const { result } = renderHook(() => usePlayers());
    act(() => capturedOnNext({ docs: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() =>
      capturedOnNext({
        docs: [{ id: "uid1", data: () => ({ firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 }) }],
      })
    );
    await waitFor(() => expect(result.current.players).toHaveLength(1));
  });

  it("unsubscribes the live listener on unmount", () => {
    const { unmount } = renderHook(() => usePlayers());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
