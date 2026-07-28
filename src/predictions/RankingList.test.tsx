import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { RankingList } from "./RankingList";

const ranking = ["ajax", "arsenal", "atalanta"];

describe("RankingList", () => {
  it("renders each team with its rank number", () => {
    render(<RankingList ranking={ranking} />);
    expect(screen.getByText("Ajax")).toBeInTheDocument();
    expect(screen.getByText("Arsenal")).toBeInTheDocument();
    expect(screen.getByText("Atalanta")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows the average position when given", () => {
    render(<RankingList ranking={ranking} averagePositions={{ ajax: 4.5 }} />);
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("glows a team that's currently correct", () => {
    render(<RankingList ranking={ranking} correctness={{ ajax: true, arsenal: false }} />);
    expect(screen.getByText("Ajax").closest("li")).toHaveClass("border-color_green/50");
    expect(screen.getByText("Arsenal").closest("li")).not.toHaveClass("border-color_green/50");
  });

  it("calls onSelectTeam with the team id when a row is clicked, and is non-interactive without it", () => {
    const onSelectTeam = vi.fn();
    const { rerender } = render(<RankingList ranking={ranking} onSelectTeam={onSelectTeam} />);
    fireEvent.click(screen.getByText("Arsenal"));
    expect(onSelectTeam).toHaveBeenCalledWith("arsenal");

    rerender(<RankingList ranking={ranking} />);
    expect(screen.getByText("Arsenal").closest("li")).not.toHaveClass("cursor-pointer");
  });

  describe("boundary hover", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("tints the ±2 band around a row hovered long enough, pulsing everywhere but the origin", () => {
      render(<RankingList ranking={ranking} />);
      const row = screen.getByText("Arsenal").closest("li")!;
      fireEvent.mouseEnter(row);
      act(() => vi.advanceTimersByTime(2000));
      expect(screen.getByText("Ajax").closest("li")).toHaveClass("bg-foreground/[0.06]", "animate-pulse");
      expect(screen.getByText("Atalanta").closest("li")).toHaveClass("bg-foreground/[0.06]", "animate-pulse");
      expect(row).toHaveClass("bg-foreground/[0.06]");
      expect(row).not.toHaveClass("animate-pulse");
    });

    it("does not tint anything before the dwell time passes", () => {
      render(<RankingList ranking={ranking} />);
      const row = screen.getByText("Arsenal").closest("li")!;
      fireEvent.mouseEnter(row);
      expect(row).not.toHaveClass("bg-foreground/[0.06]");
    });
  });
});
