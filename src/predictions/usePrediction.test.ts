import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { usePrediction, savePrediction, deletePrediction } from "./usePrediction";

describe("usePrediction", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
  });

  it("returns prediction=null and loading=false when uid is null", async () => {
    const { result } = renderHook(() => usePrediction(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toBeNull();
  });

  it("returns null when no prediction doc exists", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const { result } = renderHook(() => usePrediction("uid1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toBeNull();
  });

  it("returns the prediction when a doc exists", async () => {
    const data = { ranking: ["a", "b"], submittedAt: 1, updatedAt: 2 };
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => data });
    const { result } = renderHook(() => usePrediction("uid1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toEqual(data);
  });

  it("stops loading and leaves prediction null when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDoc.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => usePrediction("uid1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load prediction", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

  it("does not overwrite state with a stale prediction when uid changes before the read resolves", async () => {
    let resolveFirst: (value: { exists: () => boolean; data: () => unknown }) => void;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const secondData = { ranking: ["x", "y"], submittedAt: 456, updatedAt: 456 };

    mockGetDoc.mockImplementationOnce(() => firstPromise);
    mockGetDoc.mockImplementationOnce(() =>
      Promise.resolve({ exists: () => true, data: () => secondData })
    );

    const { result, rerender } = renderHook(({ uid }) => usePrediction(uid), {
      initialProps: { uid: "uid1" },
    });

    rerender({ uid: "uid2" });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toEqual(secondData);

    // Resolving the stale first promise afterwards must not clobber state.
    resolveFirst!({ exists: () => true, data: () => ({ ranking: ["stale"] }) });
    await Promise.resolve();
    await Promise.resolve();
    expect(result.current.prediction).toEqual(secondData);
  });
});

describe("savePrediction", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
  });

  it("keeps the original submittedAt on an update, and refreshes updatedAt", async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ranking: ["a"], submittedAt: 100, updatedAt: 100 }),
    });
    mockSetDoc.mockResolvedValue(undefined);

    const result = await savePrediction("uid1", ["b", "a"]);

    expect(result.ranking).toEqual(["b", "a"]);
    expect(result.submittedAt).toBe(100);
    expect(result.updatedAt).toBeGreaterThanOrEqual(100);
    expect(mockSetDoc).toHaveBeenCalledWith(expect.anything(), result);
  });

  it("sets submittedAt to now on the first-ever save", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);

    const result = await savePrediction("uid1", ["a"]);

    expect(result.submittedAt).toBe(result.updatedAt);
  });
});

describe("deletePrediction", () => {
  beforeEach(() => {
    mockDeleteDoc.mockReset();
  });

  it("deletes the prediction doc for the given uid", async () => {
    mockDeleteDoc.mockResolvedValue(undefined);
    await deletePrediction("uid1");
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(mockDeleteDoc).toHaveBeenCalledWith({ collection: "predictions", id: "uid1" });
  });
});
