import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { SurveyForm } from "./SurveyForm";

describe("SurveyForm", () => {
  it("only shows one question at a time", () => {
    render(<SurveyForm onComplete={vi.fn()} />);
    expect(screen.getByLabelText("Yaşınız")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Futbol bilginizi 1-7 arası değerlendirin")
    ).not.toBeInTheDocument();
  });

  it("walks through all six questions and calls onComplete with the collected answers", () => {
    const onComplete = vi.fn();
    render(<SurveyForm onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText("Yaşınız"), { target: { value: "30" } });
    fireEvent.click(screen.getByText("İleri"));

    fireEvent.change(screen.getByLabelText("Futbol bilginizi 1-7 arası değerlendirin"), {
      target: { value: "6" },
    });
    fireEvent.click(screen.getByText("İleri"));

    fireEvent.change(screen.getByLabelText("Messi mi Ronaldo mu?"), {
      target: { value: "messi" },
    });
    fireEvent.click(screen.getByText("İleri"));

    fireEvent.change(screen.getByLabelText("Süper Lig'de tuttuğunuz takım"), {
      target: { value: "Galatasaray" },
    });
    fireEvent.click(screen.getByText("İleri"));

    fireEvent.change(
      screen.getByLabelText("Tuttuğunuz bir UCL takımı var mı? (varsa yazın)"),
      { target: { value: "" } }
    );
    fireEvent.click(screen.getByText("İleri"));

    fireEvent.change(screen.getByLabelText("Çoğunlukla hangi cihazı kullanıyorsunuz?"), {
      target: { value: "desktop" },
    });
    fireEvent.click(screen.getByText("Gönder"));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({
      age: 30,
      footballKnowledge: 6,
      messiOrRonaldo: "messi",
      superLigTeam: "Galatasaray",
      uclTeam: null,
      device: "desktop",
      submittedAt: expect.any(Number),
    });
  });
});
