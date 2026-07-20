import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { usePlayers } from "./usePlayers";

describe("usePlayers", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it("returns an empty list before any profiles exist", async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const { result } = renderHook(() => usePlayers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([]);
  });

  it("maps each profile doc to a Player with uid set from the doc id", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "uid1",
          data: () => ({ firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 }),
        },
      ],
    });
    const { result } = renderHook(() => usePlayers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([
      { uid: "uid1", firstName: "Ada", lastName: "Lovelace", photoURL: "a.png", createdAt: 1 },
    ]);
  });

  it("stops loading and leaves players empty when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => usePlayers());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.players).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load players", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
