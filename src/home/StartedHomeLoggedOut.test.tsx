import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StartedHomeLoggedOut } from "./StartedHomeLoggedOut";

const ENTRIES = [{ uid: "uid1", firstName: "A", lastName: "B", photoURL: "", points: 10, ranking: [] }];
const EMPTY_BRACKET = { ro16Teams: {}, winners: {} };

describe("StartedHomeLoggedOut", () => {
  it("shows the league table during leaguephase", () => {
    render(<StartedHomeLoggedOut results={{}} entries={ENTRIES} phase="leaguephase" bracketState={EMPTY_BRACKET} />);
    expect(screen.getByTestId("team-table")).toBeInTheDocument();
  });

  it("shows the league table during preknockout too", () => {
    render(<StartedHomeLoggedOut results={{}} entries={ENTRIES} phase="preknockout" bracketState={EMPTY_BRACKET} />);
    expect(screen.getByTestId("team-table")).toBeInTheDocument();
  });

  it("swaps the league table for the bracket widget during knockout", () => {
    render(<StartedHomeLoggedOut results={{}} entries={ENTRIES} phase="knockout" bracketState={EMPTY_BRACKET} />);
    expect(screen.queryByTestId("team-table")).not.toBeInTheDocument();
    expect(screen.getByTestId("bracket-widget-round-ro16")).toBeInTheDocument();
  });

  it("shows the standings table", () => {
    render(<StartedHomeLoggedOut results={{}} entries={ENTRIES} phase="leaguephase" bracketState={EMPTY_BRACKET} />);
    expect(screen.getByText("A B")).toBeInTheDocument();
  });

  it("opens the participant popup when a standings row is clicked (revealCorrectness must gate this open, not closed)", () => {
    const withRanking = [{ ...ENTRIES[0], ranking: ["a", "b"] }];
    render(<StartedHomeLoggedOut results={{}} entries={withRanking} phase="leaguephase" bracketState={EMPTY_BRACKET} />);
    fireEvent.click(screen.getByText("A B"));
    // ParticipantPopup/TeamPopup have no data-testid (confirmed against the
    // real components) — both are @base-ui/react Dialogs, which render with
    // role="dialog" when open (same pattern already proven in this codebase
    // at src/forum/RecentPostsPreview.test.tsx:144).
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
