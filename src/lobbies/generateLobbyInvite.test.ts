import { vi, describe, it, expect, beforeEach } from "vitest";

const mockAddDoc = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { generateLobbyInvite } from "./generateLobbyInvite";
import { LOBBY_INVITE_LIFETIME_MS } from "./lobbyTypes";

describe("generateLobbyInvite", () => {
  beforeEach(() => {
    mockAddDoc.mockReset();
    mockAddDoc.mockResolvedValue({ id: "invite1" });
  });

  it("writes an invite doc referencing the lobby and returns its new id", async () => {
    const id = await generateLobbyInvite("lobby1", "uid1");
    expect(mockCollection).toHaveBeenCalledWith({}, "lobbyInvites");
    expect(mockAddDoc.mock.calls[0][1]).toEqual(expect.objectContaining({ lobbyId: "lobby1", createdByUid: "uid1" }));
    expect(id).toBe("invite1");
  });

  it("sets expiresAt exactly one hour after createdAt", async () => {
    await generateLobbyInvite("lobby1", "uid1");
    const written = mockAddDoc.mock.calls[0][1] as { createdAt: number; expiresAt: number };
    expect(written.expiresAt - written.createdAt).toBe(LOBBY_INVITE_LIFETIME_MS);
  });
});
