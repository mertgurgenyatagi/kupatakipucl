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

import { useAllKnockoutPredictions } from "./useAllKnockoutPredictions";

describe("useAllKnockoutPredictions", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockCollection.mockClear();
    clearSessionCache();
  });

  it("reads the knockoutPredictions collection", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => useAllKnockoutPredictions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockCollection).toHaveBeenCalledWith({}, "knockoutPredictions");
  });

  it("maps each doc into a record keyed by uid", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "u1", data: () => ({ champion: "arsenal" }) }],
    });
    const { result } = renderHook(() => useAllKnockoutPredictions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.predictions).toEqual({ u1: { champion: "arsenal" } });
  });

  it("stops loading and stays empty when the read fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => useAllKnockoutPredictions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.predictions).toEqual({});
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load all knockout predictions",
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });

  // 250 reads per TeamPopup/MatchupPopup open, repeated on every re-open,
  // before this (scaling-250 design spec §4).
  it("serves a re-opened popup from the session cache without refetching", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: "u1", data: () => ({ champion: "arsenal" }) }],
    });
    const first = renderHook(() => useAllKnockoutPredictions());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(mockGetDocs).toHaveBeenCalledTimes(1);

    const second = renderHook(() => useAllKnockoutPredictions());
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.predictions).toEqual({ u1: { champion: "arsenal" } });
  });
});
