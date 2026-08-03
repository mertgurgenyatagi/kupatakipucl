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

import {
  useKnockoutPrediction,
  saveKnockoutPrediction,
  deleteKnockoutPrediction,
} from "./useKnockoutPrediction";

describe("useKnockoutPrediction", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
    mockDeleteDoc.mockReset();
  });

  it("returns prediction=null and loading=false when uid is null", async () => {
    const { result } = renderHook(() => useKnockoutPrediction(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toBeNull();
  });

  it("returns null when no prediction doc exists", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    const { result } = renderHook(() => useKnockoutPrediction("uid1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toBeNull();
  });

  it("returns the prediction when a doc exists", async () => {
    const data = {
      quarterFinalists: ["a", "b", "c", "d", "e", "f", "g", "h"],
      semiFinalists: ["a", "b", "c", "d"],
      finalists: ["a", "b"],
      champion: "a",
      submittedAt: 1,
      updatedAt: 2,
    };
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => data });
    const { result } = renderHook(() => useKnockoutPrediction("uid1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toEqual(data);
  });

  it("saveKnockoutPrediction writes to Firestore", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);

    const payload = {
      quarterFinalists: ["a", "b", "c", "d", "e", "f", "g", "h"],
      semiFinalists: ["a", "b", "c", "d"],
      finalists: ["a", "b"],
      champion: "a",
    };

    const res = await saveKnockoutPrediction("uid1", payload);
    expect(res.champion).toBe("a");
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "knockoutPredictions", id: "uid1" }),
      expect.objectContaining({ champion: "a" })
    );
  });

  it("deleteKnockoutPrediction deletes doc", async () => {
    mockDeleteDoc.mockResolvedValue(undefined);
    await deleteKnockoutPrediction("uid1");
    expect(mockDeleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "knockoutPredictions", id: "uid1" })
    );
  });
});
