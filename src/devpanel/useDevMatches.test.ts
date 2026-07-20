import { renderHook, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));
const mockBatchSet = vi.fn();
const mockBatchCommit = vi.fn();
const mockWriteBatch = vi.fn((_db: unknown) => ({ set: mockBatchSet, commit: mockBatchCommit }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...(args as [unknown])),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useDevMatches, setMatchOutcome } from "./useDevMatches";
import { FIXTURES } from "./fixtures";

describe("useDevMatches", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it("returns an empty outcomes map before any devMatches docs exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => useDevMatches());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.outcomes).toEqual({});
  });

  it("maps each doc's outcome by fixture id", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: FIXTURES[0].id, data: () => ({ outcome: "homewin" }) }],
    });
    const { result } = renderHook(() => useDevMatches());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.outcomes[FIXTURES[0].id]).toBe("homewin");
  });

  it("re-fetches when refetch is called", async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    const { result } = renderHook(() => useDevMatches());
    await waitFor(() => expect(result.current.loading).toBe(false));
    mockGetDocs.mockResolvedValueOnce({ docs: [{ id: FIXTURES[0].id, data: () => ({ outcome: "draw" }) }] });
    act(() => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.outcomes[FIXTURES[0].id]).toBe("draw"));
    expect(mockGetDocs).toHaveBeenCalledTimes(2);
  });
});

describe("setMatchOutcome", () => {
  beforeEach(() => {
    mockBatchSet.mockReset();
    mockBatchCommit.mockReset();
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it("allows deciding the very first fixture with no prior outcomes", async () => {
    await setMatchOutcome({}, FIXTURES[0].id, "homewin");
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "devMatches", id: FIXTURES[0].id }),
      { outcome: "homewin" }
    );
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it("rejects deciding a later fixture before all earlier ones are decided", async () => {
    const laterFixture = FIXTURES[5]; // order 6, several undecided matches before it
    await expect(setMatchOutcome({}, laterFixture.id, "homewin")).rejects.toThrow(
      "All earlier matches must be decided first."
    );
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("allows deciding a later fixture once all earlier ones are decided", async () => {
    const laterFixture = FIXTURES[2]; // order 3
    const priorOutcomes: Record<string, "homewin"> = {};
    FIXTURES.filter((f) => f.order < laterFixture.order).forEach((f) => {
      priorOutcomes[f.id] = "homewin";
    });
    await setMatchOutcome(priorOutcomes, laterFixture.id, "draw");
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "devMatches", id: laterFixture.id }),
      { outcome: "draw" }
    );
  });

  it("always allows reverting a fixture back to notplayed regardless of later state", async () => {
    await setMatchOutcome({}, FIXTURES[10].id, "notplayed");
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "devMatches", id: FIXTURES[10].id }),
      { outcome: "notplayed" }
    );
  });

  it("writes computed standings for all 36 teams alongside the devMatches doc", async () => {
    await setMatchOutcome({}, FIXTURES[0].id, "homewin");
    // 1 devMatches write + 36 results writes = 37 total batch.set calls
    expect(mockBatchSet).toHaveBeenCalledTimes(37);
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "results", id: FIXTURES[0].homeTeamId }),
      expect.objectContaining({ points: 3 })
    );
  });

  it("propagates a commit rejection", async () => {
    mockBatchCommit.mockRejectedValue(new Error("permission-denied"));
    await expect(setMatchOutcome({}, FIXTURES[0].id, "homewin")).rejects.toThrow("permission-denied");
  });

  it("throws for an unknown fixture id", async () => {
    await expect(setMatchOutcome({}, "not-a-real-fixture", "homewin")).rejects.toThrow("Unknown fixture");
  });
});
