import { vi, describe, it, expect, beforeEach } from "vitest";

const mockUpdateDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, ...string[]])),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { deleteMessage } from "./deleteMessage";

describe("deleteMessage", () => {
  beforeEach(() => {
    mockUpdateDoc.mockReset();
    mockDoc.mockClear();
  });

  it("soft-deletes by setting only the `deleted` flag", async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    await deleteMessage("msg1");
    expect(mockDoc).toHaveBeenCalledWith({}, "messages", "msg1");
    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update).toEqual({ deleted: true });
  });

  // The lobby message lives at lobbies/{id}/messages/{id}, not in the global
  // collection — updating the global path just addressed a document that
  // doesn't exist, so every in-lobby delete failed.
  it("targets the lobby's own messages subcollection when a lobbyId is given", async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    await deleteMessage("msg1", "lobby1");
    expect(mockDoc).toHaveBeenCalledWith({}, "lobbies", "lobby1", "messages", "msg1");
    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update).toEqual({ deleted: true });
  });

  it("falls back to the global collection when the lobbyId is explicitly null", async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    await deleteMessage("msg1", null);
    expect(mockDoc).toHaveBeenCalledWith({}, "messages", "msg1");
  });

  it("propagates a write rejection to the caller", async () => {
    mockUpdateDoc.mockRejectedValue(new Error("permission-denied"));
    await expect(deleteMessage("msg1")).rejects.toThrow("permission-denied");
  });
});
