import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UpcomingMatchesDrawer } from "./UpcomingMatchesDrawer";

describe("UpcomingMatchesDrawer", () => {
  it("renders real upcoming fixtures via FixtureRow once opened", () => {
    render(<UpcomingMatchesDrawer results={{}} />);
    fireEvent.click(screen.getByRole("button", { name: /yaklaşan maçları göster/i }));
    // FIXTURES' real matchday-1 schedule always has upcoming fixtures for
    // any realistic `now` this test suite runs at — Athletic Club vs
    // Arsenal is the first fixture in src/devpanel/fixtures.ts.
    expect(screen.getByText("ATH")).toBeInTheDocument();
  });
});
