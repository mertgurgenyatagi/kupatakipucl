import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AccuracyTable } from "./AccuracyTable";

describe("AccuracyTable", () => {
  it("shows a fallback message when there are no entries", () => {
    render(<AccuracyTable entries={[]} />);
    expect(screen.getByText("Henüz hesaplanabilecek veri yok.")).toBeInTheDocument();
  });

  it("renders each entry with name and average deviation, in the given order", () => {
    render(
      <AccuracyTable
        entries={[
          { uid: "uid1", firstName: "Ada", lastName: "Lovelace", averageDeviation: 1.5 },
          { uid: "uid2", firstName: "Alan", lastName: "Turing", averageDeviation: 2 },
        ]}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Ada Lovelace");
    expect(items[0]).toHaveTextContent("1.50");
    expect(items[1]).toHaveTextContent("Alan Turing");
    expect(items[1]).toHaveTextContent("2.00");
  });
});
