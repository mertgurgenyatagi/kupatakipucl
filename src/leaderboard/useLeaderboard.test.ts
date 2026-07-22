import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useLeaderboard } from "./useLeaderboard";

function mockCollections(overrides: {
  results?: { id: string; data: () => unknown }[];
  predictions?: { id: string; data: () => unknown }[];
  profiles?: { id: string; data: () => unknown }[];
}) {
  mockGetDocs.mockImplementation((ref: { name: string }) => {
    const docs = overrides[ref.name as "results" | "predictions" | "profiles"] ?? [];
    return Promise.resolve({ docs });
  });
}

describe("useLeaderboard", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it("returns an empty list when nobody has submitted a prediction", async () => {
    mockCollections({ results: [], predictions: [], profiles: [] });
    const { result } = renderHook(() => useLeaderboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([]);
  });

  it("joins predictions with profiles and computes points from results", async () => {
    mockCollections({
      results: [{ id: "arsenal", data: () => ({ position: 1, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 }) }],
      predictions: [
        { id: "uid1", data: () => ({ ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 }) },
      ],
      profiles: [
        { id: "uid1", data: () => ({ firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 }) },
      ],
    });
    const { result } = renderHook(() => useLeaderboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([
      { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", points: 3, ranking: ["arsenal"], submittedAt: 1 },
    ]);
  });

  it("sorts entries descending by points", async () => {
    mockCollections({
      results: [
        { id: "arsenal", data: () => ({ position: 1, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 }) },
        { id: "barcelona", data: () => ({ position: 20, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 }) },
      ],
      predictions: [
        { id: "low", data: () => ({ ranking: ["barcelona"], submittedAt: 1, updatedAt: 1 }) },
        { id: "high", data: () => ({ ranking: ["arsenal"], submittedAt: 1, updatedAt: 1 }) },
      ],
      profiles: [
        { id: "low", data: () => ({ firstName: "Low", lastName: "Scorer", photoURL: "l.png", createdAt: 1 }) },
        { id: "high", data: () => ({ firstName: "High", lastName: "Scorer", photoURL: "h.png", createdAt: 1 }) },
      ],
    });
    const { result } = renderHook(() => useLeaderboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries.map((e) => e.uid)).toEqual(["high", "low"]);
  });

  it("skips a prediction whose uid has no matching profile", async () => {
    mockCollections({
      results: [],
      predictions: [{ id: "orphan", data: () => ({ ranking: [], submittedAt: 1, updatedAt: 1 }) }],
      profiles: [],
    });
    const { result } = renderHook(() => useLeaderboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([]);
  });
});
