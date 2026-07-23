import { describe, it, expect } from "vitest";
import { computeTeamAgreement } from "./teamAgreement";
import { TEAMS } from "../predictions/teams";

const teamA = TEAMS[0].id;
const teamB = TEAMS[1].id;

describe("computeTeamAgreement", () => {
  it("gives a spread of 0 when every ranking places the team at the same position", () => {
    const out = computeTeamAgreement([[teamA], [teamA]]);
    expect(out.find((t) => t.teamId === teamA)?.spread).toBe(0);
  });

  it("gives a higher spread when predicted positions vary more, and sorts ascending (most agreed first)", () => {
    // teamA: index 0 in both -> positions [1, 1] -> spread 0.
    // teamB: index 1 then index 4 -> positions [2, 5] -> spread > 0.
    const out = computeTeamAgreement([
      [teamA, teamB],
      [teamA, TEAMS[2].id, TEAMS[3].id, TEAMS[4].id, teamB],
    ]);
    const a = out.find((t) => t.teamId === teamA);
    const b = out.find((t) => t.teamId === teamB);
    expect(a?.spread).toBe(0);
    expect(b!.spread).toBeGreaterThan(0);
    expect(out[0].teamId).toBe(teamA);
  });

  it("excludes a team that was never ranked by anyone", () => {
    const out = computeTeamAgreement([[teamA]]);
    expect(out.find((t) => t.teamId === teamB)).toBeUndefined();
  });
});
