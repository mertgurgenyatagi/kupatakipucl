import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AboutPage } from "./AboutPage";

describe("AboutPage", () => {
  it("renders the giant logo mark", () => {
    render(<AboutPage />);
    expect(screen.getByAltText("#kupatakipucl")).toHaveAttribute("src", "/brand/kupatakip-logo-white.svg");
  });

  it("renders the encyclopedic essence paragraph, including the knockout scoring detail", () => {
    render(<AboutPage />);
    expect(screen.getByText(/Kupatakip, Şampiyonlar Ligi için/)).toBeInTheDocument();
    expect(screen.getByText(/şampiyon altı puan getirir/)).toBeInTheDocument();
  });

  it("renders all seven key-dates timeline nodes with their labels and formatted dates", () => {
    render(<AboutPage />);
    const expected = [
      ["Lig Tahminleri Açılır", "28 Ağu"],
      ["Lig Tahminleri Kapanır", "08 Eyl"],
      ["Lig Aşaması", "08 Eyl - 24 Şub"],
      ["Eleme Tahminleri Açılır", "25 Şub"],
      ["Eleme Tahminleri Kapanır", "09 Mar"],
      ["Eleme Aşaması", "09 Mar - 04 Haz"],
      ["Final", "05 Haz"],
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
