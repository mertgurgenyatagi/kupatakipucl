import { act, renderHook } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, path: string, id: string) => ({ path, id }));
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));
const mockOnSnapshot = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { setTypingStatus, useTypingUsers } from "./useTypingStatus";

type SnapshotCallback = (snapshot: { docs: { id: string; data: () => unknown }[] }) => void;

describe("setTypingStatus", () => {
  beforeEach(() => {
    mockSetDoc.mockReset();
    mockDeleteDoc.mockReset();
  });

  it("writes an updatedAt timestamp when typing starts", async () => {
    mockSetDoc.mockResolvedValue(undefined);
    await setTypingStatus("uid1", true);
    expect(mockDoc).toHaveBeenCalledWith({}, "typingStatus", "uid1");
    const [, written] = mockSetDoc.mock.calls[0];
    expect(typeof written.updatedAt).toBe("number");
  });

  it("deletes the doc when typing stops", async () => {
    mockDeleteDoc.mockResolvedValue(undefined);
    await setTypingStatus("uid1", false);
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: "typingStatus", id: "uid1" });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe("useTypingUsers", () => {
  let capturedOnNext: SnapshotCallback;

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: SnapshotCallback) => {
      capturedOnNext = onNext;
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useTypingUsers("me"));
    expect(result.current).toEqual([]);
  });

  it("excludes the current user from the typing list", () => {
    const { result } = renderHook(() => useTypingUsers("me"));
    act(() => {
      capturedOnNext({
        docs: [
          { id: "me", data: () => ({ updatedAt: Date.now() }) },
          { id: "other", data: () => ({ updatedAt: Date.now() }) },
        ],
      });
    });
    expect(result.current).toEqual(["other"]);
  });

  it("ages out a typing signal once it goes stale", () => {
    const { result } = renderHook(() => useTypingUsers("me"));
    const start = Date.now();
    act(() => {
      capturedOnNext({ docs: [{ id: "other", data: () => ({ updatedAt: start }) }] });
    });
    expect(result.current).toEqual(["other"]);

    act(() => {
      vi.setSystemTime(start + 7000);
      vi.advanceTimersByTime(7000);
    });
    expect(result.current).toEqual([]);
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useTypingUsers("me"));
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
