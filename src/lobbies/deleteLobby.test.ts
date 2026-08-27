// src/lobbies/deleteLobby.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockWriteBatch = vi.fn();
const mockDoc = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

interface FakeBatch {
  delete: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
}

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, ...string[]])),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { deleteLobby, DELETE_LOBBY_CHUNK_SIZE } from "./deleteLobby";

describe("deleteLobby", () => {
  let batches: FakeBatch[];
  const commitOrder: number[] = [];

  beforeEach(() => {
    mockGetDocs.mockReset();
    batches = [];
    commitOrder.length = 0;
    mockWriteBatch.mockReset();
    mockWriteBatch.mockImplementation(() => {
      const index = batches.length;
      const batch: FakeBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockImplementation(() => {
          commitOrder.push(index);
          return Promise.resolve(undefined);
        }),
      };
      batches.push(batch);
      return batch;
    });
  });

  function subDocs(kind: string, count: number) {
    return Array.from({ length: count }, (_, i) => ({
      ref: { path: ["lobbies", "lobby1", kind, `${kind}${i}`] },
    }));
  }

  // deleteLobby reads both subcollections, so the mock has to answer by path
  // rather than returning one canned snapshot to every call.
  function lobbyContains({ members = 0, messages = 0 }: { members?: number; messages?: number }) {
    mockGetDocs.mockImplementation((ref: { path: string[] }) => {
      const kind = ref.path[ref.path.length - 1];
      return Promise.resolve({ docs: subDocs(kind, kind === "messages" ? messages : members) });
    });
  }

  it("deletes every member doc and the lobby doc itself in one batch", async () => {
    lobbyContains({ members: 2 });

    await deleteLobby("lobby1");

    expect(batches).toHaveLength(1);
    expect(batches[0].delete).toHaveBeenCalledTimes(3);
    expect(batches[0].delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "members0"] });
    expect(batches[0].delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "members1"] });
    expect(batches[0].delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(batches[0].commit).toHaveBeenCalledTimes(1);
  });

  it("still deletes the lobby doc even with zero members", async () => {
    lobbyContains({});
    await deleteLobby("lobby1");
    expect(batches).toHaveLength(1);
    expect(batches[0].delete).toHaveBeenCalledTimes(1);
    expect(batches[0].delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
  });

  // Firestore's rules-access budget is 20 get()/exists()/getAfter() calls per
  // BATCHED WRITE, and each non-self member delete costs one get() on the
  // lobby doc — so a big lobby has to be split across several batches or the
  // whole delete is denied. Nothing caps lobby membership size.
  it("splits a lobby larger than one chunk across several sequential batches", async () => {
    lobbyContains({ members: 25 });

    await deleteLobby("lobby1");

    expect(DELETE_LOBBY_CHUNK_SIZE).toBeLessThan(20);
    expect(batches).toHaveLength(2);
    // 15 members in the first batch, 10 + the lobby doc in the second.
    expect(batches[0].delete).toHaveBeenCalledTimes(DELETE_LOBBY_CHUNK_SIZE);
    expect(batches[1].delete).toHaveBeenCalledTimes(25 - DELETE_LOBBY_CHUNK_SIZE + 1);
    // No batch ever carries more member deletes than the budget allows.
    batches.forEach((b) => expect(b.delete.mock.calls.length).toBeLessThanOrEqual(20));
  });

  it("deletes the lobby doc only in the final batch, after every member batch has committed", async () => {
    lobbyContains({ members: 31 });

    await deleteLobby("lobby1");

    expect(batches).toHaveLength(3);
    // The lobby-doc delete gates the member-delete rule's get() — if it went
    // first, every later member batch would be denied.
    expect(batches[0].delete).not.toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(batches[1].delete).not.toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(batches[2].delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(commitOrder).toEqual([0, 1, 2]);
  });

  it("uses exactly one batch when the member count lands right on the chunk size", async () => {
    lobbyContains({ members: DELETE_LOBBY_CHUNK_SIZE });
    await deleteLobby("lobby1");
    expect(batches).toHaveLength(1);
    expect(batches[0].delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
  });
  // The bug this file exists to pin down. `allow delete: if false` on lobby
  // messages meant no client could ever remove them, so every deleted lobby
  // left its whole chat history behind — five such lobbies were still in
  // production on 2026-08-27 — while the delete dialog promised the opposite.
  it("deletes the lobby's chat messages too, not just its members", async () => {
    lobbyContains({ members: 2, messages: 3 });

    await deleteLobby("lobby1");

    const deleted = batches.flatMap((b) => b.delete.mock.calls.map((c) => (c[0] as { path: string[] }).path));
    expect(deleted).toContainEqual(["lobbies", "lobby1", "messages", "messages0"]);
    expect(deleted).toContainEqual(["lobbies", "lobby1", "messages", "messages1"]);
    expect(deleted).toContainEqual(["lobbies", "lobby1", "messages", "messages2"]);
    expect(deleted).toContainEqual(["lobbies", "lobby1", "members", "members0"]);
    expect(deleted).toContainEqual(["lobbies", "lobby1"]);
  });

  it("deletes a lobby that has messages but no members left", async () => {
    lobbyContains({ members: 0, messages: 4 });

    await deleteLobby("lobby1");

    const deleted = batches.flatMap((b) => b.delete.mock.calls.map((c) => (c[0] as { path: string[] }).path));
    expect(deleted).toHaveLength(5);
    expect(deleted).toContainEqual(["lobbies", "lobby1", "messages", "messages3"]);
    expect(deleted).toContainEqual(["lobbies", "lobby1"]);
  });

  // Both delete rules read createdByUid off the lobby doc, so it has to outlive
  // every message and member delete. It also makes a half-finished cascade
  // retryable rather than silently orphaning what is left.
  it("keeps the lobby doc until the very last batch even with a chatty lobby", async () => {
    lobbyContains({ members: 10, messages: 40 });

    await deleteLobby("lobby1");

    expect(batches).toHaveLength(4);
    batches.slice(0, -1).forEach((b) => {
      expect(b.delete).not.toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    });
    expect(batches[batches.length - 1].delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(commitOrder).toEqual([0, 1, 2, 3]);
    // Every batch stays inside the 20-call rules-access budget.
    batches.forEach((b) => expect(b.delete.mock.calls.length).toBeLessThanOrEqual(20));
  });
});
