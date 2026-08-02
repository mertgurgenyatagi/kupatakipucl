import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RankHistoryGraph } from "./RankHistoryGraph";

const POINTS = [
  { matchday: 1, rank: 5 },
  { matchday: 2, rank: 3 },
  { matchday: 3, rank: 4 },
];

describe("RankHistoryGraph", () => {
  it("renders one point per matchday", () => {
    render(<RankHistoryGraph points={POINTS} maxRank={10} handoffMatchday={null} />);
    expect(screen.getAllByTestId("rank-history-point")).toHaveLength(3);
  });

  it("shows a placeholder message with no crash when there is no history yet", () => {
    render(<RankHistoryGraph points={[]} maxRank={10} handoffMatchday={null} />);
    expect(screen.getByText(/Henüz veri yok/)).toBeInTheDocument();
  });

  it("reveals the exact rank at a point on hover", () => {
    render(<RankHistoryGraph points={POINTS} maxRank={10} handoffMatchday={null} />);
    fireEvent.mouseEnter(screen.getAllByTestId("rank-history-point")[1]);
    expect(screen.getByTestId("rank-history-tooltip")).toHaveTextContent("3");
  });

  it("renders a handoff mark when a handoff matchday is given, and none when it isn't", () => {
    const { rerender } = render(<RankHistoryGraph points={POINTS} maxRank={10} handoffMatchday={2} />);
    expect(screen.getByTestId("rank-history-handoff-mark")).toBeInTheDocument();

    rerender(<RankHistoryGraph points={POINTS} maxRank={10} handoffMatchday={null} />);
    expect(screen.queryByTestId("rank-history-handoff-mark")).not.toBeInTheDocument();
  });
});
