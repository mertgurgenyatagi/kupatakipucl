import { RankedEntry } from "./ranking";

export const MINI_LEADERBOARD_SIZE = 5;

/**
 * GREAT_LEAP_SPEC.md §2.5: always show exactly 5 rows, sliding near the top
 * or bottom of the full list rather than centering the current user (that
 * "2 above, 2 below" idea was explicitly walked back) — this just clamps a
 * centered window into range, which produces the same "slides near the
 * edges" behavior for free.
 */
export function selectMiniLeaderboardWindow(rankedEntries: RankedEntry[], currentUid: string | null): RankedEntry[] {
  if (rankedEntries.length <= MINI_LEADERBOARD_SIZE) return rankedEntries;

  const myIndex = currentUid ? rankedEntries.findIndex((r) => r.entry.uid === currentUid) : -1;
  if (myIndex === -1) return rankedEntries.slice(0, MINI_LEADERBOARD_SIZE);

  const half = Math.floor(MINI_LEADERBOARD_SIZE / 2);
  const start = Math.max(0, Math.min(myIndex - half, rankedEntries.length - MINI_LEADERBOARD_SIZE));
  return rankedEntries.slice(start, start + MINI_LEADERBOARD_SIZE);
}
