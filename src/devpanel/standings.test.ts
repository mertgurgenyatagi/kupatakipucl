import { describe, it, expect } from "vitest";
import { computeStandings } from "./standings";
import { TEAMS, TEAM_BY_ID } from "../predictions/teams";
import { FIXTURES } from "./fixtures";

/**
 * These used to name fixture ids literally ("md1-athletic-club-arsenal"),
 * which meant the 2026-08-27 team-list swap broke the file wholesale even
 * though nothing about the standings maths had changed. Fixtures are now
 * derived from FIXTURES, so this suite tests computeStandings rather than
 * the identity of whoever happens to be playing.
 */
const first = FIXTURES[0];

/** N fixtures sharing no team, so each one's outcome is independent. */
function disjointFixtures(count: number) {
  const used = new Set<string>();
  const picked: typeof FIXTURES = [];
  for (const fixture of FIXTURES) {
    if (used.has(fixture.homeTeamId) || used.has(fixture.awayTeamId)) continue;
    picked.push(fixture);
    used.add(fixture.homeTeamId);
    used.add(fixture.awayTeamId);
    if (picked.length === count) break;
  }
  if (picked.length < count) throw new Error(`only found ${picked.length} disjoint fixtures`);
  return picked;
}

describe("computeStandings", () => {
  it("gives every team position 1-36 with 0 points when nothing is decided", () => {
    const results = computeStandings({});
    const positions = TEAMS.map((t) => results[t.id].position).sort((a, b) => a - b);
    expect(positions).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
    TEAMS.forEach((t) => {
      expect(results[t.id].points).toBe(0);
      expect(results[t.id].goalDifference).toBe(0);
    });
  });

  it("awards 3 points and a +1/-1 goal difference for a decided home win", () => {
    const results = computeStandings({ [first.id]: "homewin" });
    expect(results[first.homeTeamId].points).toBe(3);
    expect(results[first.homeTeamId].goalDifference).toBe(1);
    expect(results[first.awayTeamId].points).toBe(0);
    expect(results[first.awayTeamId].goalDifference).toBe(-1);
  });

  it("awards 3 points and a +1/-1 goal difference (reversed) for a decided away win", () => {
    const results = computeStandings({ [first.id]: "awaywin" });
    expect(results[first.awayTeamId].points).toBe(3);
    expect(results[first.awayTeamId].goalDifference).toBe(1);
    expect(results[first.homeTeamId].points).toBe(0);
    expect(results[first.homeTeamId].goalDifference).toBe(-1);
  });

  it("awards 1 point each and no goal difference change for a draw", () => {
    const results = computeStandings({ [first.id]: "draw" });
    expect(results[first.homeTeamId].points).toBe(1);
    expect(results[first.awayTeamId].points).toBe(1);
    expect(results[first.homeTeamId].goalDifference).toBe(0);
    expect(results[first.awayTeamId].goalDifference).toBe(0);
  });

  it("does not count a notplayed match at all", () => {
    const results = computeStandings({ [first.id]: "notplayed" });
    expect(results[first.homeTeamId].points).toBe(0);
    expect(results[first.awayTeamId].points).toBe(0);
  });

  it("counts matchesPlayed for both sides on any decided outcome, and not at all when notplayed", () => {
    const decided = computeStandings({ [first.id]: "draw" });
    expect(decided[first.homeTeamId].matchesPlayed).toBe(1);
    expect(decided[first.awayTeamId].matchesPlayed).toBe(1);

    const undecided = computeStandings({ [first.id]: "notplayed" });
    expect(undecided[first.homeTeamId].matchesPlayed).toBe(0);
    expect(undecided[first.awayTeamId].matchesPlayed).toBe(0);

    const untouched = computeStandings({});
    expect(untouched[first.homeTeamId].matchesPlayed).toBe(0);
  });

  it("ranks a team with more points higher", () => {
    const results = computeStandings({ [first.id]: "homewin" });
    expect(results[first.homeTeamId].position).toBe(1);
  });

  it("breaks a points tie by goal difference", () => {
    const [winner, rival] = disjointFixtures(2);
    // A second win for the first fixture's home team pulls it clear of the
    // second's on both points and goal difference.
    const second = FIXTURES.find(
      (f) =>
        f.id !== winner.id &&
        (f.homeTeamId === winner.homeTeamId || f.awayTeamId === winner.homeTeamId),
    )!;
    const results = computeStandings({
      [winner.id]: "homewin",
      [rival.id]: "homewin",
      [second.id]: second.homeTeamId === winner.homeTeamId ? "homewin" : "awaywin",
    });

    expect(results[winner.homeTeamId].points).toBe(6);
    expect(results[rival.homeTeamId].points).toBe(3);
    expect(results[winner.homeTeamId].position).toBeLessThan(
      results[rival.homeTeamId].position,
    );
  });

  it("breaks a tie on points, goal difference and goals scored by team name", () => {
    // Three home wins in fixtures sharing no team: every winner sits on
    // 3pts / +1 GD / 1 scored, so only the name tie-break separates them.
    const picked = disjointFixtures(3);
    const results = computeStandings(
      Object.fromEntries(picked.map((f) => [f.id, "homewin" as const])),
    );

    const winners = picked.map((f) => f.homeTeamId);
    expect(winners.map((id) => results[id].position).sort((a, b) => a - b)).toEqual([1, 2, 3]);

    const byName = [...winners].sort((a, b) =>
      TEAM_BY_ID[a].name.localeCompare(TEAM_BY_ID[b].name),
    );
    const byPosition = [...winners].sort((a, b) => results[a].position - results[b].position);
    expect(byPosition).toEqual(byName);
  });
});
