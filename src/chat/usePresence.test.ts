import { act, renderHook } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const mockSetDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, path: string, id: string) => ({ path, id }));
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));
const mockOnSnapshot = vi.fn();
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { usePresenceHeartbeat, useOnlineCount } from "./usePresence";

type SnapshotCallback = (snapshot: { docs: { data: () => unknown }[] }) => void;

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("usePresenceHeartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSetDoc.mockReset();
    mockSetDoc.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does nothing when there's no signed-in uid", () => {
    renderHook(() => usePresenceHeartbeat(null));
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it("sends an immediate heartbeat on mount", () => {
    renderHook(() => usePresenceHeartbeat("uid1"));
    expect(mockDoc).toHaveBeenCalledWith({}, "presence", "uid1");
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it("sends another heartbeat on each interval tick", () => {
    renderHook(() => usePresenceHeartbeat("uid1"));
    act(() => vi.advanceTimersByTime(20_000));
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
    act(() => vi.advanceTimersByTime(20_000));
    expect(mockSetDoc).toHaveBeenCalledTimes(3);
  });

  it("sends a heartbeat when the tab becomes visible again", () => {
    renderHook(() => usePresenceHeartbeat("uid1"));
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    act(() => setVisibility("visible"));
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
  });

  it("stops sending heartbeats after unmount", () => {
    const { unmount } = renderHook(() => usePresenceHeartbeat("uid1"));
    unmount();
    mockSetDoc.mockClear();
    act(() => vi.advanceTimersByTime(60_000));
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe("useOnlineCount", () => {
  let capturedOnNext: SnapshotCallback;

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: SnapshotCallback) => {
      capturedOnNext = onNext;
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts at zero", () => {
    const { result } = renderHook(() => useOnlineCount());
    expect(result.current).toBe(0);
  });

  it("counts everyone with a fresh heartbeat", () => {
    const { result } = renderHook(() => useOnlineCount());
    const now = Date.now();
    act(() => {
      capturedOnNext({ docs: [{ data: () => ({ lastSeen: now }) }, { data: () => ({ lastSeen: now }) }] });
    });
    expect(result.current).toBe(2);
  });

  it("stops counting a heartbeat once it goes stale", () => {
    const { result } = renderHook(() => useOnlineCount());
    const start = Date.now();
    act(() => {
      capturedOnNext({ docs: [{ data: () => ({ lastSeen: start }) }] });
    });
    expect(result.current).toBe(1);

    act(() => {
      vi.setSystemTime(start + 46_000);
      vi.advanceTimersByTime(46_000);
    });
    expect(result.current).toBe(0);
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useOnlineCount());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
