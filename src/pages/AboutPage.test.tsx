import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AboutPage } from "./AboutPage";

describe("AboutPage", () => {
  it("renders the giant logo mark", () => {
    render(<AboutPage />);
    expect(screen.getByAltText("#kupatakipucl")).toHaveAttribute("src", "/brand/kupatakip-logo-white.svg");
  });

  it("renders the essence statement, word by word, including the emphasized words", () => {
    render(<AboutPage />);
    expect(screen.getByText("sıralama.")).toBeInTheDocument();
    expect(screen.getByText("ciddiye")).toBeInTheDocument();
  });

  it("renders the prose paragraphs", () => {
    render(<AboutPage />);
    expect(screen.getByText(/Turnuva bitince kupa kalkıyor/)).toBeInTheDocument();
  });

  it("renders all five key-dates timeline nodes with their labels and formatted dates", () => {
    render(<AboutPage />);
    const expected = [
      ["Takımlar Belli Olur", "26 Ağu"],
      ["Lig Aşaması Başlar", "08 Eyl"],
      ["Lig Aşaması Biter", "27 Oca"],
      ["Son 16 Kurası", "26 Şub"],
      ["Son 16 Başlar", "09 Mar"],
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
