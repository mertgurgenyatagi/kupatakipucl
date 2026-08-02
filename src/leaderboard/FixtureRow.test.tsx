import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FixtureRow } from "./FixtureRow";
import { Fixture } from "../devpanel/fixtures";

const fixture: Fixture = {
  id: "m1",
  matchday: 1,
  order: 1,
  homeTeamId: "ajax",
  awayTeamId: "arsenal",
  kickoffUtc: "2026-09-16T18:45:00.000Z",
};

describe("FixtureRow", () => {
  it("renders both teams' short names", () => {
    render(<FixtureRow fixture={fixture} results={{}} />);
    expect(screen.getByText("AJA")).toBeInTheDocument();
    expect(screen.getByText("ARS")).toBeInTheDocument();
  });

  it("shows a dash for each team's current place when no result exists yet", () => {
    render(<FixtureRow fixture={fixture} results={{}} />);
    expect(screen.getAllByText("-")).toHaveLength(2);
  });

  it("shows each team's real current place when a result exists", () => {
    render(
      <FixtureRow
        fixture={fixture}
        results={{
          ajax: { position: 3, points: 9, goalDifference: 2, goalsFor: 5, goalsAgainst: 3 },
          arsenal: { position: 1, points: 12, goalDifference: 6, goalsFor: 10, goalsAgainst: 4 },
        }}
      />
    );
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("clicking the row fires onSelectFixture with the fixture's id", () => {
    const onSelectFixture = vi.fn();
    render(<FixtureRow fixture={fixture} results={{}} onSelectFixture={onSelectFixture} />);
    const [rowButton] = screen.getAllByRole("button");
    fireEvent.click(rowButton);
    expect(onSelectFixture).toHaveBeenCalledWith("m1");
    expect(onSelectFixture).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the row is clicked and no onSelectFixture is provided", () => {
    render(<FixtureRow fixture={fixture} results={{}} />);
    const [rowButton] = screen.getAllByRole("button");
    expect(() => fireEvent.click(rowButton)).not.toThrow();
  });

  it("compact mode still renders both teams' short names and both places", () => {
    render(<FixtureRow fixture={fixture} results={{}} compact />);
    expect(screen.getByText("AJA")).toBeInTheDocument();
    expect(screen.getByText("ARS")).toBeInTheDocument();
    expect(screen.getAllByText("-")).toHaveLength(2);
  });

  it("clicking the home team fires onSelectTeam with the home team's id, without bubbling to the row's own no-op handler", () => {
    const onSelectTeam = vi.fn();
    render(<FixtureRow fixture={fixture} results={{}} onSelectTeam={onSelectTeam} />);
    fireEvent.click(screen.getByText("AJA"));
    expect(onSelectTeam).toHaveBeenCalledWith("ajax");
    expect(onSelectTeam).toHaveBeenCalledTimes(1);
  });

  it("clicking the away team fires onSelectTeam with the away team's id", () => {
    const onSelectTeam = vi.fn();
    render(<FixtureRow fixture={fixture} results={{}} onSelectTeam={onSelectTeam} />);
    fireEvent.click(screen.getByText("ARS"));
    expect(onSelectTeam).toHaveBeenCalledWith("arsenal");
  });

  it("does not throw when a team is clicked and no onSelectTeam is provided (the drawer's own usage)", () => {
    render(<FixtureRow fixture={fixture} results={{}} />);
    expect(() => fireEvent.click(screen.getByText("AJA"))).not.toThrow();
  });
});
