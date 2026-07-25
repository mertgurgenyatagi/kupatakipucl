import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ScoringExampleDiagram } from "./ScoringExampleDiagram";
import { Team } from "./teams";

const teams: Team[] = Array.from({ length: 7 }, (_, i) => ({
  id: `t${i}`,
  name: `Team ${i}`,
  shortName: `T${i}`,
}));

describe("ScoringExampleDiagram", () => {
  it("shows a rank number on every row", () => {
    render(<ScoringExampleDiagram teams={teams} centerIndex={3} />);
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it("only shows the centered team's crest and name, leaving every other row blank", () => {
    render(<ScoringExampleDiagram teams={teams} centerIndex={3} />);
    expect(screen.getByText(teams[3].name)).toBeInTheDocument();
    teams.forEach((team, i) => {
      if (i !== 3) expect(screen.queryByText(team.name)).not.toBeInTheDocument();
    });
  });

  it("gives the ±2 band around the center a background slightly brighter than the page, pulsing except at the center", () => {
    render(<ScoringExampleDiagram teams={teams} centerIndex={3} />);
    for (const i of [1, 2, 4, 5]) {
      const row = screen.getByText(String(i + 1)).closest("div")!;
      expect(row).toHaveClass("bg-foreground/[0.06]", "animate-pulse");
    }
    const centerRow = screen.getByText(String(4)).closest("div")!;
    expect(centerRow).toHaveClass("bg-foreground/[0.06]");
    expect(centerRow).not.toHaveClass("animate-pulse");
  });

  it("gives the two outermost rows the same background as the page, no pulse", () => {
    render(<ScoringExampleDiagram teams={teams} centerIndex={3} />);
    for (const i of [0, 6]) {
      const row = screen.getByText(String(i + 1)).closest("div")!;
      expect(row).toHaveClass("bg-background");
      expect(row).not.toHaveClass("animate-pulse");
    }
  });
});
