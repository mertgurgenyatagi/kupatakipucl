import { describe, it, expect } from "vitest";
import { selectMiniLeaderboardWindow, MINI_LEADERBOARD_SIZE } from "./miniLeaderboardWindow";
import { RankedEntry } from "./ranking";

function entry(uid: string, rank: number): RankedEntry {
  return { entry: { uid, firstName: uid, lastName: "", photoURL: "", points: 100 - rank, ranking: [] }, rank };
}

const TEN_ENTRIES: RankedEntry[] = Array.from({ length: 10 }, (_, i) => entry(`uid${i + 1}`, i + 1));

describe("selectMiniLeaderboardWindow", () => {
  it("returns every entry unchanged when there are 5 or fewer", () => {
    const three = TEN_ENTRIES.slice(0, 3);
    expect(selectMiniLeaderboardWindow(three, "uid1")).toEqual(three);
  });

  it("shows ranks 1-5 when the current user is at rank 1", () => {
    const window = selectMiniLeaderboardWindow(TEN_ENTRIES, "uid1");
    expect(window.map((w) => w.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it("shows the last 5 ranks when the current user is at the bottom", () => {
    const window = selectMiniLeaderboardWindow(TEN_ENTRIES, "uid10");
    expect(window.map((w) => w.rank)).toEqual([6, 7, 8, 9, 10]);
  });

  it("centers a window of exactly MINI_LEADERBOARD_SIZE around a middle-ranked user", () => {
    const window = selectMiniLeaderboardWindow(TEN_ENTRIES, "uid5");
    expect(window).toHaveLength(MINI_LEADERBOARD_SIZE);
    expect(window.map((w) => w.rank)).toContain(5);
  });

  it("still includes the current user's row even near an edge (not off-window)", () => {
    const window = selectMiniLeaderboardWindow(TEN_ENTRIES, "uid2");
    expect(window.some((w) => w.entry.uid === "uid2")).toBe(true);
  });

  it("falls back to the top 5 when the current uid isn't in the list (e.g. signed-out)", () => {
    const window = selectMiniLeaderboardWindow(TEN_ENTRIES, null);
    expect(window.map((w) => w.rank)).toEqual([1, 2, 3, 4, 5]);
  });
});
