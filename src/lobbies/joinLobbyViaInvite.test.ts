// src/lobbies/joinLobbyViaInvite.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, ...string[]])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { joinLobbyViaInvite } from "./joinLobbyViaInvite";

function snap(exists: boolean, data?: unknown) {
  return { exists: () => exists, data: () => data };
}

describe("joinLobbyViaInvite", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
    mockAddDoc.mockReset();
    mockSetDoc.mockResolvedValue(undefined);
    mockAddDoc.mockResolvedValue({ id: "sysmsg1" });
  });

  it("returns invalid-or-expired when the invite doesn't exist", async () => {
    mockGetDoc.mockResolvedValueOnce(snap(false));
    const result = await joinLobbyViaInvite("invite1", "uid1", "Ahmet", 0);
    expect(result).toEqual({ outcome: "invalid-or-expired" });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("returns invalid-or-expired when the invite has expired", async () => {
    mockGetDoc.mockResolvedValueOnce(
      snap(true, { lobbyId: "lobby1", createdByUid: "creator", createdAt: 0, expiresAt: Date.now() - 1000 })
    );
    const result = await joinLobbyViaInvite("invite1", "uid1", "Ahmet", 0);
    expect(result).toEqual({ outcome: "invalid-or-expired" });
  });

  it("returns invalid-or-expired when the referenced lobby no longer exists", async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap(true, { lobbyId: "lobby1", createdByUid: "c", createdAt: 0, expiresAt: Date.now() + 1000 }))
      .mockResolvedValueOnce(snap(false));
    const result = await joinLobbyViaInvite("invite1", "uid1", "Ahmet", 0);
    expect(result).toEqual({ outcome: "invalid-or-expired" });
  });

  it("returns already-member without writing anything when already a member", async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap(true, { lobbyId: "lobby1", createdByUid: "c", createdAt: 0, expiresAt: Date.now() + 1000 }))
      .mockResolvedValueOnce(snap(true, { name: "Fener Grubu", createdByUid: "c", createdAt: 0 }))
      .mockResolvedValueOnce(snap(true, { uid: "uid1", joinedAt: 1, viaInviteId: null }));
    const result = await joinLobbyViaInvite("invite1", "uid1", "Ahmet", 1);
    expect(result).toEqual({ outcome: "already-member", lobbyId: "lobby1" });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("returns at-cap when the joiner already has 3 lobbies", async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap(true, { lobbyId: "lobby1", createdByUid: "c", createdAt: 0, expiresAt: Date.now() + 1000 }))
      .mockResolvedValueOnce(snap(true, { name: "Fener Grubu", createdByUid: "c", createdAt: 0 }))
      .mockResolvedValueOnce(snap(false));
    const result = await joinLobbyViaInvite("invite1", "uid1", "Ahmet", 3);
    expect(result).toEqual({ outcome: "at-cap" });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("joins successfully and writes a joined system message", async () => {
    mockGetDoc
      .mockResolvedValueOnce(snap(true, { lobbyId: "lobby1", createdByUid: "c", createdAt: 0, expiresAt: Date.now() + 1000 }))
      .mockResolvedValueOnce(snap(true, { name: "Fener Grubu", createdByUid: "c", createdAt: 0 }))
      .mockResolvedValueOnce(snap(false));
    const result = await joinLobbyViaInvite("invite1", "uid1", "Ahmet", 0);
    expect(result).toEqual({ outcome: "joined", lobbyId: "lobby1" });
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: ["lobbies", "lobby1", "members", "uid1"] },
      expect.objectContaining({ uid: "uid1", viaInviteId: "invite1" })
    );
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ text: "Ahmet katıldı.", system: { kind: "joined", subjectUid: "uid1" } })
    );
  });
});
