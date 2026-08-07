import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, ...path: string[]) => ({ path }));
const mockQuery = vi.fn((ref: unknown) => ref);
const mockOrderBy = vi.fn((field: string) => ({ field }));
const mockLimit = vi.fn((n: number) => ({ limit: n }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, ...string[]])),
  query: (...args: unknown[]) => mockQuery(...(args as [unknown])),
  orderBy: (...args: unknown[]) => mockOrderBy(...(args as [string])),
  limit: (...args: unknown[]) => mockLimit(...(args as [number])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { fetchRecentMessagesForSearch, searchMessages, SEARCH_WINDOW } from "./searchMessages";

function docSnap(id: string, data: Record<string, unknown>) {
  return { id, data: () => data };
}

describe("searchMessages", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockCollection.mockClear();
    mockLimit.mockClear();
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

  // special-lobby-round-7 Q2 locks search to "confined to the current view —
  // search General, or search one lobby, never mixed".
  it("searches the global collection when no lobby is given", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await fetchRecentMessagesForSearch();
    expect(mockCollection).toHaveBeenCalledWith({}, "messages");
  });

  it("searches only the given lobby's own messages subcollection", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await fetchRecentMessagesForSearch("lobby1");
    expect(mockCollection).toHaveBeenCalledWith({}, "lobbies", "lobby1", "messages");
    expect(mockCollection).not.toHaveBeenCalledWith({}, "messages");
  });

  it("threads a lobbyId through the one-shot searchMessages entry point too", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [docSnap("m1", { uid: "u1", text: "lobi mesajı", createdAt: 1 })],
    });
    const result = await searchMessages("lobi", "lobby1");
    expect(mockCollection).toHaveBeenCalledWith({}, "lobbies", "lobby1", "messages");
    expect(result.map((m) => m.id)).toEqual(["m1"]);
  });

  // Was unbounded: one search click downloaded every message ever sent, which
  // at 250 participants over a season is tens of thousands of documents and
  // grows daily (scaling-250 design spec, 2026-08-07, S3).
  it("caps the fetch to the most recent SEARCH_WINDOW messages", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await fetchRecentMessagesForSearch();
    expect(mockLimit).toHaveBeenCalledWith(SEARCH_WINDOW);
  });

  it("caps a lobby-scoped search the same way", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    await fetchRecentMessagesForSearch("lobby1");
    expect(mockLimit).toHaveBeenCalledWith(SEARCH_WINDOW);
  });

  it("uses a window of 2000", () => {
    expect(SEARCH_WINDOW).toBe(2000);
  });
});
