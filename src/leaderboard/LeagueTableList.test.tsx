import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LeagueTableList } from "./LeagueTableList";
import { TEAMS } from "../predictions/teams";

describe("LeagueTableList", () => {
  it("renders all 36 teams as single rows with dashes when no results exist", () => {
    render(<LeagueTableList results={{}} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(TEAMS.length);
    expect(screen.getByText(TEAMS[0].shortName)).toBeInTheDocument();
    expect(rows[0].textContent).toContain("--");
  });

  it("sorts by real standings position when results exist, teams without a result trailing", () => {
    render(
      <LeagueTableList
        results={{
          [TEAMS[5].id]: { position: 1, points: 12, goalDifference: 5, goalsFor: 10, goalsAgainst: 5, matchesPlayed: 4 },
          [TEAMS[2].id]: { position: 2, points: 9, goalDifference: 3, goalsFor: 8, goalsAgainst: 5, matchesPlayed: 4 },
        }}
      />
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent(TEAMS[5].shortName);
    expect(rows[1]).toHaveTextContent(TEAMS[2].shortName);
  });

  it("shows a direct-qualification tick for positions 1-8, a playoff tick for 9-24, and none for 25-36", () => {
    render(
      <LeagueTableList
        results={{
          [TEAMS[0].id]: { position: 1, points: 20, goalDifference: 10, goalsFor: 15, goalsAgainst: 5, matchesPlayed: 6 },
          [TEAMS[1].id]: { position: 10, points: 9, goalDifference: 1, goalsFor: 8, goalsAgainst: 7, matchesPlayed: 6 },
          [TEAMS[2].id]: { position: 30, points: 2, goalDifference: -8, goalsFor: 3, goalsAgainst: 11, matchesPlayed: 6 },
        }}
      />
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows[0].querySelector(".bg-color_accent")).toBeInTheDocument();
    expect(rows[1].querySelector(".bg-color_qualification")).toBeInTheDocument();
    expect(rows[2].querySelector(".bg-color_accent")).not.toBeInTheDocument();
    expect(rows[2].querySelector(".bg-color_qualification")).not.toBeInTheDocument();
  });

  it("calls onSelectTeam with the team id when a row is clicked", () => {
    const onSelectTeam = vi.fn();
    render(<LeagueTableList results={{}} onSelectTeam={onSelectTeam} />);
    fireEvent.click(screen.getByText(TEAMS[0].shortName));
    expect(onSelectTeam).toHaveBeenCalledWith(TEAMS[0].id);
  });
});
