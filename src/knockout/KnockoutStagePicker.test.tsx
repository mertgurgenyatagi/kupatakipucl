import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { KnockoutStagePicker } from "./KnockoutStagePicker";

describe("KnockoutStagePicker", () => {
  it("renders the 16-team bracket halves and allows picks", () => {
    const onSubmit = vi.fn();
    render(<KnockoutStagePicker onSubmit={onSubmit} />);

    // Verify team pills rendered (e.g. RMA for Real Madrid, BAY for Bayern)
    expect(screen.getAllByText("RMA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("BAY").length).toBeGreaterThan(0);

    // Reset button is present
    expect(screen.getByText("Sıfırla")).toBeInTheDocument();
  });

  it("resets all picks when reset button is clicked", () => {
    const onSubmit = vi.fn();
    render(<KnockoutStagePicker onSubmit={onSubmit} />);

    // Click RMA in R16
    const rmaBtn = screen.getAllByText("RMA")[0];
    fireEvent.click(rmaBtn);

    // Click Reset
    fireEvent.click(screen.getByText("Sıfırla"));

    // Submit should be disabled
    expect(screen.getByText("Tahmini Tamamla")).toBeDisabled();
  });
});
