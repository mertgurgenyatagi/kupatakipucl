import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NearbyStandingsList, selectNearbyWindow } from "./NearbyStandingsList";
import { LeaderboardEntry } from "./leaderboardTypes";
import { Player } from "../profile/usePlayers";

function makeEntries(count: number): LeaderboardEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    uid: `p${i}`,
    firstName: `Player${i}`,
    photoURL: "",
    points: count - i,
    ranking: [],
  }));
}

describe("selectNearbyWindow", () => {
  const items = Array.from({ length: 36 }, (_, i) => i);

  it("centers the window on a middle index", () => {
    expect(selectNearbyWindow(items, 15)).toEqual([13, 14, 15, 16, 17]);
  });

  it("slides to the top when the center index is near the start", () => {
    expect(selectNearbyWindow(items, 0)).toEqual([0, 1, 2, 3, 4]);
    expect(selectNearbyWindow(items, 1)).toEqual([0, 1, 2, 3, 4]);
  });

  it("slides to the bottom when the center index is near the end", () => {
    expect(selectNearbyWindow(items, 35)).toEqual([31, 32, 33, 34, 35]);
    expect(selectNearbyWindow(items, 34)).toEqual([31, 32, 33, 34, 35]);
  });

  it("falls back to the top 5 when the center index is not found (-1)", () => {
    expect(selectNearbyWindow(items, -1)).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns everything when there are fewer items than the window size", () => {
    expect(selectNearbyWindow([1, 2, 3], 1)).toEqual([1, 2, 3]);
  });
});

const players: Player[] = Array.from({ length: 10 }, (_, i) => ({
  uid: `p${i}`,
  firstName: `Player${i}`,
  lastName: `L${i}`,
  photoURL: "",
  createdAt: i,
}));

describe("NearbyStandingsList", () => {
  it("shows the empty state when there are no entries", () => {
    render(<NearbyStandingsList entries={[]} players={[]} myUid="p0" onSelectParticipant={vi.fn()} />);
    expect(screen.getByText("Henüz tahmin gönderen olmadı.")).toBeInTheDocument();
  });

  it("renders a 5-row window centered on the viewer", () => {
    const entries = makeEntries(10);
    render(<NearbyStandingsList entries={entries} players={players} myUid="p5" onSelectParticipant={vi.fn()} />);
    expect(screen.getByText("Player3 L3")).toBeInTheDocument();
    expect(screen.getByText("Player7 L7")).toBeInTheDocument();
    expect(screen.queryByText("Player0 L0")).not.toBeInTheDocument();
    expect(screen.queryByText("Player9 L9")).not.toBeInTheDocument();
  });

  it("falls back to the top 5 when the viewer has no entry", () => {
    const entries = makeEntries(10);
    render(<NearbyStandingsList entries={entries} players={players} myUid="ghost" onSelectParticipant={vi.fn()} />);
    expect(screen.getByText("Player0 L0")).toBeInTheDocument();
    expect(screen.getByText("Player4 L4")).toBeInTheDocument();
    expect(screen.queryByText("Player5 L5")).not.toBeInTheDocument();
  });

  it("fires onSelectParticipant when a row is clicked", () => {
    const entries = makeEntries(6);
    const onSelectParticipant = vi.fn();
    render(<NearbyStandingsList entries={entries} players={players} myUid="p2" onSelectParticipant={onSelectParticipant} />);
    fireEvent.click(screen.getByText("Player2 L2"));
    expect(onSelectParticipant).toHaveBeenCalledWith("p2");
  });

  it("highlights the viewer's own row and no one else's", () => {
    const entries = makeEntries(6);
    render(<NearbyStandingsList entries={entries} players={players} myUid="p2" onSelectParticipant={vi.fn()} />);
    expect(screen.getByText("Player2 L2").closest("li")).toHaveClass("bg-color_gold/10");
    expect(screen.getByText("Player1 L1").closest("li")).not.toHaveClass("bg-color_gold/10");
  });
});
