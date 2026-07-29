import { vi, describe, it, expect, beforeEach } from "vitest";

const mockAddDoc = vi.fn();
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

vi.mock("firebase/firestore", () => ({
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { sendLobbyMessage, sendLobbySystemMessage } from "./sendLobbyMessage";

describe("sendLobbyMessage", () => {
  beforeEach(() => {
    mockAddDoc.mockReset();
    mockAddDoc.mockResolvedValue({ id: "msg1" });
  });

  it("writes a trimmed message to that lobby's messages subcollection", async () => {
    await sendLobbyMessage("lobby1", "uid1", "  Merhaba  ");
    expect(mockCollection).toHaveBeenCalledWith({}, "lobbies", "lobby1", "messages");
    expect(mockAddDoc.mock.calls[0][1]).toEqual(expect.objectContaining({ uid: "uid1", text: "Merhaba" }));
  });

  it("does nothing for empty/whitespace-only text", async () => {
    await sendLobbyMessage("lobby1", "uid1", "   ");
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it("caps text at 360 characters", async () => {
    await sendLobbyMessage("lobby1", "uid1", "x".repeat(400));
    const written = mockAddDoc.mock.calls[0][1] as { text: string };
    expect(written.text).toHaveLength(360);
  });

  it("includes mentionedUids only when present", async () => {
    await sendLobbyMessage("lobby1", "uid1", "hey", ["uid2"]);
    expect(mockAddDoc.mock.calls[0][1]).toEqual(expect.objectContaining({ mentionedUids: ["uid2"] }));

    mockAddDoc.mockClear();
    await sendLobbyMessage("lobby1", "uid1", "hey");
    expect(mockAddDoc.mock.calls[0][1]).not.toHaveProperty("mentionedUids");
  });

  it("includes quote fields when a quoted message is passed", async () => {
    await sendLobbyMessage("lobby1", "uid1", "reply", [], { id: "orig1", uid: "uid2", text: "original" });
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ quotedMessageId: "orig1", quotedAuthorUid: "uid2", quotedText: "original" })
    );
  });
});

describe("sendLobbySystemMessage", () => {
  beforeEach(() => {
    mockAddDoc.mockReset();
    mockAddDoc.mockResolvedValue({ id: "msg1" });
  });

  it("writes uid as the acting user, and system.subjectUid as the narrated-about person", async () => {
    await sendLobbySystemMessage("lobby1", "creatorUid", "removed", "removedUid", "Ahmet");
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        uid: "creatorUid",
        text: "Ahmet çıkarıldı.",
        system: { kind: "removed", subjectUid: "removedUid" },
      })
    );
  });

  it("uses the joined phrasing for a join event", async () => {
    await sendLobbySystemMessage("lobby1", "uid1", "joined", "uid1", "Zeynep");
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ text: "Zeynep katıldı.", system: { kind: "joined", subjectUid: "uid1" } })
    );
  });
});
