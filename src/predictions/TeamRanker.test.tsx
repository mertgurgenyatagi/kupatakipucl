import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { TeamRanker } from "./TeamRanker";
import { Team } from "./teams";

const teams: Team[] = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
  { id: "c", name: "Gamma" },
];

describe("TeamRanker", () => {
  it("renders all teams in the given initial order", () => {
    render(<TeamRanker teams={teams} initialOrder={["b", "a", "c"]} onSubmit={vi.fn()} />);
    const items = screen.getAllByRole("button", { name: /\d+\. / }).map((el) => el.textContent?.trim());
    expect(items).toEqual(["1. Beta", "2. Alpha", "3. Gamma"]);
  });

  it("calls onSubmit with the current order when the save button is clicked", () => {
    const onSubmit = vi.fn();
    render(<TeamRanker teams={teams} initialOrder={["a", "b", "c"]} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Sıralamayı kaydet"));
    expect(onSubmit).toHaveBeenCalledWith(["a", "b", "c"]);
  });
});
