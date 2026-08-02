import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { clearSessionCache } from "../lib/sessionCache";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useAllBracketPredictions } from "./useAllBracketPredictions";

describe("useAllBracketPredictions", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    clearSessionCache();
  });

  it("returns an empty array before any bracket predictions exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => useAllBracketPredictions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.predictions).toEqual([]);
  });

  it("returns every submitted bracket prediction's data", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: "uid1", data: () => ({ picks: { "ro16-1": "Arsenal" }, submittedAt: 1 }) },
        { id: "uid2", data: () => ({ picks: { "ro16-1": "Napoli" }, submittedAt: 2 }) },
      ],
    });
    const { result } = renderHook(() => useAllBracketPredictions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.predictions).toHaveLength(2);
    expect(result.current.predictions[0].picks["ro16-1"]).toBe("Arsenal");
  });

  it("stops loading and leaves predictions empty when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => useAllBracketPredictions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.predictions).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load bracket predictions", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
