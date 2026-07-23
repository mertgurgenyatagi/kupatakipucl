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

describe("useTournamentPhase", () => {
  let callbacks: Record<string, SnapshotCallback>;

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockUnsubscribe.mockReset();
    callbacks = {};
    mockOnSnapshot.mockImplementation((docRef: { collection: string; id: string }, onNext: SnapshotCallback) => {
      callbacks[`${docRef.collection}/${docRef.id}`] = onNext;
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function fireTournamentState(data: unknown) {
    act(() => {
      callbacks["tournamentState/current"]({ exists: () => true, data: () => data });
    });
  }

  function fireDevConfig(data: unknown) {
    act(() => {
      callbacks["devConfig/state"]({ exists: () => true, data: () => data });
    });
  }

  it("defaults to notstarted before the tournamentState doc arrives", () => {
    const { result } = renderHook(() => useTournamentPhase());
    expect(result.current).toBe("notstarted");
  });

  it("defaults to notstarted when the tournamentState doc doesn't exist", () => {
    const { result } = renderHook(() => useTournamentPhase());
    act(() => {
      callbacks["tournamentState/current"]({ exists: () => false, data: () => ({}) });
    });
    expect(result.current).toBe("notstarted");
  });

  it("reflects the real phase once the tournamentState doc loads", () => {
    const { result } = renderHook(() => useTournamentPhase());
    fireTournamentState({ phase: "knockout" });
    expect(result.current).toBe("knockout");
  });

  it("dev panel override forces a different phase even when the real doc says otherwise", () => {
    const { result } = renderHook(() => useTournamentPhase());
    fireTournamentState({ phase: "leaguephase" });
    expect(result.current).toBe("leaguephase");
    fireDevConfig({ phaseOverride: "preknockout" });
    expect(result.current).toBe("preknockout");
  });

  it("ignores the dev override when DEV is false", () => {
    vi.stubEnv("DEV", false);
    const { result } = renderHook(() => useTournamentPhase());
    fireTournamentState({ phase: "leaguephase" });
    // useDevConfig itself never subscribes to devConfig/state when DEV is
    // false, so there's no override callback to fire here at all.
    expect(result.current).toBe("leaguephase");
  });

  it("falls back to the real doc when the dev config has no explicit override", () => {
    const { result } = renderHook(() => useTournamentPhase());
    fireTournamentState({ phase: "preknockout" });
    fireDevConfig({ phaseOverride: null });
    expect(result.current).toBe("preknockout");
  });
});
