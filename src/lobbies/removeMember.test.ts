// src/lobbies/removeMember.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockDeleteDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockArrayRemove = vi.fn((...uids: string[]) => ({ op: "remove", uids }));
const mockAddDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, ...string[]])),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  arrayRemove: (...args: unknown[]) => mockArrayRemove(...(args as string[])),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { removeMember } from "./removeMember";

describe("removeMember", () => {
  beforeEach(() => {
    mockDeleteDoc.mockReset();
    mockUpdateDoc.mockReset();
    mockAddDoc.mockReset();
    mockDeleteDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockAddDoc.mockResolvedValue({ id: "sysmsg1" });
  });

  it("deletes the removed member's doc", async () => {
    await removeMember("lobby1", "creator1", "uid2", "Zeynep");
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "uid2"] });
  });

  it("removes the removed member's uid from the lobby doc's memberUids", async () => {
    await removeMember("lobby1", "creator1", "uid2", "Zeynep");
    expect(mockArrayRemove).toHaveBeenCalledWith("uid2");
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: ["lobbies", "lobby1"] },
      { memberUids: { op: "remove", uids: ["uid2"] } }
    );
  });

  it("writes a removed system message authored by the creator, about the removed person", async () => {
    await removeMember("lobby1", "creator1", "uid2", "Zeynep");
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        uid: "creator1",
        text: "Zeynep çıkarıldı.",
        system: { kind: "removed", subjectUid: "uid2" },
      })
    );
  });
});
