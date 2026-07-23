import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockSetDoc = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useDevConfig, setPhaseOverride, setCurrentDateOverride, setLoggedInOverride } from "./useDevConfig";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;

describe("useDevConfig", () => {
  let capturedOnNext: SnapshotCallback;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockSetDoc.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_doc: unknown, onNext: SnapshotCallback) => {
      capturedOnNext = onNext;
      return mockUnsubscribe;
    });
  });

  it("defaults to phaseOverride=null, currentDateOverride=null, loggedInOverride=null before any doc exists", async () => {
    const { result } = renderHook(() => useDevConfig());
    act(() => {
      capturedOnNext({ exists: () => false, data: () => ({}) });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.config).toEqual({
      phaseOverride: null,
      currentDateOverride: null,
      loggedInOverride: null,
    });
  });

  it("reflects the stored config once the doc arrives", async () => {
    const { result } = renderHook(() => useDevConfig());
    act(() => {
      capturedOnNext({ exists: () => true, data: () => ({ phaseOverride: "knockout", currentDateOverride: "2026-10-01" }) });
    });
    await waitFor(() => expect(result.current.config.phaseOverride).toBe("knockout"));
    expect(result.current.config.currentDateOverride).toBe("2026-10-01");
  });

  it("fills in missing fields with defaults when the doc is partial", async () => {
    const { result } = renderHook(() => useDevConfig());
    act(() => {
      capturedOnNext({ exists: () => true, data: () => ({ phaseOverride: "leaguephase" }) });
    });
    await waitFor(() => expect(result.current.config.phaseOverride).toBe("leaguephase"));
    expect(result.current.config.currentDateOverride).toBeNull();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useDevConfig());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe("setPhaseOverride", () => {
  beforeEach(() => {
    mockSetDoc.mockReset();
  });

  it("writes phaseOverride with merge:true", async () => {
    mockSetDoc.mockResolvedValue(undefined);
    await setPhaseOverride("knockout");
    expect(mockSetDoc).toHaveBeenCalledWith(expect.anything(), { phaseOverride: "knockout" }, { merge: true });
  });
});

describe("setCurrentDateOverride", () => {
  beforeEach(() => {
    mockSetDoc.mockReset();
  });

  it("writes currentDateOverride with merge:true", async () => {
    mockSetDoc.mockResolvedValue(undefined);
    await setCurrentDateOverride("2026-10-01");
    expect(mockSetDoc).toHaveBeenCalledWith(expect.anything(), { currentDateOverride: "2026-10-01" }, { merge: true });
  });
});

describe("setLoggedInOverride", () => {
  beforeEach(() => {
    mockSetDoc.mockReset();
  });

  it("writes loggedInOverride with merge:true", async () => {
    mockSetDoc.mockResolvedValue(undefined);
    await setLoggedInOverride(true);
    expect(mockSetDoc).toHaveBeenCalledWith(expect.anything(), { loggedInOverride: true }, { merge: true });
  });
});
