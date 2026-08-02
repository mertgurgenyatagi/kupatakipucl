import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BracketWidget } from "./BracketWidget";
import { BracketState } from "./bracketState";

const STATE: BracketState = {
  ro16Teams: {
    "ro16-1": ["Arsenal", "Napoli"],
    "ro16-2": ["Real Madrid", "Bayern"],
  },
  winners: { "ro16-1": "Arsenal" },
};

describe("BracketWidget", () => {
  it("renders the current round's matchups at full strength", () => {
    render(<BracketWidget bracketState={STATE} currentRound="ro16" onSelectTeam={vi.fn()} />);
    const currentSection = screen.getByTestId("bracket-widget-round-ro16");
    expect(currentSection).not.toHaveClass("opacity-40");
  });

  it("renders the adjacent round faded and does not render rounds further away", () => {
    render(<BracketWidget bracketState={STATE} currentRound="qf" onSelectTeam={vi.fn()} />);
    expect(screen.getByTestId("bracket-widget-round-ro16")).toHaveClass("opacity-40");
    expect(screen.getByTestId("bracket-widget-round-qf")).not.toHaveClass("opacity-40");
    expect(screen.getByTestId("bracket-widget-round-sf")).toHaveClass("opacity-40");
    expect(screen.queryByTestId("bracket-widget-round-final")).not.toBeInTheDocument();
  });

  it("calls onSelectTeam with the clicked team's id", () => {
    const onSelectTeam = vi.fn();
    render(<BracketWidget bracketState={STATE} currentRound="ro16" onSelectTeam={onSelectTeam} />);
    fireEvent.click(screen.getByTestId("bracket-widget-crest-ro16-Arsenal"));
    expect(onSelectTeam).toHaveBeenCalledWith("Arsenal");
  });
});
