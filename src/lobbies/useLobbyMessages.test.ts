import { act, renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockOnSnapshot = vi.fn();
const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockQuery = vi.fn((...args: unknown[]) => ({ constraints: args.slice(1) }));
const mockOrderBy = vi.fn((field: string, direction?: string) => ({ type: "orderBy", field, direction }));
const mockLimit = vi.fn((n: number) => ({ type: "limit", n }));
const mockStartAfter = vi.fn((value: unknown) => ({ type: "startAfter", value }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
  query: (...args: unknown[]) => mockQuery(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...(args as [string, string?])),
  limit: (...args: unknown[]) => mockLimit(...(args as [number])),
  startAfter: (...args: unknown[]) => mockStartAfter(...(args as [unknown])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useLobbyMessages } from "./useLobbyMessages";

type SnapshotCallback = (snapshot: { docs: { id: string; data: () => unknown }[] }) => void;
type ErrorCallback = (err: Error) => void;

function doc(id: string, uid: string, text: string, createdAt: number) {
  return { id, data: () => ({ uid, text, createdAt }) };
}

describe("useLobbyMessages", () => {
  let capturedOnNext: SnapshotCallback;
  let capturedOnError: ErrorCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockGetDocs.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: SnapshotCallback, onError: ErrorCallback) => {
      capturedOnNext = onNext;
      capturedOnError = onError;
      return mockUnsubscribe;
    });
  });

  it("returns loading=false and no messages when lobbyId is null", async () => {
    const { result } = renderHook(() => useLobbyMessages(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toEqual([]);
    expect(mockOnSnapshot).not.toHaveBeenCalled();
  });

  it("subscribes to that lobby's own messages subcollection", () => {
    renderHook(() => useLobbyMessages("lobby1"));
    expect(mockCollection).toHaveBeenCalledWith({}, "lobbies", "lobby1", "messages");
  });

  it("loads and chronologically orders the live window", async () => {
    const { result } = renderHook(() => useLobbyMessages("lobby1"));
    act(() => capturedOnNext({ docs: [doc("newest", "uid1", "b", 200), doc("oldest", "uid1", "a", 100)] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages.map((m) => m.id)).toEqual(["oldest", "newest"]);
  });

  it("renders a system message doc with its system field intact", async () => {
    const { result } = renderHook(() => useLobbyMessages("lobby1"));
    act(() =>
      capturedOnNext({
        docs: [
          {
            id: "sys1",
            data: () => ({
              uid: "uid1",
              text: "Ahmet katıldı.",
              createdAt: 100,
              system: { kind: "joined", subjectUid: "uid1" },
            }),
          },
        ],
      })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages[0].system).toEqual({ kind: "joined", subjectUid: "uid1" });
  });

  it("resets to a fresh, empty state when lobbyId changes", async () => {
    const { result, rerender } = renderHook(({ lobbyId }) => useLobbyMessages(lobbyId), {
      initialProps: { lobbyId: "lobby1" as string | null },
    });
    act(() => capturedOnNext({ docs: [doc("m1", "uid1", "a", 100)] }));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    rerender({ lobbyId: "lobby2" });
    expect(result.current.loading).toBe(true);
    expect(result.current.messages).toEqual([]);
  });

  it("stops loading when the listener errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useLobbyMessages("lobby1"));
    act(() => capturedOnError(new Error("permission-denied")));
    await waitFor(() => expect(result.current.loading).toBe(false));
    consoleErrorSpy.mockRestore();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useLobbyMessages("lobby1"));
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  describe("loadOlder", () => {
    it("fetches the next page before the oldest currently-loaded message", async () => {
      const { result } = renderHook(() => useLobbyMessages("lobby1"));
      const fullPage = Array.from({ length: 50 }, (_, i) => doc(`m${i}`, "uid1", "x", (i + 1) * 10));
      act(() => capturedOnNext({ docs: [...fullPage].reverse() }));
      await waitFor(() => expect(result.current.loading).toBe(false));

      mockGetDocs.mockResolvedValue({ docs: [doc("older1", "uid1", "y", 5)] });
      await act(async () => {
        await result.current.loadOlder();
      });

      expect(mockStartAfter).toHaveBeenCalledWith(10);
      expect(result.current.messages[0].id).toBe("older1");
    });

    it("does nothing when lobbyId is null", async () => {
      const { result } = renderHook(() => useLobbyMessages(null));
      await act(async () => {
        await result.current.loadOlder();
      });
      expect(mockGetDocs).not.toHaveBeenCalled();
    });
  });
});
