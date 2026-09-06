import { render, screen, fireEvent, within } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { TeamRanker } from "./TeamRanker";
import { Team } from "./teams";

const teams: Team[] = [
  { id: "a", name: "Alpha", shortName: "ALP" },
  { id: "b", name: "Beta", shortName: "BET" },
  { id: "c", name: "Gamma", shortName: "GAM" },
];

/** The ranking column's rows, in rank order. */
function ranks() {
  return within(screen.getByRole("list")).getAllByRole("button");
}

/** A team's cell in the pool. Placed teams leave the pool, so this finds only
 *  the ones still available. */
function poolTeam(name: string) {
  return screen.getByRole("button", { name });
}

describe("TeamRanker", () => {
  it("renders the instruction text", () => {
    render(<TeamRanker teams={teams} onSubmit={vi.fn()} />);
    expect(screen.getByText(/sıralamadaki yerine tıkla/i)).toBeInTheDocument();
  });

  it("renders the Reset and Submit buttons", () => {
    render(<TeamRanker teams={teams} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Sıfırla" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tamam" })).toBeInTheDocument();
  });

  it("submit button is disabled when the list is empty", () => {
    render(<TeamRanker teams={teams} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Tamam" })).toBeDisabled();
  });

  it("submit is enabled when all slots are filled via initialOrder", () => {
    render(<TeamRanker teams={teams} initialOrder={["a", "b", "c"]} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Tamam" })).not.toBeDisabled();
  });

  it("calls onSubmit with the current ranking when Tamam is clicked", () => {
    const onSubmit = vi.fn();
    render(<TeamRanker teams={teams} initialOrder={["b", "a", "c"]} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Tamam" }));
    expect(onSubmit).toHaveBeenCalledWith(["b", "a", "c"]);
  });

  it("reset clears the ranking and disables submit", () => {
    render(<TeamRanker teams={teams} initialOrder={["a", "b", "c"]} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Tamam" })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Sıfırla" }));
    expect(screen.getByRole("button", { name: "Tamam" })).toBeDisabled();
  });

  it("placed teams show their full name in the list", () => {
    render(<TeamRanker teams={teams} initialOrder={["a", "b", "c"]} onSubmit={vi.fn()} />);
    expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Beta").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Gamma").length).toBeGreaterThanOrEqual(1);
  });

  describe("click to place", () => {
    it("puts a team in the rank clicked after selecting it", () => {
      render(<TeamRanker teams={teams} onSubmit={vi.fn()} />);

      fireEvent.click(poolTeam("Alpha"));
      fireEvent.click(ranks()[1]);

      expect(ranks()[1]).toHaveTextContent("Alpha");
      // Placed teams drop out of the pool, so the pool button is gone.
      expect(screen.queryByRole("button", { name: "Alpha" })).not.toBeInTheDocument();
    });

    it("does nothing when a rank is clicked with no team selected", () => {
      render(<TeamRanker teams={teams} onSubmit={vi.fn()} />);
      fireEvent.click(ranks()[0]);
      expect(ranks()[0]).not.toHaveTextContent("Alpha");
    });

    it("swaps two ranked teams", () => {
      const onSubmit = vi.fn();
      render(<TeamRanker teams={teams} initialOrder={["a", "b", "c"]} onSubmit={onSubmit} />);

      fireEvent.click(ranks()[0]); // pick up Alpha
      fireEvent.click(ranks()[2]); // drop on Gamma

      fireEvent.click(screen.getByRole("button", { name: "Tamam" }));
      expect(onSubmit).toHaveBeenCalledWith(["c", "b", "a"]);
    });

    it("sends the previous occupant back to the pool when a pool team takes its rank", () => {
      render(<TeamRanker teams={teams} initialOrder={["a", "b", "c"]} onSubmit={vi.fn()} />);

      // Free up Gamma so it's selectable from the pool, then give it Alpha's rank.
      fireEvent.click(ranks()[2]);
      fireEvent.click(screen.getByTestId("team-pool"));
      fireEvent.click(poolTeam("Gamma"));
      fireEvent.click(ranks()[0]);

      expect(ranks()[0]).toHaveTextContent("Gamma");
      expect(screen.getByRole("button", { name: "Alpha" })).toBeInTheDocument();
    });
  });

  describe("taking teams back out", () => {
    it("returns a ranked team to the pool when the pool is clicked", () => {
      render(<TeamRanker teams={teams} initialOrder={["a", "b", "c"]} onSubmit={vi.fn()} />);

      fireEvent.click(ranks()[1]); // pick up Beta
      fireEvent.click(screen.getByTestId("team-pool"));

      expect(ranks()[1]).not.toHaveTextContent("Beta");
      expect(screen.getByRole("button", { name: "Beta" })).toBeInTheDocument();
    });
  });

  describe("cancelling a selection", () => {
    it("drops the selection on Escape, leaving the ranking untouched", () => {
      render(<TeamRanker teams={teams} onSubmit={vi.fn()} />);

      fireEvent.click(poolTeam("Alpha"));
      fireEvent.keyDown(window, { key: "Escape" });
      fireEvent.click(ranks()[0]);

      expect(ranks()[0]).not.toHaveTextContent("Alpha");
      expect(screen.getByRole("button", { name: "Alpha" })).toBeInTheDocument();
    });

    it("drops the selection when the held team is clicked again", () => {
      render(<TeamRanker teams={teams} onSubmit={vi.fn()} />);

      fireEvent.click(poolTeam("Alpha"));
      fireEvent.click(poolTeam("Alpha"));
      fireEvent.click(ranks()[0]);

      expect(ranks()[0]).not.toHaveTextContent("Alpha");
    });
  });
});
