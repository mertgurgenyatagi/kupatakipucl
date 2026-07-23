import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BarChartWidget } from "./BarChartWidget";

describe("BarChartWidget", () => {
  it("renders the label, each bar's label/count, and sizes fills relative to the largest count", () => {
    const { container } = render(
      <BarChartWidget
        label="Yaş"
        bars={[
          { label: "20", count: 2 },
          { label: "21", count: 4 },
        ]}
      />
    );
    expect(screen.getByText("Yaş")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
    const fills = container.querySelectorAll<HTMLElement>(".bg-brass");
    expect(fills[0].style.width).toBe("50%");
    expect(fills[1].style.width).toBe("100%");
  });

  it("shows a fallback message when there are no bars", () => {
    render(<BarChartWidget label="Yaş" bars={[]} />);
    expect(screen.getByText("Henüz hesaplanabilecek veri yok.")).toBeInTheDocument();
  });
});
