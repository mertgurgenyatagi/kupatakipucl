import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MiniLeaderboardWidget } from "./MiniLeaderboardWidget";
import { LeaderboardEntry } from "../leaderboard/leaderboardTypes";

function entry(uid: string, points: number): LeaderboardEntry {
  return { uid, firstName: uid, lastName: "X", photoURL: "", points, ranking: [] };
}

const ENTRIES: LeaderboardEntry[] = [entry("uid1", 30), entry("uid2", 20), entry("uid3", 10)];

describe("MiniLeaderboardWidget", () => {
  it("renders exactly 5 rows worth of markup when 5+ entries exist", () => {
    const many = Array.from({ length: 10 }, (_, i) => entry(`uid${i + 1}`, 100 - i));
    render(<MiniLeaderboardWidget entries={many} currentUid="uid1" onSelectParticipant={vi.fn()} />);
    expect(screen.getAllByTestId("mini-leaderboard-row")).toHaveLength(5);
  });

  it("renders one row per entry when fewer than 5 exist, no padding", () => {
    render(<MiniLeaderboardWidget entries={ENTRIES} currentUid="uid1" onSelectParticipant={vi.fn()} />);
    expect(screen.getAllByTestId("mini-leaderboard-row")).toHaveLength(3);
  });

  it("shows each row's full name, points, and rank", () => {
    render(<MiniLeaderboardWidget entries={ENTRIES} currentUid="uid1" onSelectParticipant={vi.fn()} />);
    expect(screen.getByText("uid1 X")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("visually distinguishes the current user's own row", () => {
    render(<MiniLeaderboardWidget entries={ENTRIES} currentUid="uid2" onSelectParticipant={vi.fn()} />);
    const rows = screen.getAllByTestId("mini-leaderboard-row");
    expect(rows[1]).toHaveClass("bg-color_hoverfill");
  });

  it("calls onSelectParticipant when a row is clicked", () => {
    const onSelectParticipant = vi.fn();
    render(<MiniLeaderboardWidget entries={ENTRIES} currentUid="uid1" onSelectParticipant={onSelectParticipant} />);
    screen.getAllByTestId("mini-leaderboard-row")[0].click();
    expect(onSelectParticipant).toHaveBeenCalledWith("uid1");
  });
});
