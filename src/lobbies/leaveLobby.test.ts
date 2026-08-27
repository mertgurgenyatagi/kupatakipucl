// src/lobbies/leaveLobby.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockDeleteDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockArrayRemove = vi.fn((...uids: string[]) => ({ op: "remove", uids }));
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

// The last-member-out path delegates to the real delete cascade rather than
// hand-rolling two deleteDoc calls, so what's asserted here is the delegation.
// deleteLobby's own chunking, ordering and message cascade are covered in
// deleteLobby.test.ts.
const mockDeleteLobby = vi.fn();
vi.mock("./deleteLobby", () => ({
  deleteLobby: (...args: unknown[]) => mockDeleteLobby(...args),
}));

import { leaveLobby } from "./leaveLobby";
import { LobbyWithId } from "./lobbyTypes";

const lobby: LobbyWithId = {
  id: "lobby1",
  name: "Fener Grubu",
  createdByUid: "creator1",
  createdAt: 0,
  memberUids: ["creator1"],
};

describe("leaveLobby", () => {
  beforeEach(() => {
    mockDeleteDoc.mockReset();
    mockUpdateDoc.mockReset();
    mockAddDoc.mockReset();
    mockDeleteLobby.mockReset();
    mockDeleteLobby.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
    mockAddDoc.mockResolvedValue({ id: "sysmsg1" });
  });

  // This branch used to delete the member doc and the lobby doc directly, which
  // left every chat message under the lobby orphaned — the likelier of the two
  // routes by which five stranded lobbies reached production, since a
  // one-person test lobby gets left rather than deleted.
  it("runs the full delete cascade when the creator is the sole remaining member", async () => {
    await leaveLobby(lobby, "creator1", "Ahmet", []);
    expect(mockDeleteLobby).toHaveBeenCalledWith("lobby1");
    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it("transfers ownership to the next-oldest remaining member when the creator leaves and others remain", async () => {
    const remaining = [
      { uid: "uid2", joinedAt: 200, viaInviteId: "i1" },
      { uid: "uid3", joinedAt: 100, viaInviteId: "i2" },
    ];
    await leaveLobby(lobby, "creator1", "Ahmet", remaining);
    expect(mockUpdateDoc).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] }, { createdByUid: "uid3" });
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "creator1"] });
    expect(mockDeleteDoc).not.toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ text: "Ahmet ayrıldı.", system: { kind: "left", subjectUid: "creator1" } })
    );
  });

  it("removes the leaver's own uid from the lobby doc's memberUids", async () => {
    await leaveLobby(lobby, "creator1", "Ahmet", [{ uid: "uid2", joinedAt: 200, viaInviteId: "i1" }]);
    expect(mockArrayRemove).toHaveBeenCalledWith("creator1");
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: ["lobbies", "lobby1"] },
      { memberUids: { op: "remove", uids: ["creator1"] } }
    );
  });

  it("does not touch memberUids when the lobby itself is being deleted (creator, no one left)", async () => {
    await leaveLobby(lobby, "creator1", "Ahmet", []);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it("just removes a non-creator member and announces it, no ownership change", async () => {
    await leaveLobby(lobby, "uid2", "Zeynep", [{ uid: "creator1", joinedAt: 0, viaInviteId: null }]);
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: ["lobbies", "lobby1", "members", "uid2"] });
    expect(mockDeleteDoc).not.toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] });
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: ["lobbies", "lobby1"] },
      { memberUids: { op: "remove", uids: ["uid2"] } }
    );
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ text: "Zeynep ayrıldı.", system: { kind: "left", subjectUid: "uid2" } })
    );
  });
});
