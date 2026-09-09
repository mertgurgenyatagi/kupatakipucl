// Pure decision logic for "is a match live right now" — kept out of
// index.js so it's unit-testable without mocking Firestore, same reasoning
// as kickoffPlanner.js and functions/leaderboard/recomputeGuard.js.
//
// Used two ways in index.js: every *PollTick handler checks this after each
// sync to decide whether to keep its chain going, and planKickoffTasks uses
// it as a self-heal check for a dropped arrival task (Cloud Tasks delivery
// isn't guaranteed), the same role recomputeLeaderboardSafetyNet plays for
// the leaderboard.
//
// Until 2026-09-10 this also gated a flat onSchedule("every N minutes")
// cadence (a since-removed shouldPoll/SPARSE_INTERVAL_MS pair) — removed
// when that fixed interval itself turned out to be the real cost driver
// behind the 2026-09-09 budget killswitch (PROJECT.md §1/§6): it ran 24/7
// regardless of match activity, so widening it only ever bought a smaller
// version of the same problem. kickoffPlanner.js's precisely-timed
// wake-ups replace the fixed interval entirely rather than widening it
// further.

/** 2.5h estimated match length (Mert's own round-1 estimate) + 1h grace. */
const LIVE_WINDOW_MS = 3.5 * 60 * 60 * 1000;

/** True if any of the given fixtures (assumed already-kicked-off — see
 *  syncControl.js's getRecentFixtures) is still within its live window. */
function isWithinLiveWindow(nowMs, recentFixtures) {
  return recentFixtures.some((f) => {
    const kickoffMs = new Date(f.kickoffUtc).getTime();
    return kickoffMs <= nowMs && nowMs <= kickoffMs + LIVE_WINDOW_MS;
  });
}

module.exports = { isWithinLiveWindow, LIVE_WINDOW_MS };
