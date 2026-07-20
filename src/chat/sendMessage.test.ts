// src/chat/sendMessage.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockAddDoc = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { sendMessage } from "./sendMessage";

describe("sendMessage", () => {
  beforeEach(() => {
    mockAddDoc.mockReset();
  });

  it("writes a trimmed message with the given uid and a createdAt timestamp", async () => {
    mockAddDoc.mockResolvedValue(undefined);
    await sendMessage("uid1", "  Merhaba dünya  ");
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [, written] = mockAddDoc.mock.calls[0];
    expect(written.uid).toBe("uid1");
    expect(written.text).toBe("Merhaba dünya");
    expect(typeof written.createdAt).toBe("number");
  });

  it("does not write for an empty or whitespace-only message", async () => {
    await sendMessage("uid1", "   ");
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it("propagates a write rejection to the caller", async () => {
    mockAddDoc.mockRejectedValue(new Error("permission-denied"));
    await expect(sendMessage("uid1", "Merhaba")).rejects.toThrow("permission-denied");
  });
});
