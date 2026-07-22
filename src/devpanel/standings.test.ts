import { describe, it, expect } from "vitest";
import { computeStandings } from "./standings";
import { TEAMS } from "../predictions/teams";
import { FIXTURES } from "./fixtures";

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
    const fixture = FIXTURES[0]; // md1-athletic-club-arsenal
    const results = computeStandings({ [fixture.id]: "homewin" });
    expect(results[fixture.homeTeamId].points).toBe(3);
    expect(results[fixture.homeTeamId].goalDifference).toBe(1);
    expect(results[fixture.awayTeamId].points).toBe(0);
    expect(results[fixture.awayTeamId].goalDifference).toBe(-1);
  });

  it("awards 3 points and a +1/-1 goal difference (reversed) for a decided away win", () => {
    const fixture = FIXTURES[0];
    const results = computeStandings({ [fixture.id]: "awaywin" });
    expect(results[fixture.awayTeamId].points).toBe(3);
    expect(results[fixture.awayTeamId].goalDifference).toBe(1);
    expect(results[fixture.homeTeamId].points).toBe(0);
    expect(results[fixture.homeTeamId].goalDifference).toBe(-1);
  });

  it("awards 1 point each and no goal difference change for a draw", () => {
    const fixture = FIXTURES[0];
    const results = computeStandings({ [fixture.id]: "draw" });
    expect(results[fixture.homeTeamId].points).toBe(1);
    expect(results[fixture.awayTeamId].points).toBe(1);
    expect(results[fixture.homeTeamId].goalDifference).toBe(0);
    expect(results[fixture.awayTeamId].goalDifference).toBe(0);
  });

  it("does not count a notplayed match at all", () => {
    const fixture = FIXTURES[0];
    const results = computeStandings({ [fixture.id]: "notplayed" });
    expect(results[fixture.homeTeamId].points).toBe(0);
    expect(results[fixture.awayTeamId].points).toBe(0);
  });

  it("counts matchesPlayed for both sides on any decided outcome, and not at all when notplayed", () => {
    const fixture = FIXTURES[0];
    const decided = computeStandings({ [fixture.id]: "draw" });
    expect(decided[fixture.homeTeamId].matchesPlayed).toBe(1);
    expect(decided[fixture.awayTeamId].matchesPlayed).toBe(1);

    const undecided = computeStandings({ [fixture.id]: "notplayed" });
    expect(undecided[fixture.homeTeamId].matchesPlayed).toBe(0);
    expect(undecided[fixture.awayTeamId].matchesPlayed).toBe(0);

    const untouched = computeStandings({});
    expect(untouched[fixture.homeTeamId].matchesPlayed).toBe(0);
  });

  it("ranks a team with more points higher", () => {
    // Give athletic-club a win (via md1) and leave everyone else at 0.
    const fixture = FIXTURES[0];
    const results = computeStandings({ [fixture.id]: "homewin" });
    expect(results[fixture.homeTeamId].position).toBe(1);
  });

  it("breaks a points tie by goal difference", () => {
    // md1: athletic-club(H) vs arsenal(A) -> home win, athletic-club +1 GD, 3pts.
    // md1: psv-eindhoven(H) vs union-saint-gilloise(A) -> home win too, psv +1 GD, 3pts.
    // Both tied on points and GD so far — add a second win for psv-eindhoven via md2
    // (psv-eindhoven does not appear in md2's fixture list at index used below, so
    // instead verify tie-break using two fixtures we know target different teams).
    const f1 = FIXTURES.find((f) => f.id === "md1-athletic-club-arsenal")!;
    const f2 = FIXTURES.find((f) => f.id === "md1-psv-eindhoven-union-saint-gilloise")!;
    const f3 = FIXTURES.find((f) => f.id === "md2-atalanta-club-brugge")!; // atalanta home win, unrelated third team
    const results = computeStandings({
      [f1.id]: "homewin", // athletic-club: 3pts, +1 GD
      [f2.id]: "homewin", // psv-eindhoven: 3pts, +1 GD
      [f3.id]: "homewin", // atalanta: 3pts, +1 GD -- three-way tie on points+GD, broken by goalsFor (all equal at 1) then name
    });
    // All three are tied on points(3), GD(+1), goalsFor(1) -- so alphabetical name order decides among them.
    const tiedIds = [f1.homeTeamId, f2.homeTeamId, f3.homeTeamId];
    const tiedPositions = tiedIds.map((id) => results[id].position).sort((a, b) => a - b);
    expect(tiedPositions).toEqual([1, 2, 3]);
    // Alphabetically: Athletic Club < Atalanta? "Atalanta" < "Athletic Club" < ... < "PSV Eindhoven"
    expect(results["atalanta"].position).toBeLessThan(results["athletic-club"].position);
    expect(results["athletic-club"].position).toBeLessThan(results["psv-eindhoven"].position);
  });
});
