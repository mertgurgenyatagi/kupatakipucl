import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetDocs = vi.fn();
const mockCollection = vi.fn((_db: unknown, name: string) => ({ name }));

vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { useSurveyResponses } from "./useSurveyResponses";

describe("useSurveyResponses", () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it("maps each response doc to a SurveyResponseEntry with uid set from the doc id", async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: "uid1",
          data: () => ({
            age: 24,
            footballKnowledge: 6,
            messiOrRonaldo: "messi",
            superLigTeam: "Galatasaray",
            uclTeam: null,
            device: "both",
            submittedAt: 1,
          }),
        },
      ],
    });
    const { result } = renderHook(() => useSurveyResponses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.responses).toEqual([
      {
        uid: "uid1",
        age: 24,
        footballKnowledge: 6,
        messiOrRonaldo: "messi",
        superLigTeam: "Galatasaray",
        uclTeam: null,
        device: "both",
        submittedAt: 1,
      },
    ]);
  });

  it("stops loading and leaves responses empty when the read rejects", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockGetDocs.mockRejectedValue(new Error("permission-denied"));
    const { result } = renderHook(() => useSurveyResponses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.responses).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load survey responses", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
