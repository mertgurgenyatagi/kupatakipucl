import { vi, describe, it, expect, beforeEach } from "vitest";

const mockSetDoc = vi.fn();
const mockDoc = vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id }));

vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { saveSurveyResponse } from "./useSurveyResponse";

describe("saveSurveyResponse", () => {
  beforeEach(() => {
    mockSetDoc.mockReset();
  });

  it("writes the survey response doc for the given uid", async () => {
    const response = {
      age: 25,
      footballKnowledge: 5,
      messiOrRonaldo: "messi" as const,
      superLigTeam: "Galatasaray",
      uclTeam: null,
      device: "phone" as const,
      submittedAt: 123,
    };
    await saveSurveyResponse("uid1", response);
    expect(mockDoc).toHaveBeenCalledWith({}, "surveyResponses", "uid1");
    expect(mockSetDoc).toHaveBeenCalledWith({ collection: "surveyResponses", id: "uid1" }, response);
  });
});
