// Pure decision logic for whether a sync tick should actually call
// football-data.org — kept out of index.js so it's unit-testable without
// mocking fetch or Firestore, same reasoning as
// functions/leaderboard/recomputeGuard.js.
//
// Mert's spec, 2026-09-07: poll aggressively during a live match (plus an
// hour of grace after it likely ends, for late corrections), and otherwise
// extremely sparsely — a live-feeling feature without hammering football-
// data.org's Free tier the other 99% of the time.

/** 2.5h estimated match length (Mert's own round-1 estimate) + 1h grace. */
const LIVE_WINDOW_MS = 3.5 * 60 * 60 * 1000;

/** How long to go between syncs when nothing is live. */
const SPARSE_INTERVAL_MS = 5 * 60 * 60 * 1000;

/** True if any of the given fixtures (assumed already-kicked-off — see
 *  syncControl.js's getRecentFixtures) is still within its live window. */
function isWithinLiveWindow(nowMs, recentFixtures) {
  return recentFixtures.some((f) => {
    const kickoffMs = new Date(f.kickoffUtc).getTime();
    return kickoffMs <= nowMs && nowMs <= kickoffMs + LIVE_WINDOW_MS;
  });
}

/**
 * `recentFixtures` should already be filtered to fixtures whose kickoff has
 * passed (getRecentFixtures does this via a Firestore query) — this
 * function only decides live-window-or-sparse from there.
 *
 * `lastSyncedAtMs` of `null` (never synced) always polls, same as a sparse
 * interval that has already elapsed.
 */
function shouldPoll(nowMs, recentFixtures, lastSyncedAtMs) {
  if (isWithinLiveWindow(nowMs, recentFixtures)) return true;
  if (lastSyncedAtMs === null || nowMs - lastSyncedAtMs >= SPARSE_INTERVAL_MS) return true;
  return false;
}

module.exports = { shouldPoll, isWithinLiveWindow, LIVE_WINDOW_MS, SPARSE_INTERVAL_MS };
