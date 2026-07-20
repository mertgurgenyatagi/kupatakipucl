import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useResults } from "./useResults";

describe("useResults", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it("returns an empty results map before any docs exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => useResults());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toEqual({});
  });

  it("keys results by doc id", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "arsenal",
          data: () => ({ position: 1, points: 10, goalDifference: 5, goalsFor: 8, goalsAgainst: 3 }),
        },
        {
          id: "barcelona",
          data: () => ({ position: 2, points: 9, goalDifference: 4, goalsFor: 7, goalsAgainst: 3 }),
        },
      ],
    });
    const { result } = renderHook(() => useResults());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results.arsenal.position).toBe(1);
    expect(result.current.results.barcelona.position).toBe(2);
  });

  it("stops loading and leaves results empty when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => useResults());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load results", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
