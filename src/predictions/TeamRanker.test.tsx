import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { TeamRanker } from "./TeamRanker";
import { Team } from "./teams";

const teams: Team[] = [
  { id: "a", name: "Alpha", shortName: "ALP" },
  { id: "b", name: "Beta", shortName: "BET" },
  { id: "c", name: "Gamma", shortName: "GAM" },
];

describe("TeamRanker", () => {
  it("renders all teams in the given initial order, rank number first", () => {
    render(<TeamRanker teams={teams} initialOrder={["b", "a", "c"]} onSubmit={vi.fn()} />);
    const items = screen.getAllByRole("button", { name: /^\d/ }).map((el) => el.textContent?.trim());
    expect(items).toEqual(["1Beta", "2Alpha", "3Gamma"]);
  });

  it("calls onSubmit with the current order when Tamam is clicked", () => {
    const onSubmit = vi.fn();
    render(<TeamRanker teams={teams} initialOrder={["a", "b", "c"]} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByText("Tamam"));
    expect(onSubmit).toHaveBeenCalledWith(["a", "b", "c"]);
  });

  describe("boundary hover", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("does not tint anything before the row's been hovered a couple of seconds", () => {
      render(<TeamRanker teams={teams} initialOrder={["a", "b", "c"]} onSubmit={vi.fn()} />);
      const row = screen.getByRole("button", { name: /Beta/ });
      fireEvent.mouseEnter(row);
      expect(row).not.toHaveClass("bg-foreground/[0.06]");
    });

    it("tints the ±2 band around a row hovered long enough, pulsing everywhere but the origin", () => {
      render(<TeamRanker teams={teams} initialOrder={["a", "b", "c"]} onSubmit={vi.fn()} />);
      const middleRow = screen.getByRole("button", { name: /Beta/ });
      fireEvent.mouseEnter(middleRow);
      act(() => vi.advanceTimersByTime(2000));

      const topRow = screen.getByRole("button", { name: /Alpha/ });
      const bottomRow = screen.getByRole("button", { name: /Gamma/ });
      expect(topRow).toHaveClass("bg-foreground/[0.06]", "animate-pulse");
      expect(bottomRow).toHaveClass("bg-foreground/[0.06]", "animate-pulse");
      expect(middleRow).toHaveClass("bg-foreground/[0.06]");
      expect(middleRow).not.toHaveClass("animate-pulse");
    });

    it("clears the tint on mouse leave", () => {
      render(<TeamRanker teams={teams} initialOrder={["a", "b", "c"]} onSubmit={vi.fn()} />);
      const row = screen.getByRole("button", { name: /Beta/ });
      fireEvent.mouseEnter(row);
      act(() => vi.advanceTimersByTime(2000));
      fireEvent.mouseLeave(row);
      expect(row).not.toHaveClass("bg-foreground/[0.06]");
    });
  });
});
