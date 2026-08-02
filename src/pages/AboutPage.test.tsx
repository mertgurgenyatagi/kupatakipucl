import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AboutPage } from "./AboutPage";

describe("AboutPage", () => {
  it("renders the giant logo mark", () => {
    render(<AboutPage />);
    expect(screen.getByAltText("#kupatakipucl")).toHaveAttribute("src", "/brand/kupatakip-logo-white.svg");
  });

  it("renders the essence statement, word by word", () => {
    render(<AboutPage />);
    expect(screen.getByText("Kupatakip,")).toBeInTheDocument();
    expect(screen.getByText("oyunudur.")).toBeInTheDocument();
  });

  it("renders the prose paragraphs", () => {
    render(<AboutPage />);
    expect(screen.getByText(/her sezon yeniden düzenlenir/)).toBeInTheDocument();
  });

  it("renders all six key-dates timeline nodes with their labels and formatted dates", () => {
    render(<AboutPage />);
    const expected = [
      ["Lig Tahminleri Açılır", "26 Ağu"],
      ["Lig Tahminleri Kapanır", "08 Eyl"],
      ["Lig Aşaması", "27 Oca"],
      ["Eleme Tahminleri Açılır", "26 Şub"],
      ["Eleme Tahminleri Kapanır", "09 Mar"],
      ["Eleme Aşaması", "30 May"],
    ];
    for (const [label, date] of expected) {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(date)).toBeInTheDocument();
    }
  });

  it("renders a mailto contact link", () => {
    render(<AboutPage />);
    const link = screen.getByText("mert.gurgenyatagi@gmail.com");
    expect(link).toHaveAttribute("href", "mailto:mert.gurgenyatagi@gmail.com");
  });
});
