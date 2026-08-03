import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { TeamRanker } from "./TeamRanker";
import { Team } from "./teams";

const teams: Team[] = [
  { id: "a", name: "Alpha", shortName: "ALP" },
  { id: "b", name: "Beta", shortName: "BET" },
  { id: "c", name: "Gamma", shortName: "GAM" },
];

describe("TeamRanker", () => {
  it("renders the instruction text", () => {
    render(<TeamRanker teams={teams} onSubmit={vi.fn()} />);
    expect(screen.getByText(/sürükleyerek/i)).toBeInTheDocument();
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
    // Names appear in both the list row and the grid tooltip span (aria-hidden).
    expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Beta").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Gamma").length).toBeGreaterThanOrEqual(1);
  });
});
