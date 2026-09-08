import { describe, it, expect } from "vitest";
import { getTeamMatchHistory, getNextMatch, getPastMatches } from "./teamMatchHistory";
import { RealFixture } from "./realFixtureTypes";

const TEAM_ID = "arsenal";
const OPPONENT_A = "barcelona";
const OPPONENT_B = "bayern";
const OPPONENT_C = "chelsea";

function fixture(overrides: Partial<RealFixture> & Pick<RealFixture, "id" | "order">): RealFixture {
  return {
    matchday: 1,
    homeTeamId: TEAM_ID,
    awayTeamId: OPPONENT_A,
    kickoffUtc: "2026-09-16T19:00:00Z",
    status: "TIMED",
    homeGoals: null,
    awayGoals: null,
    ...overrides,
  };
}

describe("getTeamMatchHistory", () => {
  it("returns exactly the team's own fixtures, in calendar order, all undecided by default", () => {
    const fixtures = [
      fixture({ id: "f1", order: 1, homeTeamId: TEAM_ID, awayTeamId: OPPONENT_A }),
      fixture({ id: "f2", order: 2, homeTeamId: OPPONENT_B, awayTeamId: TEAM_ID }),
      fixture({ id: "other", order: 0, homeTeamId: OPPONENT_A, awayTeamId: OPPONENT_B }),
    ];
    const history = getTeamMatchHistory(TEAM_ID, fixtures);
    expect(history.map((m) => m.fixtureId)).toEqual(["f1", "f2"]);
    history.forEach((m) => {
      expect(m.result).toBeNull();
      expect(m.teamGoals).toBeNull();
      expect(m.opponentGoals).toBeNull();
    });
  });

  it("shows a win from the team's own perspective when it won at home", () => {
    const fixtures = [
      fixture({ id: "f1", order: 1, homeTeamId: TEAM_ID, awayTeamId: OPPONENT_A, status: "FINISHED", homeGoals: 2, awayGoals: 0 }),
    ];
    const entry = getTeamMatchHistory(TEAM_ID, fixtures)[0];
    expect(entry.result).toBe("G");
    expect(entry.teamGoals).toBe(2);
    expect(entry.opponentGoals).toBe(0);
  });

  it("shows a loss from the team's own perspective when it lost away — team-first, not literal home/away order", () => {
    const fixtures = [
      fixture({ id: "f1", order: 1, homeTeamId: OPPONENT_A, awayTeamId: TEAM_ID, status: "FINISHED", homeGoals: 1, awayGoals: 0 }),
    ];
    const entry = getTeamMatchHistory(TEAM_ID, fixtures)[0];
    expect(entry.result).toBe("M");
    expect(entry.teamGoals).toBe(0);
    expect(entry.opponentGoals).toBe(1);
  });

  it("shows a draw regardless of home/away", () => {
    const fixtures = [
      fixture({ id: "f1", order: 1, homeTeamId: TEAM_ID, awayTeamId: OPPONENT_A, status: "FINISHED", homeGoals: 1, awayGoals: 1 }),
    ];
    const entry = getTeamMatchHistory(TEAM_ID, fixtures)[0];
    expect(entry.result).toBe("B");
    expect(entry.teamGoals).toBe(1);
    expect(entry.opponentGoals).toBe(1);
  });

  it("treats a fixture with only one goal count populated as undecided (live, not finished)", () => {
    const fixtures = [
      fixture({ id: "f1", order: 1, homeTeamId: TEAM_ID, awayTeamId: OPPONENT_A, status: "IN_PLAY", homeGoals: 1, awayGoals: null }),
    ];
    const entry = getTeamMatchHistory(TEAM_ID, fixtures)[0];
    expect(entry.result).toBeNull();
    expect(entry.teamGoals).toBeNull();
    expect(entry.opponentGoals).toBeNull();
  });
});

describe("getNextMatch", () => {
  it("returns the first undecided fixture in calendar order", () => {
    const fixtures = [
      fixture({ id: "f1", order: 1, homeTeamId: TEAM_ID, awayTeamId: OPPONENT_A, status: "FINISHED", homeGoals: 1, awayGoals: 1 }),
      fixture({ id: "f2", order: 2, homeTeamId: TEAM_ID, awayTeamId: OPPONENT_B }),
    ];
    const history = getTeamMatchHistory(TEAM_ID, fixtures);
    expect(getNextMatch(history)?.fixtureId).toBe("f2");
  });

  it("returns null once every fixture is decided", () => {
    const fixtures = [
      fixture({ id: "f1", order: 1, homeTeamId: TEAM_ID, awayTeamId: OPPONENT_A, status: "FINISHED", homeGoals: 1, awayGoals: 1 }),
      fixture({ id: "f2", order: 2, homeTeamId: TEAM_ID, awayTeamId: OPPONENT_B, status: "FINISHED", homeGoals: 0, awayGoals: 0 }),
    ];
    const history = getTeamMatchHistory(TEAM_ID, fixtures);
    expect(getNextMatch(history)).toBeNull();
  });
});

describe("getPastMatches", () => {
  it("returns only decided fixtures, most recent first", () => {
    const fixtures = [
      fixture({ id: "f1", order: 1, homeTeamId: TEAM_ID, awayTeamId: OPPONENT_A, status: "FINISHED", homeGoals: 1, awayGoals: 1 }),
      fixture({ id: "f2", order: 2, homeTeamId: TEAM_ID, awayTeamId: OPPONENT_B, status: "FINISHED", homeGoals: 0, awayGoals: 0 }),
      fixture({ id: "f3", order: 3, homeTeamId: TEAM_ID, awayTeamId: OPPONENT_C, status: "FINISHED", homeGoals: 2, awayGoals: 1 }),
      fixture({ id: "f4", order: 4, homeTeamId: TEAM_ID, awayTeamId: OPPONENT_A }),
    ];
    const history = getTeamMatchHistory(TEAM_ID, fixtures);
    const past = getPastMatches(history);
    expect(past.map((m) => m.fixtureId)).toEqual(["f3", "f2", "f1"]);
  });
});
