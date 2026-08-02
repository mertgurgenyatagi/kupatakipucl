import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
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

  it("the row itself is clickable but has no observable click side effect", () => {
    render(<FixtureRow fixture={fixture} results={{}} />);
    const [rowButton] = screen.getAllByRole("button");
    expect(() => fireEvent.click(rowButton)).not.toThrow();
  });
});
