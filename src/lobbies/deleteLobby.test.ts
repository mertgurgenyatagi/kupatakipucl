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

import { deleteLobby } from "./deleteLobby";

describe("deleteLobby", () => {
  let batch: FakeBatch;

  beforeEach(() => {
    mockGetDocs.mockReset();
    batch = { delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    mockWriteBatch.mockReturnValue(batch);
  });

  it("deletes every member doc and the lobby doc itself in one batch", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { ref: { path: ["lobbies", "lobby1", "members", "uid1"] } },
        { ref: { path: ["lobbies", "lobby1", "members", "uid2"] } },
      ],
    });

    await deleteLobby("lobby1");

    expect(batch.delete).toHaveBeenCalledTimes(3);
    expect(batch.delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "uid1"] });
    expect(batch.delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "uid2"] });
    expect(batch.delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it("still deletes the lobby doc even with zero members", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await deleteLobby("lobby1");
    expect(batch.delete).toHaveBeenCalledTimes(1);
    expect(batch.delete).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
  });
});
