import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UpcomingMatchesPreview } from "./UpcomingMatchesPreview";

vi.mock("../tournament/now", () => ({
  resolveNow: () => new Date("2026-08-01T00:00:00.000Z"),
}));

describe("UpcomingMatchesPreview", () => {
  it("renders exactly 3 fixture rows (each row = 1 wrapper + 2 team buttons)", () => {
    render(<UpcomingMatchesPreview results={{}} />);
    expect(screen.getAllByRole("button")).toHaveLength(9);
  });

  it("has no collapse/expand affordance anywhere", () => {
    render(<UpcomingMatchesPreview results={{}} />);
    expect(screen.queryByLabelText("Yaklaşan maçları göster")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Yaklaşan maçları kapat")).not.toBeInTheDocument();
  });
});
