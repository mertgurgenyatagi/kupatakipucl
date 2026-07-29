// src/forum/usePosts.test.ts
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

import { usePosts } from "./usePosts";

type SnapshotCallback = (snapshot: { docs: { id: string; data: () => unknown }[] }) => void;
type ErrorCallback = (err: Error) => void;

describe("usePosts", () => {
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

  it("returns an empty list before any posts exist", async () => {
    const { result } = renderHook(() => usePosts());
    act(() => capturedOnNext({ docs: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts).toEqual([]);
  });

  it("maps each doc to a PostWithId", async () => {
    const { result } = renderHook(() => usePosts());
    act(() =>
      capturedOnNext({
        docs: [
          {
            id: "post1",
            data: () => ({ uid: "uid1", text: "Merhaba", imageURL: null, parentId: null, createdAt: 100 }),
          },
        ],
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts).toEqual([
      { id: "post1", uid: "uid1", text: "Merhaba", imageURL: null, parentId: null, createdAt: 100 },
    ]);
  });

  it("stops loading and leaves posts empty when the listener errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => usePosts());
    act(() => capturedOnError(new Error("permission-denied")));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load forum posts", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("updates live when a new post arrives on a later snapshot, no refetch needed", async () => {
    const { result } = renderHook(() => usePosts());
    act(() => capturedOnNext({ docs: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() =>
      capturedOnNext({
        docs: [{ id: "post1", data: () => ({ uid: "uid1", text: "Yeni", imageURL: null, parentId: null, createdAt: 200 }) }],
      })
    );
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
  });

  it("unsubscribes the live listener on unmount", () => {
    const { unmount } = renderHook(() => usePosts());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
