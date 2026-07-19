import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { PlaceholderPage } from "./PlaceholderPage";

const mockUseVisibilityState = vi.fn();

vi.mock("../state/useVisibilityState", () => ({
  useVisibilityState: () => mockUseVisibilityState(),
}));

describe("PlaceholderPage", () => {
  it("shows the coming-soon label when the page is allowed for the current state", () => {
    mockUseVisibilityState.mockReturnValue("ST_LI");
    render(<PlaceholderPage page="leaderboard" label="Leaderboard" />);
    expect(screen.getByText("Leaderboard — coming soon.")).toBeInTheDocument();
  });

  it("shows a blocked message when the page is not allowed for the current state", () => {
    mockUseVisibilityState.mockReturnValue("NST_NLI");
    render(<PlaceholderPage page="leaderboard" label="Leaderboard" />);
    expect(
      screen.getByText("This section isn't available right now.")
    ).toBeInTheDocument();
  });
});
