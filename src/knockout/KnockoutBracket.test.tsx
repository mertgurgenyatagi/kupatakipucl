import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { KnockoutBracket } from "./KnockoutBracket";

describe("KnockoutBracket", () => {
  it("renders compact 2-halves bracket and allows picks when editable", () => {
    const onSubmit = vi.fn();
    render(<KnockoutBracket onSubmit={onSubmit} readOnly={false} />);

    // Verify team pills rendered
    expect(screen.getAllByText("RMA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BAY").length).toBeGreaterThan(0);

    // Action buttons in editable mode
    expect(screen.getByText("Sıfırla")).toBeInTheDocument();
    expect(screen.getByText("Tahmini Kaydet")).toBeInTheDocument();
  });

  it("hides action bar in readOnly mode", () => {
    render(<KnockoutBracket readOnly={true} />);

    expect(screen.queryByText("Sıfırla")).not.toBeInTheDocument();
    expect(screen.queryByText("Tahmini Kaydet")).not.toBeInTheDocument();
    expect(screen.getAllByText("RMA").length).toBeGreaterThan(0);
  });
});
