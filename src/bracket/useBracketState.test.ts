import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useBracketState } from "./useBracketState";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;

describe("useBracketState", () => {
  let callback: SnapshotCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_docRef: unknown, onNext: SnapshotCallback) => {
      callback = onNext;
      return mockUnsubscribe;
    });
  });

  it("starts with an empty bracket state and loading=true", () => {
    const { result } = renderHook(() => useBracketState());
    expect(result.current.bracketState).toEqual({ ro16Teams: {}, winners: {} });
    expect(result.current.loading).toBe(true);
  });

  it("reflects the real doc once it loads", () => {
    const { result } = renderHook(() => useBracketState());
    const data = { ro16Teams: { "ro16-1": ["Arsenal", "Napoli"] }, winners: {} };
    act(() => {
      callback({ exists: () => true, data: () => data });
    });
    expect(result.current.bracketState).toEqual(data);
    expect(result.current.loading).toBe(false);
  });

  it("falls back to an empty bracket state when the doc doesn't exist", () => {
    const { result } = renderHook(() => useBracketState());
    act(() => {
      callback({ exists: () => false, data: () => ({}) });
    });
    expect(result.current.bracketState).toEqual({ ro16Teams: {}, winners: {} });
    expect(result.current.loading).toBe(false);
  });
});
