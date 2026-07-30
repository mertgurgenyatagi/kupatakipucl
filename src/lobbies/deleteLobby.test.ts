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

import { deleteLobby, DELETE_LOBBY_MEMBER_CHUNK_SIZE } from "./deleteLobby";

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

  function memberDocs(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      ref: { path: ["lobbies", "lobby1", "members", `uid${i}`] },
    }));
  }

  it("deletes every member doc and the lobby doc itself in one batch", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { ref: { path: ["lobbies", "lobby1", "members", "uid1"] } },
        { ref: { path: ["lobbies", "lobby1", "members", "uid2"] } },
      ],
    });

    await deleteLobby("lobby1");

    expect(batches).toHaveLength(1);
    expect(batches[0].delete).toHaveBeenCalledTimes(3);
    expect(batches[0].delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "uid1"] });
    expect(batches[0].delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "uid2"] });
    expect(batches[0].delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(batches[0].commit).toHaveBeenCalledTimes(1);
  });

  it("still deletes the lobby doc even with zero members", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
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
    mockGetDocs.mockResolvedValue({ docs: memberDocs(25) });

    await deleteLobby("lobby1");

    expect(DELETE_LOBBY_MEMBER_CHUNK_SIZE).toBeLessThan(20);
    expect(batches).toHaveLength(2);
    // 15 members in the first batch, 10 + the lobby doc in the second.
    expect(batches[0].delete).toHaveBeenCalledTimes(DELETE_LOBBY_MEMBER_CHUNK_SIZE);
    expect(batches[1].delete).toHaveBeenCalledTimes(25 - DELETE_LOBBY_MEMBER_CHUNK_SIZE + 1);
    // No batch ever carries more member deletes than the budget allows.
    batches.forEach((b) => expect(b.delete.mock.calls.length).toBeLessThanOrEqual(20));
  });

  it("deletes the lobby doc only in the final batch, after every member batch has committed", async () => {
    mockGetDocs.mockResolvedValue({ docs: memberDocs(31) });

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
    mockGetDocs.mockResolvedValue({ docs: memberDocs(DELETE_LOBBY_MEMBER_CHUNK_SIZE) });
    await deleteLobby("lobby1");
    expect(batches).toHaveLength(1);
    expect(batches[0].delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
  });
});
