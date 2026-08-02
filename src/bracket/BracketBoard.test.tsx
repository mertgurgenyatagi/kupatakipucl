import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BracketBoard } from "./BracketBoard";

const RO16_TEAMS = {
  "ro16-1": ["Arsenal", "Napoli"] as [string, string],
  "ro16-2": ["Real Madrid", "Bayern"] as [string, string],
  "ro16-3": ["Man City", "Inter"] as [string, string],
  "ro16-4": ["PSG", "Liverpool"] as [string, string],
  "ro16-5": ["Barcelona", "Juventus"] as [string, string],
  "ro16-6": ["Atletico Madrid", "Chelsea"] as [string, string],
  "ro16-7": ["Dortmund", "Milan"] as [string, string],
  "ro16-8": ["Porto", "Benfica"] as [string, string],
};

describe("BracketBoard", () => {
  it("renders all 8 RO16 matchups with both team names", () => {
    render(<BracketBoard ro16Teams={RO16_TEAMS} onSubmit={vi.fn()} />);
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.getByText("Napoli")).toBeInTheDocument();
    expect(screen.getByText("Porto")).toBeInTheDocument();
    expect(screen.getByText("Benfica")).toBeInTheDocument();
  });

  it("disables the submit button until all 15 picks are made", () => {
    render(<BracketBoard ro16Teams={RO16_TEAMS} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: /gönder/i })).toBeDisabled();
  });

  it("does not render a QF matchup's teams until both RO16 feeders are picked", () => {
    render(<BracketBoard ro16Teams={RO16_TEAMS} onSubmit={vi.fn()} />);
    expect(screen.queryByTestId("matchup-qf-1")).toHaveTextContent("");
  });

  it("reveals a QF matchup's teams once both RO16 picks are made, and clears it on re-pick", () => {
    render(<BracketBoard ro16Teams={RO16_TEAMS} onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByTestId("pick-ro16-1-Arsenal"));
    fireEvent.click(screen.getByTestId("pick-ro16-2-Real Madrid"));
    expect(screen.getByTestId("matchup-qf-1")).toHaveTextContent("Arsenal");
    expect(screen.getByTestId("matchup-qf-1")).toHaveTextContent("Real Madrid");

    fireEvent.click(screen.getByTestId("pick-ro16-1-Napoli"));
    expect(screen.getByTestId("matchup-qf-1")).not.toHaveTextContent("Arsenal");
  });

  it("enables submit once all 15 matchups are picked, and calls onSubmit with the full picks map", () => {
    const onSubmit = vi.fn();
    render(<BracketBoard ro16Teams={RO16_TEAMS} onSubmit={onSubmit} />);

    const ro16Winners: [string, string][] = [
      ["ro16-1", "Arsenal"], ["ro16-2", "Real Madrid"], ["ro16-3", "Man City"], ["ro16-4", "PSG"],
      ["ro16-5", "Barcelona"], ["ro16-6", "Atletico Madrid"], ["ro16-7", "Dortmund"], ["ro16-8", "Porto"],
    ];
    ro16Winners.forEach(([matchupId, team]) => {
      fireEvent.click(screen.getByTestId(`pick-${matchupId}-${team}`));
    });

    fireEvent.click(screen.getByTestId("pick-qf-1-Arsenal"));
    fireEvent.click(screen.getByTestId("pick-qf-2-Man City"));
    fireEvent.click(screen.getByTestId("pick-qf-3-Barcelona"));
    fireEvent.click(screen.getByTestId("pick-qf-4-Dortmund"));

    fireEvent.click(screen.getByTestId("pick-sf-1-Arsenal"));
    fireEvent.click(screen.getByTestId("pick-sf-2-Barcelona"));

    fireEvent.click(screen.getByTestId("pick-final-Arsenal"));

    const submitButton = screen.getByRole("button", { name: /gönder/i });
    expect(submitButton).not.toBeDisabled();
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        "ro16-1": "Arsenal",
        "qf-1": "Arsenal",
        "sf-1": "Arsenal",
        final: "Arsenal",
      })
    );
  });
});
