import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));
const mockQuery = vi.fn((ref: unknown) => ref);
const mockOrderBy = vi.fn((field: string) => ({ field }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  query: (...args: unknown[]) => mockQuery(...(args as [unknown])),
  orderBy: (...args: unknown[]) => mockOrderBy(...(args as [string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { searchMessages } from "./searchMessages";

function docSnap(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

describe("searchMessages", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it("returns an empty array without querying anything for a blank term", async () => {
    const result = await searchMessages("   ");
    expect(result).toEqual([]);
    expect(mockGetDocs).not.toHaveBeenCalled();
  });

  it("matches case-insensitively on message text", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        docSnap("m1", { uid: "u1", text: "Bugün hava GÜZEL", createdAt: 1 }),
        docSnap("m2", { uid: "u1", text: "alakasız mesaj", createdAt: 2 }),
      ],
    });
    const result = await searchMessages("güzel");
    expect(result.map((m) => m.id)).toEqual(["m1"]);
  });

  it("excludes deleted messages from results", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [docSnap("m1", { uid: "u1", text: "gizli bilgi", createdAt: 1, deleted: true })],
    });
    const result = await searchMessages("gizli");
    expect(result).toEqual([]);
  });
});
