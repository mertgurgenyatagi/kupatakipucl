import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FixtureRow, place } from "./FixtureRow";
import type { Fixture } from "../devpanel/fixtures";

const FIXTURE: Fixture = {
  id: "md1-athletic-club-arsenal",
  matchday: 1,
  order: 1,
  homeTeamId: "athletic-club",
  awayTeamId: "arsenal",
  kickoffUtc: "2026-09-16T16:45:00Z",
};

describe("place", () => {
  it("returns the team's table position as a string", () => {
    expect(place({ arsenal: { position: 4 } as any }, "arsenal")).toBe("4");
  });

  it("returns a dash for a team with no recorded result", () => {
    expect(place({}, "arsenal")).toBe("-");
  });
});

describe("FixtureRow", () => {
  it("renders both teams' short names", () => {
    render(<FixtureRow fixture={FIXTURE} results={{}} />);
    expect(screen.getByText("ATH")).toBeInTheDocument();
    expect(screen.getByText("ARS")).toBeInTheDocument();
  });

  it("renders each team's table position", () => {
    render(<FixtureRow fixture={FIXTURE} results={{ arsenal: { position: 4 } as any }} />);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
