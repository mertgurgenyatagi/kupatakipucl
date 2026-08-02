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

import { useCurrentMatchday } from "./useCurrentMatchday";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;

describe("useCurrentMatchday", () => {
  let callback: SnapshotCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_docRef: unknown, onNext: SnapshotCallback) => {
      callback = onNext;
      return mockUnsubscribe;
    });
  });

  it("defaults to null before the doc arrives", () => {
    const { result } = renderHook(() => useCurrentMatchday());
    expect(result.current).toBeNull();
  });

  it("defaults to null when the doc doesn't exist", () => {
    const { result } = renderHook(() => useCurrentMatchday());
    act(() => callback({ exists: () => false, data: () => ({}) }));
    expect(result.current).toBeNull();
  });

  it("defaults to null when currentMatchday isn't a number yet", () => {
    const { result } = renderHook(() => useCurrentMatchday());
    act(() => callback({ exists: () => true, data: () => ({ phase: "leaguephase" }) }));
    expect(result.current).toBeNull();
  });

  it("reflects the real currentMatchday once the doc loads", () => {
    const { result } = renderHook(() => useCurrentMatchday());
    act(() => callback({ exists: () => true, data: () => ({ currentMatchday: 4 }) }));
    expect(result.current).toBe(4);
  });
});
