import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TeamTable } from "./TeamTable";
import { TEAMS } from "../predictions/teams";

describe("TeamTable", () => {
  it("renders every team at 0 points, alphabetically, with no sort controls when results is empty", () => {
    render(<TeamTable results={{}} />);
    const rows = screen.getAllByRole("row").slice(1); // drop header row
    expect(rows).toHaveLength(TEAMS.length);
    expect(screen.getByText(TEAMS[0].name)).toBeInTheDocument();
    expect(screen.queryAllByText("0")).toHaveLength(TEAMS.length);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a sortable table defaulting to position order when results is populated", () => {
    render(
      <TeamTable
        results={{
          [TEAMS[1].id]: { position: 1, points: 10, goalDifference: 5, goalsFor: 8, goalsAgainst: 3 },
          [TEAMS[0].id]: { position: 2, points: 9, goalDifference: 4, goalsFor: 7, goalsAgainst: 3 },
        }}
      />
    );
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent(TEAMS[1].name);
    expect(rows[1]).toHaveTextContent(TEAMS[0].name);
  });

  it("re-sorts when a column header is clicked", () => {
    render(
      <TeamTable
        results={{
          [TEAMS[1].id]: { position: 1, points: 3, goalDifference: 5, goalsFor: 8, goalsAgainst: 3 },
          [TEAMS[0].id]: { position: 2, points: 9, goalDifference: 4, goalsFor: 7, goalsAgainst: 3 },
        }}
      />
    );
    fireEvent.click(screen.getByText("Puan"));
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent(TEAMS[0].name); // 9 points, now first
  });
});
