import { describe, it, expect } from "vitest";
import { getTeamDossier } from "./teamDossier";
import { TEAMS } from "../predictions/teams";

describe("getTeamDossier", () => {
  it("is deterministic — the same team always gets the same dossier", () => {
    const a = getTeamDossier("arsenal");
    const b = getTeamDossier("arsenal");
    expect(a).toEqual(b);
  });

  it("gives different teams different dossiers", () => {
    const a = getTeamDossier("arsenal");
    const b = getTeamDossier("barcelona");
    expect(a.manager).not.toBe(b.manager);
  });

  it("always builds exactly 11 starting players: one goalkeeper plus the formation's own line counts", () => {
    TEAMS.forEach((team) => {
      const dossier = getTeamDossier(team.id);
      expect(dossier.startingXI).toHaveLength(11);
      expect(dossier.startingXI.filter((p) => p.line === 0)).toHaveLength(1);
      const outfieldLines = dossier.formation.split("-").map(Number);
      expect(outfieldLines.reduce((a, b) => a + b, 0)).toBe(10);
      outfieldLines.forEach((count, i) => {
        expect(dossier.startingXI.filter((p) => p.line === i + 1)).toHaveLength(count);
      });
    });
  });

  it("builds exactly 3 rows each for scorers/assisters/rated, in descending order", () => {
    TEAMS.forEach((team) => {
      const dossier = getTeamDossier(team.id);
      [dossier.topScorers, dossier.topAssisters, dossier.topRated].forEach((rows) => {
        expect(rows).toHaveLength(3);
        const values = rows.map((r) => Number(r.value));
        expect(values[0]).toBeGreaterThanOrEqual(values[1]);
        expect(values[1]).toBeGreaterThanOrEqual(values[2]);
      });
    });
  });

  it("ratings are a single decimal place on a 1-10 scale", () => {
    const dossier = getTeamDossier("arsenal");
    dossier.topRated.forEach((row) => {
      expect(row.value).toMatch(/^\d\.\d$/);
      expect(Number(row.value)).toBeGreaterThan(0);
      expect(Number(row.value)).toBeLessThanOrEqual(10);
    });
  });
});
