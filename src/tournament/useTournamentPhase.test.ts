import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";

const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockUnsubscribe = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: vi.fn(),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useTournamentPhase } from "./useTournamentPhase";

type SnapshotCallback = (snapshot: { exists: () => boolean; data: () => unknown }) => void;

function setDebugDate(date: string) {
  window.history.pushState({}, "", `?debugDate=${date}`);
}

describe("useTournamentPhase", () => {
  let capturedOnNext: SnapshotCallback | undefined;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    capturedOnNext = undefined;
    mockOnSnapshot.mockImplementation((_doc: unknown, onNext: SnapshotCallback) => {
      capturedOnNext = onNext;
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    window.history.pushState({}, "", "/");
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("reports pre before the cutoff via debug override", () => {
    setDebugDate("2026-01-01");
    const { result } = renderHook(() => useTournamentPhase());
    expect(result.current).toBe("pre");
  });

  it("reports post at/after the cutoff via debug override", () => {
    setDebugDate("2026-09-08");
    const { result } = renderHook(() => useTournamentPhase());
    expect(result.current).toBe("post");
  });

  it("ignores debug override when DEV is false", () => {
    vi.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
    vi.stubEnv("DEV", false);
    setDebugDate("2026-09-08");
    const { result } = renderHook(() => useTournamentPhase());
    // With DEV false, debug override is ignored, real Date is used (frozen before cutoff)
    expect(result.current).toBe("pre");
  });

  it("dev panel override forces post even when debugDate says pre", async () => {
    setDebugDate("2026-01-01");
    const { result } = renderHook(() => useTournamentPhase());
    expect(result.current).toBe("pre");
    act(() => {
      capturedOnNext!({ exists: () => true, data: () => ({ tournamentActive: true, currentDateOverride: null }) });
    });
    expect(result.current).toBe("post");
  });

  it("dev panel override forces pre even when debugDate says post", async () => {
    setDebugDate("2026-09-08");
    const { result } = renderHook(() => useTournamentPhase());
    expect(result.current).toBe("post");
    act(() => {
      capturedOnNext!({ exists: () => true, data: () => ({ tournamentActive: false, currentDateOverride: null }) });
    });
    expect(result.current).toBe("pre");
  });

  it("falls back to debugDate when the dev config has no explicit override", () => {
    setDebugDate("2026-09-08");
    const { result } = renderHook(() => useTournamentPhase());
    act(() => {
      capturedOnNext!({ exists: () => true, data: () => ({ tournamentActive: null, currentDateOverride: null }) });
    });
    expect(result.current).toBe("post");
  });
});
