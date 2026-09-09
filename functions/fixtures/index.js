const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getFunctions } = require("firebase-admin/functions");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onTaskDispatched } = require("firebase-functions/v2/tasks");
const { defineSecret } = require("firebase-functions/params");
const { fetchAllMatches, mapMatchesToFixtures } = require("./footballData");
const { computeStandingsTable } = require("./standings");
const { isWithinLiveWindow } = require("./pollGate");
const { fixturesNeedingArrival, ARRIVAL_LEAD_MS, PLANNER_LOOKAHEAD_MS } = require("./kickoffPlanner");
const { pickChangedDocs } = require("./docDiff");
const {
  claimChainStart,
  markChainStopped,
  getRecentFixtures,
  getUpcomingFixtures,
  readCollectionById,
} = require("./syncControl");

initializeApp();
const db = getFirestore();

const REGION = "europe-west8";
const FOOTBALL_DATA_TOKEN = defineSecret("FOOTBALL_DATA_TOKEN");

/**
 * Seconds between ticks while a poll chain is actively running — the "how
 * live does live feel" knob. 2 minutes, same as this app's original design.
 * Safe to keep tight now that idle time between kickoffs costs nothing at
 * all (the whole point of the 2026-09-10 task-based rearchitecture, below)
 * — under the old flat-schedule design this same number was also the idle
 * cost, which is what forced it to be widened to 10 minutes on 2026-09-09
 * as a stopgap.
 */
const LIVE_TICK_INTERVAL_SECONDS = 120;

/**
 * Firebase Admin's task-queue client needs a region-qualified function name
 * for anything not in the default us-central1 — same reason every
 * onSchedule/Firestore trigger in this codebase pins europe-west8.
 */
function taskQueue(functionName) {
  return getFunctions().taskQueue(`locations/${REGION}/functions/${functionName}`);
}

/**
 * Pulls the real fixture calendar from football-data.org and computes
 * results/{teamId} ourselves (standings.js) rather than trusting that API's
 * own standings table — Mert, 2026-09-08: "make sure our table uses the same
 * rules" as UEFA's actual league-phase tiebreak order, which the API's own
 * `position` field doesn't guarantee. `opta-analyst` is a real
 * predictions/{uid} document (a hand-seeded "participant" carrying the Opta
 * supercomputer's preseason projected order, not a real signup) that
 * standings.js reads as its fallback order for a still-tied opening table
 * and, once Matchday 8 completes, in place of the disciplinary-points and
 * UEFA-club-coefficient criteria this app has no data for.
 *
 * results/{teamId} is the same collection src/devpanel/useDevMatches.ts
 * writes by hand, and the one functions/leaderboard's
 * onDocumentWritten("results/{teamId}") trigger already watches, so a
 * successful sync here recomputes the leaderboard with no further wiring.
 *
 * This is the single source of truth for results once the league phase
 * starts. The dev panel's manual "mark match decided" flow still works
 * end-to-end (nothing here disables it), but anything it writes only survives
 * until this function's next successful run — by design, a fallback is only
 * useful for bridging a football-data.org outage, not for a correction meant
 * to stick. If a manual correction ever needs to survive past the next sync,
 * that needs its own decision (e.g. a pause flag this function checks first)
 * — not built, because nothing has needed it yet.
 *
 * Only genuinely changed documents are written (docDiff.js). This used to
 * overwrite all 36 unconditionally on every run, which during a live window
 * meant 36 writes every 2 minutes — and, worse, 36 spurious
 * onDocumentWritten("results/{teamId}") triggers into functions/leaderboard
 * each time. Drift still heals: a document that no longer matches what we
 * compute differs, so it is still rewritten.
 */
async function syncResults() {
  const [matches, optaDoc] = await Promise.all([
    fetchAllMatches(FOOTBALL_DATA_TOKEN.value()),
    db.doc("predictions/opta-analyst").get(),
  ]);
  const optaRanking = optaDoc.data()?.ranking;
  if (!Array.isArray(optaRanking)) {
    throw new Error("predictions/opta-analyst is missing its ranking array");
  }

  const fixtures = mapMatchesToFixtures(matches);
  const results = computeStandingsTable(fixtures, optaRanking);

  const stored = await readCollectionById(db, "results");
  const changed = pickChangedDocs(stored, results);
  const changedIds = Object.keys(changed);
  if (changedIds.length === 0) {
    console.log("results: no change, nothing written");
    return;
  }

  const batch = db.batch();
  changedIds.forEach((teamId) => {
    batch.set(db.doc(`results/${teamId}`), changed[teamId]);
  });
  await batch.commit();
  console.log(`results: wrote ${changedIds.length} of ${Object.keys(results).length}`);
}

/**
 * Same idea as syncResults, but for the real fixture calendar + per-match
 * scores instead of the standings table — writes fixtures/{id}, a brand new
 * collection that has nothing to do with src/devpanel/fixtures.ts or
 * devMatches. Mert's call, 2026-09-07: he doesn't use the dev panel to flip
 * matches in production and doesn't want it touched — so rather than
 * repoint it at real data, production's live consumers
 * (upcomingFixtures.ts, rankHistory.ts, MatchupPopup.tsx) were repointed at
 * this new collection instead, leaving the dev panel's own mock calendar and
 * devMatches completely untouched for local testing.
 */
async function syncFixtures() {
  const matches = await fetchAllMatches(FOOTBALL_DATA_TOKEN.value());
  const fixtures = mapMatchesToFixtures(matches);

  const next = {};
  fixtures.forEach(({ id, ...fields }) => {
    next[id] = fields;
  });

  const stored = await readCollectionById(db, "fixtures");
  const changed = pickChangedDocs(stored, next);
  const changedIds = Object.keys(changed);
  if (changedIds.length === 0) {
    console.log("fixtures: no change, nothing written");
    return;
  }

  const batch = db.batch();
  changedIds.forEach((id) => {
    batch.set(db.doc(`fixtures/${id}`), changed[id]);
  });
  await batch.commit();
  console.log(`fixtures: wrote ${changedIds.length} of ${fixtures.length}`);
}

/**
 * Starts a poll chain for `chainKey` ("fixtures" or "results") if one isn't
 * already running, by enqueueing its first tick. Called from both
 * handleFixtureArrival (the normal path, below) and planKickoffTasks (the
 * self-heal path for a dropped arrival task) — same claim-and-start logic
 * either way, so there is exactly one place a chain can start from.
 * claimChainStart (syncControl.js) is what makes this safe to call
 * concurrently: only the caller that actually flips the chain on enqueues
 * anything, everyone else is a no-op.
 */
async function ensureChainRunning(chainKey, tickFunctionName) {
  const won = await claimChainStart(db, chainKey);
  if (!won) return;
  await taskQueue(tickFunctionName).enqueue({});
}

/** fixturesPollTick/resultsPollTick share this: sync, then decide whether
 *  to keep the chain going. A fresh getRecentFixtures read every tick —
 *  not anything carried in the task payload — is what decides that, so a
 *  fixture's kickoff time changing mid-chain (a postponement) is reflected
 *  immediately rather than needing its own handling. */
async function continueOrStopChain(chainKey, tickFunctionName) {
  const nowMs = Date.now();
  const recentFixtures = await getRecentFixtures(db, new Date(nowMs).toISOString());
  if (isWithinLiveWindow(nowMs, recentFixtures)) {
    await taskQueue(tickFunctionName).enqueue({}, { scheduleDelaySeconds: LIVE_TICK_INTERVAL_SECONDS });
    return;
  }
  await markChainStopped(db, chainKey);
}

/**
 * Fires once per fixture, ARRIVAL_LEAD_MS (kickoffPlanner.js) before its
 * kickoff — scheduled by planKickoffTasks below, never called any other
 * way. Tries to start both poll chains independently; each is a no-op if
 * that chain is already running, which is the normal case whenever several
 * fixtures kick off close together (a whole matchday's worth of arrivals
 * only actually starts one chain of each kind).
 */
exports.handleFixtureArrival = onTaskDispatched({ region: REGION }, async () => {
  await Promise.all([
    ensureChainRunning("fixtures", "fixturesPollTick"),
    ensureChainRunning("results", "resultsPollTick"),
  ]);
});

/**
 * One tick of the fixtures poll chain: sync, then decide whether to keep
 * going. Self-perpetuating rather than externally scheduled — each tick
 * enqueues the next one LIVE_TICK_INTERVAL_SECONDS out for as long as
 * pollGate.js still says something's live, and stops (markChainStopped)
 * the moment it doesn't. This — not a recurring onSchedule — is what
 * replaced the flat "every N minutes, 24/7" cadence that was the actual
 * cost driver behind the 2026-09-09 budget killswitch (PROJECT.md §1/§6):
 * between kickoffs, nothing is scheduled at all.
 */
exports.fixturesPollTick = onTaskDispatched({ region: REGION, secrets: [FOOTBALL_DATA_TOKEN] }, async () => {
  await syncFixtures();
  await continueOrStopChain("fixtures", "fixturesPollTick");
});

/** Same idea as fixturesPollTick, for results — a fully independent chain
 *  and control doc, same reasoning as the two sync functions always having
 *  been kept separate: a bug in one still can't take the other down. */
exports.resultsPollTick = onTaskDispatched({ region: REGION, secrets: [FOOTBALL_DATA_TOKEN] }, async () => {
  await syncResults();
  await continueOrStopChain("results", "resultsPollTick");
});

/**
 * Coarse planner, region-pinned for the same reason as
 * recomputeLeaderboardSafetyNet: onSchedule does not inherit the Firestore
 * database's region. Runs every 6 hours — comfortably inside
 * kickoffPlanner.js's 12-hour PLANNER_LOOKAHEAD_MS, so no fixture's kickoff
 * can fall in the gap between two runs — and does two things:
 *
 *  1. Schedules an arrival task (handleFixtureArrival) for every fixture
 *     kicking off in the next 12 hours, ARRIVAL_LEAD_MS ahead of its own
 *     kickoff. A deterministic per-fixture task id (`arrival-${id}`) makes
 *     re-running this safe — a fixture that already has one scheduled just
 *     gets a "task already exists" rejection, caught and ignored below.
 *  2. Self-heals a dropped arrival task (Cloud Tasks delivery, like any
 *     queue, isn't 100% guaranteed) the same way recomputeLeaderboardSafetyNet
 *     self-heals a dropped leaderboard trigger: if pollGate.js says
 *     something's live right now but a chain isn't running, start it
 *     directly rather than waiting for the next arrival.
 *
 * This function is the only recurring, always-on schedule left in this
 * file — 4 invocations a day, each just two cheap Firestore range queries
 * plus (almost always) zero task enqueues, is the entire idle-day cost.
 */
exports.planKickoffTasks = onSchedule({ schedule: "every 6 hours", region: REGION }, async () => {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const horizonIso = new Date(nowMs + PLANNER_LOOKAHEAD_MS).toISOString();

  const [upcoming, recentFixtures] = await Promise.all([
    getUpcomingFixtures(db, nowIso, horizonIso),
    getRecentFixtures(db, nowIso),
  ]);

  await Promise.all(
    fixturesNeedingArrival(upcoming, nowMs).map(async (fixture) => {
      const kickoffMs = new Date(fixture.kickoffUtc).getTime();
      try {
        await taskQueue("handleFixtureArrival").enqueue(
          {},
          { id: `arrival-${fixture.id}`, scheduleTime: new Date(kickoffMs - ARRIVAL_LEAD_MS) }
        );
      } catch (err) {
        if (err.code !== "functions/task-already-exists") throw err;
      }
    })
  );

  if (isWithinLiveWindow(nowMs, recentFixtures)) {
    await Promise.all([
      ensureChainRunning("fixtures", "fixturesPollTick"),
      ensureChainRunning("results", "resultsPollTick"),
    ]);
  }
});
