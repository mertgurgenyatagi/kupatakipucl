import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, collectionName: string, docId: string) => ({
  collectionName,
  docId,
}));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { usePredictionSubmitters } from "./usePredictionSubmitters";
import { clearSessionCache } from "../lib/sessionCache";

/** Shape of a Firestore snapshot for the one document this hook reads. */
function snapshot(uids: string[] | undefined, exists = true) {
  return { exists: () => exists, data: () => ({ uids }) };
}

describe("usePredictionSubmitters", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockDoc.mockClear();
    clearSessionCache();
  });

  it("reads the submitters doc, not the predictions collection", async () => {
    // The predictions collection is unreadable in bulk before the league
    // phase starts (firestore.rules) — and reading it was only ever a way to
    // get at document ids anyway.
    mockGetDoc.mockResolvedValue(snapshot([]));
    const { result } = renderHook(() => usePredictionSubmitters());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockDoc).toHaveBeenCalledWith({}, "leaderboardCache", "submitters");
  });

  it("returns an empty set before anyone has submitted", async () => {
    mockGetDoc.mockResolvedValue(snapshot([]));
    const { result } = renderHook(() => usePredictionSubmitters());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.submitterUids).toEqual(new Set());
  });

  it("returns every uid the document lists", async () => {
    mockGetDoc.mockResolvedValue(snapshot(["uid1", "uid2"]));
    const { result } = renderHook(() => usePredictionSubmitters());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.submitterUids).toEqual(new Set(["uid1", "uid2"]));
  });

  it("treats a missing document as nobody having submitted", async () => {
    // The state between deploying the Cloud Function and its first recompute,
    // which is also the state before anyone has submitted anything.
    mockGetDoc.mockResolvedValue(snapshot(undefined, false));
    const { result } = renderHook(() => usePredictionSubmitters());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.submitterUids).toEqual(new Set());
  });

  it("survives a document with no uids field", async () => {
    mockGetDoc.mockResolvedValue(snapshot(undefined));
    const { result } = renderHook(() => usePredictionSubmitters());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.submitterUids).toEqual(new Set());
  });

  it("stops loading and leaves the set empty when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDoc.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => usePredictionSubmitters());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.submitterUids).toEqual(new Set());
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load prediction submitters",
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });

  it("serves a second mount from the session cache without refetching", async () => {
    mockGetDoc.mockResolvedValue(snapshot(["u1", "u2"]));
    const first = renderHook(() => usePredictionSubmitters());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(mockGetDoc).toHaveBeenCalledTimes(1);

    const second = renderHook(() => usePredictionSubmitters());
    // Populated on the very first render: no skeleton on a repeat visit.
    expect(second.result.current.submitterUids).toEqual(new Set(["u1", "u2"]));
    expect(second.result.current.loading).toBe(false);
  });
});
