import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BracketCtaBanner } from "./BracketCtaBanner";

describe("BracketCtaBanner", () => {
  it("renders a link to /bracket with the CTA copy", () => {
    render(
      <MemoryRouter>
        <BracketCtaBanner />
      </MemoryRouter>
    );
    const link = screen.getByRole("link", { name: /eleme turu tahminini yap/i });
    expect(link).toHaveAttribute("href", "/bracket");
  });
});
