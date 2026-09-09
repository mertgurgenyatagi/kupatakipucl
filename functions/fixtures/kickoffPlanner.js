// Pure decision logic for the task-based live-poll scheduling that replaced
// functions/fixtures' flat onSchedule("every N minutes") cadence, 2026-09-10
// — kept out of index.js so it's unit-testable without mocking Cloud Tasks
// or Firestore, same reasoning as pollGate.js.
//
// The architecture: instead of a recurring job checking "is anything live"
// every few minutes forever, each fixture gets exactly one precisely-timed
// wake-up call shortly before its own kickoff (an "arrival" task), which
// then self-perpetuates a tight poll loop (index.js's *PollTick handlers)
// only for as long as something is actually live. A separate coarse
// planner run (planKickoffTasks, index.js) schedules those arrival tasks
// ahead of time and self-heals a dropped one. Idle time between matchdays
// now costs nothing recurring at all, rather than a cheap-but-nonzero tick
// every few minutes, all month.

/** How far ahead of kickoff to schedule a fixture's arrival wake-up. Not
 *  meant to be precise to the minute (nothing football-relevant happens in
 *  the last 5 vs. 10 minutes before kickoff) — 10 minutes comfortably
 *  covers Cloud Tasks scheduling jitter and a slightly-early football-data.org
 *  status flip. */
const ARRIVAL_LEAD_MS = 10 * 60 * 1000;

/** How far ahead planKickoffTasks looks each time it runs, and therefore
 *  the ceiling on how rarely it can run: this must exceed the planner's own
 *  schedule interval with real margin, or a fixture whose kickoff falls in
 *  the gap between two planner runs would never get an arrival task at
 *  all. At a 6-hour planner cadence (index.js), 12 hours is a comfortable
 *  2x margin. */
const PLANNER_LOOKAHEAD_MS = 12 * 60 * 60 * 1000;

/**
 * Which of `fixtures` need an arrival task scheduled on this planner run —
 * anything kicking off between now and PLANNER_LOOKAHEAD_MS out. Doesn't
 * check whether one was already scheduled on a previous run: index.js
 * enqueues each with a deterministic task id derived from the fixture id
 * and lets Cloud Tasks' own "task already exists" rejection handle that
 * idempotently — cheaper than tracking it here too, and correct even if
 * the planner's own schedule ever changes.
 */
function fixturesNeedingArrival(fixtures, nowMs) {
  const horizonMs = nowMs + PLANNER_LOOKAHEAD_MS;
  return fixtures.filter((f) => {
    const kickoffMs = new Date(f.kickoffUtc).getTime();
    return kickoffMs > nowMs && kickoffMs <= horizonMs;
  });
}

module.exports = { fixturesNeedingArrival, ARRIVAL_LEAD_MS, PLANNER_LOOKAHEAD_MS };
