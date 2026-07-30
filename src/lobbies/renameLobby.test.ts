import { vi, describe, it, expect, beforeEach } from "vitest";

const mockUpdateDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, ...string[]])),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { renameLobby } from "./renameLobby";

describe("renameLobby", () => {
  beforeEach(() => {
    mockUpdateDoc.mockReset();
    mockAddDoc.mockReset();
    mockUpdateDoc.mockResolvedValue(undefined);
    mockAddDoc.mockResolvedValue({ id: "sysmsg1" });
  });

  it("updates the name field and announces the rename", async () => {
    await renameLobby("lobby1", "uid1", "Ahmet", "Yeni İsim");
    expect(mockUpdateDoc).toHaveBeenCalledWith({ path: ["lobbies", "lobby1"] }, { name: "Yeni İsim" });
    expect(mockAddDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ text: "Ahmet özel lobiyi yeniden adlandırdı.", system: { kind: "renamed", subjectUid: "uid1" } })
    );
  });

  it("trims the new name to 15 characters", async () => {
    await renameLobby("lobby1", "uid1", "Ahmet", "Bu isim gerçekten çok uzun bir grup ismi");
    const written = mockUpdateDoc.mock.calls[0][1] as { name: string };
    expect(written.name).toHaveLength(15);
  });

  it("does nothing for an empty/whitespace-only name", async () => {
    await renameLobby("lobby1", "uid1", "Ahmet", "   ");
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});
