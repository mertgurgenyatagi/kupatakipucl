import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NumberBox } from "./NumberBox";

describe("NumberBox", () => {
  it("renders the value and label", () => {
    render(<NumberBox label="Katılımcı Sayısı" value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Katılımcı Sayısı")).toBeInTheDocument();
  });
});
