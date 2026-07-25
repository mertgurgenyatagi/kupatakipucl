import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { usePredictionSubmitters } from "./usePredictionSubmitters";

describe("usePredictionSubmitters", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it("returns an empty set before anyone has submitted", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => usePredictionSubmitters());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.submitterUids).toEqual(new Set());
  });

  it("collects each prediction doc's id as a submitter uid", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "uid1" }, { id: "uid2" }],
    });
    const { result } = renderHook(() => usePredictionSubmitters());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.submitterUids).toEqual(new Set(["uid1", "uid2"]));
  });

  it("stops loading and leaves the set empty when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => usePredictionSubmitters());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.submitterUids).toEqual(new Set());
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load prediction submitters", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
