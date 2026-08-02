import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useBracketPrediction, saveBracketPrediction } from "./useBracketPrediction";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;

describe("useBracketPrediction", () => {
  let callback: SnapshotCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_docRef: unknown, onNext: SnapshotCallback) => {
      callback = onNext;
      return mockUnsubscribe;
    });
  });

  it("returns prediction=null and loading=false when uid is null", async () => {
    const { result } = renderHook(() => useBracketPrediction(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.prediction).toBeNull();
  });

  it("returns the prediction once the doc loads", () => {
    const { result } = renderHook(() => useBracketPrediction("uid1"));
    const data = { picks: { "ro16-1": "Arsenal" }, submittedAt: 100 };
    act(() => callback({ exists: () => true, data: () => data }));
    expect(result.current.prediction).toEqual(data);
    expect(result.current.loading).toBe(false);
  });

  it("returns null when no prediction doc exists yet", () => {
    const { result } = renderHook(() => useBracketPrediction("uid1"));
    act(() => callback({ exists: () => false, data: () => ({}) }));
    expect(result.current.prediction).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

describe("saveBracketPrediction", () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockSetDoc.mockReset();
  });

  it("saves a new prediction with the current timestamp", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);

    const result = await saveBracketPrediction("uid1", { "ro16-1": "Arsenal" });

    expect(result.picks).toEqual({ "ro16-1": "Arsenal" });
    expect(typeof result.submittedAt).toBe("number");
    expect(mockSetDoc).toHaveBeenCalledWith(expect.anything(), result);
  });

  it("throws if a prediction already exists, and does not call setDoc", async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ picks: {}, submittedAt: 1 }) });

    await expect(saveBracketPrediction("uid1", { "ro16-1": "Arsenal" })).rejects.toThrow(
      "Bracket prediction already submitted"
    );
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});
