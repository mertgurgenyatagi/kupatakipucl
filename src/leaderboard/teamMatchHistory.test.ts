import { describe, it, expect } from "vitest";
import { getTeamMatchHistory, getNextMatch, getPastMatches } from "./teamMatchHistory";
import { FIXTURES } from "../devpanel/fixtures";
import { MatchOutcome } from "../devpanel/standings";

const TEAM_ID = "arsenal";
const TEAM_FIXTURES = FIXTURES.filter(
  (f) => f.homeTeamId === TEAM_ID || f.awayTeamId === TEAM_ID
).sort((a, b) => a.order - b.order);

describe("getTeamMatchHistory", () => {
  it("returns exactly the team's own fixtures, in calendar order, all undecided by default", () => {
    const history = getTeamMatchHistory(TEAM_ID, {});
    expect(history).toHaveLength(TEAM_FIXTURES.length);
    expect(history.map((m) => m.fixtureId)).toEqual(TEAM_FIXTURES.map((f) => f.id));
    history.forEach((m) => {
      expect(m.result).toBeNull();
      expect(m.teamGoals).toBeNull();
      expect(m.opponentGoals).toBeNull();
    });
  });

  it("shows a 1-0 win from the team's own perspective when it won at home", () => {
    const home = TEAM_FIXTURES.find((f) => f.homeTeamId === TEAM_ID)!;
    const outcomes: Record<string, MatchOutcome> = { [home.id]: "homewin" };
    const entry = getTeamMatchHistory(TEAM_ID, outcomes).find((m) => m.fixtureId === home.id)!;
    expect(entry.result).toBe("G");
    expect(entry.teamGoals).toBe(1);
    expect(entry.opponentGoals).toBe(0);
  });

  it("shows a 0-1 loss from the team's own perspective when it lost away — team-first, not literal home/away order", () => {
    const away = TEAM_FIXTURES.find((f) => f.awayTeamId === TEAM_ID)!;
    const outcomes: Record<string, MatchOutcome> = { [away.id]: "homewin" };
    const entry = getTeamMatchHistory(TEAM_ID, outcomes).find((m) => m.fixtureId === away.id)!;
    expect(entry.result).toBe("M");
    expect(entry.teamGoals).toBe(0);
    expect(entry.opponentGoals).toBe(1);
  });

  it("shows 0-0 for a draw regardless of home/away", () => {
    const home = TEAM_FIXTURES.find((f) => f.homeTeamId === TEAM_ID)!;
    const outcomes: Record<string, MatchOutcome> = { [home.id]: "draw" };
    const entry = getTeamMatchHistory(TEAM_ID, outcomes).find((m) => m.fixtureId === home.id)!;
    expect(entry.result).toBe("B");
    expect(entry.teamGoals).toBe(0);
    expect(entry.opponentGoals).toBe(0);
  });
});

describe("getNextMatch", () => {
  it("returns the first undecided fixture in calendar order", () => {
    const outcomes: Record<string, MatchOutcome> = { [TEAM_FIXTURES[0].id]: "draw" };
    const history = getTeamMatchHistory(TEAM_ID, outcomes);
    expect(getNextMatch(history)?.fixtureId).toBe(TEAM_FIXTURES[1].id);
  });

  it("returns null once every fixture is decided", () => {
    const outcomes: Record<string, MatchOutcome> = {};
    TEAM_FIXTURES.forEach((f) => (outcomes[f.id] = "draw"));
    const history = getTeamMatchHistory(TEAM_ID, outcomes);
    expect(getNextMatch(history)).toBeNull();
  });
});

describe("getPastMatches", () => {
  it("returns only decided fixtures, most recent first", () => {
    const outcomes: Record<string, MatchOutcome> = {};
    TEAM_FIXTURES.slice(0, 3).forEach((f) => (outcomes[f.id] = "draw"));
    const history = getTeamMatchHistory(TEAM_ID, outcomes);
    const past = getPastMatches(history);
    expect(past.map((m) => m.fixtureId)).toEqual(
      [TEAM_FIXTURES[2], TEAM_FIXTURES[1], TEAM_FIXTURES[0]].map((f) => f.id)
    );
  });
});
