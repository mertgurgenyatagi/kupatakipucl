import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { IntroBeat } from "./IntroBeat";

describe("IntroBeat", () => {
  it("renders the full text and calls onContinue when Devam et is clicked", () => {
    const onContinue = vi.fn();
    render(<IntroBeat text="Bir cümle." onContinue={onContinue} />);
    expect(screen.getByText("Bir cümle.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Devam et"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("bolds the given terms without altering the rendered text", () => {
    const fullText = "Eğer bir takım tahmin ettiğin yerden iki pozisyondan fazla sapmazsa 3 puan kazanacaksın.";
    render(<IntroBeat text={fullText} boldTerms={["iki", "3"]} onContinue={vi.fn()} />);
    expect(screen.getByText((_, el) => el?.tagName === "P" && el.textContent === fullText)).toBeInTheDocument();
    expect(screen.getByText("iki").tagName).toBe("STRONG");
    expect(screen.getByText("3").tagName).toBe("STRONG");
  });

  it("renders an optional visual between the text and the button", () => {
    render(<IntroBeat text="Bir cümle." visual={<div>diagram</div>} onContinue={vi.fn()} />);
    expect(screen.getByText("diagram")).toBeInTheDocument();
  });
});
