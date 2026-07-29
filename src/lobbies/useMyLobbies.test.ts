// src/lobbies/useMyLobbies.test.ts
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockOnSnapshot = vi.fn();
const mockCollectionGroup = vi.fn((_db: unknown, name: string) => ({ kind: "collectionGroup", name }));
const mockCollection = vi.fn((_db: unknown, name: string) => ({ kind: "collection", name }));
const mockWhere = vi.fn((field: unknown, op: string, value: unknown) => ({ field, op, value }));
const mockDocumentId = vi.fn(() => "__name__");
const mockQuery = vi.fn((base: { kind: string }, ...clauses: unknown[]) => ({ ...base, clauses }));
const mockUnsubMembers = vi.fn();
const mockUnsubLobbyDocs = vi.fn();

vi.mock("firebase/firestore", () => ({
  collectionGroup: (...args: unknown[]) => mockCollectionGroup(...(args as [unknown, string])),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  where: (...args: unknown[]) => mockWhere(...(args as [unknown, string, unknown])),
  documentId: () => mockDocumentId(),
  query: (...args: unknown[]) => mockQuery(...(args as [{ kind: string }])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useMyLobbies } from "./useMyLobbies";

interface FakeMemberDoc {
  ref: { parent: { parent: { id: string } } };
  data: () => { uid: string; joinedAt: number };
}
interface FakeLobbyDoc {
  id: string;
  data: () => { name: string; createdByUid: string; createdAt: number };
}
type MembersCallback = (snapshot: { docs: FakeMemberDoc[] }) => void;
type LobbyDocsCallback = (snapshot: { docs: FakeLobbyDoc[] }) => void;
type ErrorCallback = (err: Error) => void;

function memberDoc(lobbyId: string, uid: string, joinedAt: number): FakeMemberDoc {
  return { ref: { parent: { parent: { id: lobbyId } } }, data: () => ({ uid, joinedAt }) };
}
function lobbyDoc(id: string, name: string, createdByUid: string, createdAt: number): FakeLobbyDoc {
  return { id, data: () => ({ name, createdByUid, createdAt }) };
}

describe("useMyLobbies", () => {
  let capturedMembersNext: MembersCallback;
  let capturedMembersError: ErrorCallback;
  let capturedLobbyDocsNext: LobbyDocsCallback | null;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubMembers.mockReset();
    mockUnsubLobbyDocs.mockReset();
    capturedLobbyDocsNext = null;
    mockOnSnapshot.mockImplementation((queryArg: { kind: string }, onNext: unknown, onError: unknown) => {
      if (queryArg.kind === "collectionGroup") {
        capturedMembersNext = onNext as MembersCallback;
        capturedMembersError = onError as ErrorCallback;
        return mockUnsubMembers;
      }
      capturedLobbyDocsNext = onNext as LobbyDocsCallback;
      return mockUnsubLobbyDocs;
    });
  });

  it("returns loading=false and no lobbies when uid is null", async () => {
    const { result } = renderHook(() => useMyLobbies(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lobbies).toEqual([]);
  });

  it("returns an empty list without querying lobby docs when the user has no memberships", async () => {
    const { result } = renderHook(() => useMyLobbies("me"));
    act(() => capturedMembersNext({ docs: [] }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.lobbies).toEqual([]);
    expect(capturedLobbyDocsNext).toBeNull();
  });

  it("joins membership docs with lobby details once both snapshots arrive", async () => {
    const { result } = renderHook(() => useMyLobbies("me"));
    act(() => capturedMembersNext({ docs: [memberDoc("lobby1", "me", 100)] }));
    act(() => capturedLobbyDocsNext!({ docs: [lobbyDoc("lobby1", "Fener Grubu", "creator1", 50)] }));
    await waitFor(() => expect(result.current.lobbies).toHaveLength(1));
    expect(result.current.lobbies[0]).toEqual({
      id: "lobby1",
      name: "Fener Grubu",
      createdByUid: "creator1",
      createdAt: 50,
      myJoinedAt: 100,
    });
  });

  it("re-subscribes to lobby docs when the membership set changes", async () => {
    const { result } = renderHook(() => useMyLobbies("me"));
    act(() => capturedMembersNext({ docs: [memberDoc("lobby1", "me", 100)] }));
    act(() => capturedLobbyDocsNext!({ docs: [lobbyDoc("lobby1", "A", "c1", 1)] }));
    await waitFor(() => expect(result.current.lobbies).toHaveLength(1));

    act(() => capturedMembersNext({ docs: [memberDoc("lobby1", "me", 100), memberDoc("lobby2", "me", 200)] }));
    expect(mockUnsubLobbyDocs).toHaveBeenCalledTimes(1);
    act(() => capturedLobbyDocsNext!({ docs: [lobbyDoc("lobby1", "A", "c1", 1), lobbyDoc("lobby2", "B", "c2", 2)] }));
    await waitFor(() => expect(result.current.lobbies).toHaveLength(2));
  });

  it("stops loading on a membership listener error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useMyLobbies("me"));
    act(() => capturedMembersError(new Error("permission-denied")));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load my lobby memberships", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("shares one pair of subscriptions across two simultaneous mounts for the same uid", async () => {
    const first = renderHook(() => useMyLobbies("me"));
    const second = renderHook(() => useMyLobbies("me"));
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

    act(() => capturedMembersNext({ docs: [memberDoc("lobby1", "me", 100)] }));
    act(() => capturedLobbyDocsNext!({ docs: [lobbyDoc("lobby1", "A", "c1", 1)] }));
    await waitFor(() => expect(first.result.current.lobbies).toHaveLength(1));
    await waitFor(() => expect(second.result.current.lobbies).toHaveLength(1));
  });

  it("only unsubscribes both listeners once every mount has unmounted", async () => {
    const first = renderHook(() => useMyLobbies("me"));
    const second = renderHook(() => useMyLobbies("me"));
    act(() => capturedMembersNext({ docs: [memberDoc("lobby1", "me", 100)] }));
    act(() => capturedLobbyDocsNext!({ docs: [lobbyDoc("lobby1", "A", "c1", 1)] }));

    first.unmount();
    expect(mockUnsubMembers).not.toHaveBeenCalled();
    expect(mockUnsubLobbyDocs).not.toHaveBeenCalled();

    second.unmount();
    expect(mockUnsubMembers).toHaveBeenCalledTimes(1);
    expect(mockUnsubLobbyDocs).toHaveBeenCalledTimes(1);
  });
});
