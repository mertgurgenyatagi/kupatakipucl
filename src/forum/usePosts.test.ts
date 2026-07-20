// src/forum/usePosts.test.ts
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { usePosts } from "./usePosts";

describe("usePosts", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it("returns an empty list before any posts exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => usePosts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts).toEqual([]);
  });

  it("maps each doc to a PostWithId", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "post1",
          data: () => ({ uid: "uid1", text: "Merhaba", imageURL: null, parentId: null, createdAt: 100 }),
        },
      ],
    });
    const { result } = renderHook(() => usePosts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts).toEqual([
      { id: "post1", uid: "uid1", text: "Merhaba", imageURL: null, parentId: null, createdAt: 100 },
    ]);
  });

  it("stops loading and leaves posts empty when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => usePosts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load forum posts", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("re-fetches when refetch is called", async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    const { result } = renderHook(() => usePosts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetDocs).toHaveBeenCalledTimes(1);

    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: "post1", data: () => ({ uid: "uid1", text: "Yeni", imageURL: null, parentId: null, createdAt: 200 }) }],
    });
    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(mockGetDocs).toHaveBeenCalledTimes(2);
  });
});
