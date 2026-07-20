import { act, renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));
const mockQuery = vi.fn((ref: unknown) => ref);
const mockOrderBy = vi.fn((field: string) => ({ field }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  query: (...args: unknown[]) => mockQuery(...(args as [unknown])),
  orderBy: (...args: unknown[]) => mockOrderBy(...(args as [string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useMessages } from "./useMessages";

type SnapshotCallback = (snapshot: { docs: { id: string; data: () => unknown }[] }) => void;
type ErrorCallback = (err: Error) => void;

describe("useMessages", () => {
  let capturedOnNext: SnapshotCallback;
  let capturedOnError: ErrorCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: SnapshotCallback, onError: ErrorCallback) => {
      capturedOnNext = onNext;
      capturedOnError = onError;
      return mockUnsubscribe;
    });
  });

  it("starts with loading=true and an empty message list", () => {
    const { result } = renderHook(() => useMessages());
    expect(result.current.loading).toBe(true);
    expect(result.current.messages).toEqual([]);
  });

  it("populates messages and clears loading when a snapshot arrives", async () => {
    const { result } = renderHook(() => useMessages());
    act(() => {
      capturedOnNext({
        docs: [
          { id: "msg1", data: () => ({ uid: "uid1", text: "Merhaba", createdAt: 100 }) },
          { id: "msg2", data: () => ({ uid: "uid2", text: "Selam", createdAt: 200 }) },
        ],
      });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([
      { id: "msg1", uid: "uid1", text: "Merhaba", createdAt: 100 },
      { id: "msg2", uid: "uid2", text: "Selam", createdAt: 200 },
    ]);
  });

  it("updates messages when a second snapshot arrives", async () => {
    const { result } = renderHook(() => useMessages());
    act(() => {
      capturedOnNext({ docs: [{ id: "msg1", data: () => ({ uid: "uid1", text: "İlk", createdAt: 100 }) }] });
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    act(() => {
      capturedOnNext({
        docs: [
          { id: "msg1", data: () => ({ uid: "uid1", text: "İlk", createdAt: 100 }) },
          { id: "msg2", data: () => ({ uid: "uid2", text: "İkinci", createdAt: 200 }) },
        ],
      });
    });
    await waitFor(() => expect(result.current.messages).toHaveLength(2));
  });

  it("stops loading and keeps prior messages when the listener errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useMessages());
    act(() => {
      capturedOnNext({ docs: [{ id: "msg1", data: () => ({ uid: "uid1", text: "İlk", createdAt: 100 }) }] });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      capturedOnError(new Error("listener failed"));
    });
    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load messages", expect.any(Error)));
    expect(result.current.messages).toHaveLength(1);
    consoleErrorSpy.mockRestore();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useMessages());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("orders the query by createdAt", () => {
    renderHook(() => useMessages());
    expect(mockOrderBy).toHaveBeenCalledWith("createdAt");
  });
});
