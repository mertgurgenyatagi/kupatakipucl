import { vi, describe, it, expect, beforeEach } from "vitest";

const mockWriteBatch = vi.fn();
const mockDoc = vi.fn((...args: unknown[]) => {
  if (args.length === 1) return { id: "generated-lobby-id" };
  const [, ...path] = args as [unknown, ...string[]];
  return { path };
});
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
  doc: (...args: unknown[]) => mockDoc(...args),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { createLobby } from "./createLobby";

interface FakeBatch {
  set: ReturnType<typeof vi.fn>;
  commit: ReturnType<typeof vi.fn>;
}

describe("createLobby", () => {
  let batch: FakeBatch;

  beforeEach(() => {
    mockDoc.mockClear();
    mockCollection.mockClear();
    batch = { set: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
    mockWriteBatch.mockReturnValue(batch);
  });

  it("returns the newly generated lobby id", async () => {
    const id = await createLobby("uid1", "Fener Grubu", "Ahmet");
    expect(id).toBe("generated-lobby-id");
  });

  it("writes the lobby doc, the creator's bootstrap member doc, and a created system message in one batch", async () => {
    await createLobby("uid1", "Fener Grubu", "Ahmet");
    expect(batch.set).toHaveBeenCalledTimes(3);
    expect(batch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: "Fener Grubu", createdByUid: "uid1", memberUids: ["uid1"] })
    );
    expect(batch.set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ uid: "uid1", viaInviteId: null }));
    expect(batch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ text: "Özel lobi oluşturuldu.", system: { kind: "created", subjectUid: "uid1" } })
    );
    expect(batch.commit).toHaveBeenCalledTimes(1);
  });

  it("trims the name to 15 characters", async () => {
    await createLobby("uid1", "Bu isim gerçekten çok uzun bir grup ismi", "Ahmet");
    const lobbyWrite = batch.set.mock.calls.find((call) => "name" in (call[1] as object));
    expect((lobbyWrite![1] as { name: string }).name).toHaveLength(15);
  });
});
