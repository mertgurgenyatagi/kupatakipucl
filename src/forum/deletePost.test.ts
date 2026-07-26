// src/forum/deletePost.test.ts
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockDelete = vi.fn();
const mockCommit = vi.fn();
const mockWriteBatch = vi.fn((_db: unknown) => ({ delete: mockDelete, commit: mockCommit }));
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...(args as [unknown])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { deletePost } from "./deletePost";

describe("deletePost", () => {
  beforeEach(() => {
    mockDelete.mockReset();
    mockCommit.mockReset().mockResolvedValue(undefined);
    mockDoc.mockClear();
  });

  it("deletes the root post itself when there are no replies", async () => {
    await deletePost("root-1", []);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith({ collection: "forumPosts", id: "root-1" });
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("deletes every reply id plus the root itself, in one batch", async () => {
    await deletePost("root-1", ["reply-1", "reply-2"]);
    expect(mockDelete).toHaveBeenCalledTimes(3);
    expect(mockDelete).toHaveBeenCalledWith({ collection: "forumPosts", id: "reply-1" });
    expect(mockDelete).toHaveBeenCalledWith({ collection: "forumPosts", id: "reply-2" });
    expect(mockDelete).toHaveBeenCalledWith({ collection: "forumPosts", id: "root-1" });
  });

  it("propagates a commit rejection", async () => {
    mockCommit.mockRejectedValue(new Error("permission-denied"));
    await expect(deletePost("root-1", [])).rejects.toThrow("permission-denied");
  });
});
