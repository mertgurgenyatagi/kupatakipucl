import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TeamBiasTable } from "./TeamBiasTable";

describe("TeamBiasTable", () => {
  it("shows a fallback message when there are no teams", () => {
    render(<TeamBiasTable teams={[]} />);
    expect(screen.getByText("Henüz hesaplanabilecek veri yok.")).toBeInTheDocument();
  });

  it("renders each team with name and average difference, in the given order", () => {
    render(
      <TeamBiasTable
        teams={[
          { teamId: "arsenal", teamName: "Arsenal", averageDifference: -2 },
          { teamId: "barcelona", teamName: "Barcelona", averageDifference: 3 },
        ]}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Arsenal");
    expect(items[0]).toHaveTextContent("-2.00");
    expect(items[1]).toHaveTextContent("Barcelona");
    expect(items[1]).toHaveTextContent("3.00");
  });
});
