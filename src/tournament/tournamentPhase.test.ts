import { describe, it, expect } from "vitest";
import { getTournamentPhase } from "./tournamentPhase";

describe("getTournamentPhase", () => {
  it("returns 'pre' just before the Istanbul cutoff instant", () => {
    const oneSecondBefore = new Date("2026-09-07T20:59:59Z");
    expect(getTournamentPhase(oneSecondBefore)).toBe("pre");
  });

  it("returns 'post' at exactly the Istanbul cutoff instant", () => {
    const exactCutoff = new Date("2026-09-07T21:00:00Z");
    expect(getTournamentPhase(exactCutoff)).toBe("post");
  });

  it("returns 'post' well after the cutoff", () => {
    const wellAfter = new Date("2027-01-01T00:00:00Z");
    expect(getTournamentPhase(wellAfter)).toBe("post");
  });

  it("returns 'pre' well before the cutoff", () => {
    const wellBefore = new Date("2026-01-01T00:00:00Z");
    expect(getTournamentPhase(wellBefore)).toBe("pre");
  });
});
