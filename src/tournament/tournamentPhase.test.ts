import { describe, it, expect } from "vitest";
import { STARTED_PHASES } from "./tournamentPhase";

describe("STARTED_PHASES", () => {
  it("contains exactly the three phases after kickoff, in order", () => {
    expect(STARTED_PHASES).toEqual(["leaguephase", "preknockout", "knockout"]);
  });
});
