import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TeamTable } from "./TeamTable";
import { TEAMS } from "../predictions/teams";
import { RealFixture } from "./realFixtureTypes";

const mockUseFixtures = vi.fn<() => { fixtures: RealFixture[]; loading: boolean }>(() => ({
  fixtures: [],
  loading: false,
}));
vi.mock("./useFixtures", () => ({
  useFixtures: () => mockUseFixtures(),
}));

// The table is split into two 18-row halves (two <table>s), each with its
// own header row — so "all data rows, in document order" means every row
// that isn't itself a header row, across both tables.
function bodyRows() {
  return screen
    .getAllByRole("row")
    .filter((row) => within(row).queryAllByRole("columnheader").length === 0);
}

describe("TeamTable", () => {
  it("renders every team at 0 points, alphabetically, split into two tables with no sort controls when results is empty", () => {
    render(<TeamTable results={{}} />);
    expect(screen.getAllByRole("table")).toHaveLength(2);
    const rows = bodyRows();
    expect(rows).toHaveLength(TEAMS.length);
    expect(screen.getByText(TEAMS[0].shortName)).toBeInTheDocument();
    expect(screen.queryAllByText("0")).toHaveLength(TEAMS.length);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("puts the first 18 alphabetical teams in the left table and the rest in the right", () => {
    render(<TeamTable results={{}} />);
    const [leftTable, rightTable] = screen.getAllByRole("table");
    expect(within(leftTable).getByText(TEAMS[0].shortName)).toBeInTheDocument();
    expect(within(leftTable).queryByText(TEAMS[18].shortName)).not.toBeInTheDocument();
    expect(within(rightTable).getByText(TEAMS[18].shortName)).toBeInTheDocument();
    expect(within(rightTable).queryByText(TEAMS[0].shortName)).not.toBeInTheDocument();
  });

  it("renders a sortable table defaulting to position order when results is populated", () => {
    render(
      <TeamTable
        results={{
          [TEAMS[1].id]: { position: 1, points: 10, goalDifference: 5, goalsFor: 8, goalsAgainst: 3, matchesPlayed: 3 },
          [TEAMS[0].id]: { position: 2, points: 9, goalDifference: 4, goalsFor: 7, goalsAgainst: 3, matchesPlayed: 3 },
        }}
      />
    );
    const rows = bodyRows();
    expect(rows[0]).toHaveTextContent(TEAMS[1].shortName);
    expect(rows[1]).toHaveTextContent(TEAMS[0].shortName);
  });

  it("re-sorts when a column header is clicked", () => {
    render(
      <TeamTable
        results={{
          [TEAMS[1].id]: { position: 1, points: 3, goalDifference: 5, goalsFor: 8, goalsAgainst: 3, matchesPlayed: 3 },
          [TEAMS[0].id]: { position: 2, points: 9, goalDifference: 4, goalsFor: 7, goalsAgainst: 3, matchesPlayed: 3 },
        }}
      />
    );
    fireEvent.click(screen.getAllByTitle("Puan")[0]);
    const rows = bodyRows();
    expect(rows[0]).toHaveTextContent(TEAMS[0].shortName); // 9 points, now first
  });

  it("places teams without a result after teams with a result, for every sort key", () => {
    const withResults = [TEAMS[5], TEAMS[10], TEAMS[20]];
    const results = {
      [TEAMS[5].id]: { position: 3, points: 12, goalDifference: 2, goalsFor: 10, goalsAgainst: 8, matchesPlayed: 4 },
      [TEAMS[10].id]: { position: 1, points: 20, goalDifference: 10, goalsFor: 15, goalsAgainst: 5, matchesPlayed: 4 },
      [TEAMS[20].id]: { position: 2, points: 15, goalDifference: 5, goalsFor: 12, goalsAgainst: 7, matchesPlayed: 4 },
    };
    render(<TeamTable results={results} />);

    const withResultNames = withResults.map((t) => t.shortName);
    const rows = bodyRows();
    expect(rows).toHaveLength(TEAMS.length);

    const firstThreeNames = rows.slice(0, 3).map((r) => r.textContent);
    withResultNames.forEach((name) => {
      expect(firstThreeNames.some((text) => text?.includes(name))).toBe(true);
    });
    rows.slice(3).forEach((row) => {
      expect(row).toHaveTextContent("-");
    });

    // re-sort by a non-position column; the with-result teams must still lead
    fireEvent.click(screen.getAllByTitle("Puan")[0]);
    const rowsAfterSort = bodyRows();
    const firstThreeAfterSort = rowsAfterSort.slice(0, 3).map((r) => r.textContent);
    withResultNames.forEach((name) => {
      expect(firstThreeAfterSort.some((text) => text?.includes(name))).toBe(true);
    });
    rowsAfterSort.slice(3).forEach((row) => {
      expect(row).toHaveTextContent("-");
    });
  });

  it("shows matchesPlayed when present", () => {
    render(
      <TeamTable
        results={{
          [TEAMS[0].id]: { position: 1, points: 6, goalDifference: 2, goalsFor: 3, goalsAgainst: 1, matchesPlayed: 2 },
        }}
      />
    );
    const rows = bodyRows();
    expect(rows[0]).toHaveTextContent("2"); // matchesPlayed
  });

  it("tints a team's row when it's in a live match", () => {
    mockUseFixtures.mockReturnValueOnce({
      fixtures: [
        {
          id: "f1",
          matchday: 1,
          order: 1,
          homeTeamId: TEAMS[0].id,
          awayTeamId: TEAMS[1].id,
          kickoffUtc: "2026-09-08T16:45:00Z",
          status: "IN_PLAY",
          homeGoals: 1,
          awayGoals: 0,
        },
      ],
      loading: false,
    });
    render(
      <TeamTable
        results={{
          [TEAMS[0].id]: { position: 1, points: 3, goalDifference: 1, goalsFor: 1, goalsAgainst: 0 },
          [TEAMS[2].id]: { position: 2, points: 0, goalDifference: 0, goalsFor: 0, goalsAgainst: 0 },
        }}
      />
    );
    const rows = bodyRows();
    const liveRow = rows.find((r) => within(r).queryByText(TEAMS[0].shortName))!;
    const quietRow = rows.find((r) => within(r).queryByText(TEAMS[2].shortName))!;
    expect(liveRow.innerHTML).toMatch(/color_remove/);
    expect(quietRow.innerHTML).not.toMatch(/color_remove/);
  });
});
