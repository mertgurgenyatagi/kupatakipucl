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
import { clearSessionCache } from "../lib/sessionCache";

describe("usePredictionSubmitters", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    clearSessionCache();
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

  // Grows to 250 docs, each carrying a 36-element ranking array (~150 KiB) just
  // to read document ids -- and it gates first paint on LoggedInHome
  // (scaling-250 design spec S4).
  it("serves a second mount from the session cache without refetching", async () => {
    mockGetDocs.mockResolvedValue({ docs: [{ id: "u1" }, { id: "u2" }] });
    const first = renderHook(() => usePredictionSubmitters());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(mockGetDocs).toHaveBeenCalledTimes(1);

    const second = renderHook(() => usePredictionSubmitters());
    // Populated on the very first render: no skeleton, and no second read of
    // 250 prediction docs.
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.submitterUids).toEqual(new Set(["u1", "u2"]));
  });
});
