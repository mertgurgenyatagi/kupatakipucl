import { act, renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockOnSnapshot = vi.fn();
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useLobbyMembers } from "./useLobbyMembers";

type SnapshotCallback = (snapshot: { docs: { data: () => unknown }[] }) => void;
type ErrorCallback = (err: Error) => void;
interface Captured {
  path: string[];
  onNext: SnapshotCallback;
  onError: ErrorCallback;
}

describe("useLobbyMembers", () => {
  let captured: Captured[];

  function lastFor(lobbyId: string): Captured {
    const match = [...captured].reverse().find((c) => c.path.includes(lobbyId));
    if (!match) throw new Error(`no onSnapshot call captured for lobby ${lobbyId}`);
    return match;
  }

  beforeEach(() => {
    captured = [];
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation(
      (collectionRef: { path: string[] }, onNext: SnapshotCallback, onError: ErrorCallback) => {
        captured.push({ path: collectionRef.path, onNext, onError });
        return mockUnsubscribe;
      }
    );
  });

  it("returns loading=false and no members when lobbyId is null", async () => {
    const { result } = renderHook(() => useLobbyMembers(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toEqual([]);
  });

  it("returns the member list once a snapshot arrives", async () => {
    const { result } = renderHook(() => useLobbyMembers("lobby1"));
    act(() =>
      lastFor("lobby1").onNext({ docs: [{ data: () => ({ uid: "uid1", joinedAt: 100, viaInviteId: null }) }] })
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toEqual([{ uid: "uid1", joinedAt: 100, viaInviteId: null }]);
  });

  it("updates live when a member joins on a later snapshot", async () => {
    const { result } = renderHook(() => useLobbyMembers("lobby1"));
    act(() =>
      lastFor("lobby1").onNext({ docs: [{ data: () => ({ uid: "uid1", joinedAt: 100, viaInviteId: null }) }] })
    );
    await waitFor(() => expect(result.current.members).toHaveLength(1));

    act(() =>
      lastFor("lobby1").onNext({
        docs: [
          { data: () => ({ uid: "uid1", joinedAt: 100, viaInviteId: null }) },
          { data: () => ({ uid: "uid2", joinedAt: 200, viaInviteId: "invite1" }) },
        ],
      })
    );
    await waitFor(() => expect(result.current.members).toHaveLength(2));
  });

  it("stops loading and shows an empty list when the listener errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useLobbyMembers("lobby1"));
    act(() => lastFor("lobby1").onError(new Error("permission-denied")));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.members).toEqual([]);
    consoleErrorSpy.mockRestore();
  });

  it("shares one live subscription across two simultaneous mounts for the same lobbyId", async () => {
    const first = renderHook(() => useLobbyMembers("lobby1"));
    const second = renderHook(() => useLobbyMembers("lobby1"));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

    act(() =>
      lastFor("lobby1").onNext({ docs: [{ data: () => ({ uid: "uid1", joinedAt: 100, viaInviteId: null }) }] })
    );
    await waitFor(() => expect(first.result.current.members).toHaveLength(1));
    await waitFor(() => expect(second.result.current.members).toHaveLength(1));
  });

  it("only unsubscribes once every mount for that lobbyId has unmounted", async () => {
    const first = renderHook(() => useLobbyMembers("lobby1"));
    const second = renderHook(() => useLobbyMembers("lobby1"));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

    first.unmount();
    expect(mockUnsubscribe).not.toHaveBeenCalled();
    second.unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("opens independent subscriptions for two different lobby ids", () => {
    renderHook(() => useLobbyMembers("lobby1"));
    renderHook(() => useLobbyMembers("lobby2"));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(2);
  });
});
