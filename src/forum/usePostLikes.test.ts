import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { clearSessionCache } from "../lib/sessionCache";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));
const mockDoc = vi.fn((_db: unknown, collectionName: string, id: string) => ({ collectionName, id }));
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { usePostLikes, setPostLiked } from "./usePostLikes";

describe("usePostLikes", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockSetDoc.mockReset();
    mockDeleteDoc.mockReset();
    clearSessionCache();
  });

  it("returns an empty map before any likes exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => usePostLikes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.likesByPost).toEqual(new Map());
  });

  it("groups likes by postId into a set of uids", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { data: () => ({ postId: "p1", uid: "uid1", createdAt: 1 }) },
        { data: () => ({ postId: "p1", uid: "uid2", createdAt: 2 }) },
        { data: () => ({ postId: "p2", uid: "uid1", createdAt: 3 }) },
      ],
    });
    const { result } = renderHook(() => usePostLikes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.likesByPost.get("p1")).toEqual(new Set(["uid1", "uid2"]));
    expect(result.current.likesByPost.get("p2")).toEqual(new Set(["uid1"]));
  });

  it("stops loading and leaves the map empty when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => usePostLikes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.likesByPost).toEqual(new Map());
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load post likes", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});

describe("setPostLiked", () => {
  beforeEach(() => {
    mockSetDoc.mockReset();
    mockDeleteDoc.mockReset();
  });

  it("writes a like doc keyed by postId_uid when liking", async () => {
    mockSetDoc.mockResolvedValue(undefined);
    await setPostLiked("p1", "uid1", true);
    expect(mockDoc).toHaveBeenCalledWith({}, "postLikes", "p1_uid1");
    expect(mockSetDoc).toHaveBeenCalledWith(
      { collectionName: "postLikes", id: "p1_uid1" },
      expect.objectContaining({ postId: "p1", uid: "uid1" })
    );
  });

  it("deletes the like doc when unliking", async () => {
    mockDeleteDoc.mockResolvedValue(undefined);
    await setPostLiked("p1", "uid1", false);
    expect(mockDeleteDoc).toHaveBeenCalledWith({ collectionName: "postLikes", id: "p1_uid1" });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
