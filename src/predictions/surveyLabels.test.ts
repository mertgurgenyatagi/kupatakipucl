import { describe, it, expect } from "vitest";
import { uclTeamLabel } from "./surveyLabels";
import { TEAMS } from "./teams";

// SignupFlow's UclTeamStep is a grid of 36 crests, so what lands in
// surveyResponses.uclTeam is a team id. Before 2026-08-27 the profile page and
// both branches of ParticipantPopup printed that id straight out, so people
// saw "bayern-munich" where a team name belonged.
describe("uclTeamLabel", () => {
  it("turns a stored team id into the team's real name", () => {
    expect(uclTeamLabel("bayern-munich")).toBe("Bayern Munich");
    expect(uclTeamLabel("real-madrid")).toBe("Real Madrid");
  });

  it("renders every id the picker can produce as something other than the raw id", () => {
    // The picker's options are exactly TEAMS, so no answer a participant can
    // give should ever fall through to the raw-id branch.
    TEAMS.forEach((team) => {
      expect(uclTeamLabel(team.id)).toBe(team.name);
      expect(uclTeamLabel(team.id)).not.toBe(team.id);
    });
  });

  it("reads as 'Yok' when the participant picked no team", () => {
    // UclTeamStep's opt-out box is titled "Yok" and SignupFlow stores null.
    expect(uclTeamLabel(null)).toBe("Yok");
    expect(uclTeamLabel(undefined)).toBe("Yok");
    expect(uclTeamLabel("")).toBe("Yok");
  });

  it("falls back to the stored value for a team that is no longer in the field", () => {
    // The 36-team list changes every season; an old answer should still read
    // as something rather than vanishing.
    // In the 2025-26 field, gone from the 2026-27 one now in teams.ts.
    expect(uclTeamLabel("young-boys")).toBe("young-boys");
  });
});
