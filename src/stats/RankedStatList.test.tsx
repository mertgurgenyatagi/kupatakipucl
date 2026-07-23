import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RankedStatList } from "./RankedStatList";

describe("RankedStatList", () => {
  it("renders the label, each row's name/value, and initials when no teamId is given", () => {
    render(
      <RankedStatList
        label="Gol Krallığı"
        rows={[
          { key: "a", name: "Kaan Aslan", value: "11", fill: "bg-navy" },
          { key: "b", name: "A. Yıldız", value: "9", fill: "bg-silver" },
        ]}
      />
    );
    expect(screen.getByText("Gol Krallığı")).toBeInTheDocument();
    expect(screen.getByText("Kaan Aslan")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("KA")).toBeInTheDocument();
  });

  it("does not render name-initials when a teamId is given (uses the real crest instead)", () => {
    render(
      <RankedStatList
        label="Test"
        rows={[{ key: "ajax", name: "Kaan Aslan", value: "+2.0", teamId: "ajax" }]}
      />
    );
    expect(screen.queryByText("KA")).not.toBeInTheDocument();
  });

  it("shows a fallback message when there are no rows", () => {
    render(<RankedStatList label="Boş" rows={[]} />);
    expect(screen.getByText("Boş")).toBeInTheDocument();
    expect(screen.getByText("Henüz hesaplanabilecek veri yok.")).toBeInTheDocument();
  });
});
