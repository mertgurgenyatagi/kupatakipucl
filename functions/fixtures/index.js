const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { fetchAllMatches, mapMatchesToFixtures } = require("./footballData");
const { computeStandingsTable } = require("./standings");
const { shouldPoll } = require("./pollGate");
const { getLastSyncedAtMs, recordSynced, getRecentFixtures } = require("./syncControl");

initializeApp();
const db = getFirestore();

const FOOTBALL_DATA_TOKEN = defineSecret("FOOTBALL_DATA_TOKEN");

/**
 * Runs both scheduled syncs' shared cost-control decision (pollGate.js):
 * poll aggressively while a match is live (plus an hour of grace after),
 * extremely sparsely otherwise. Added 2026-09-07 for the live-match feature
 * — real-time score/position updates need tight polling during a match, but
 * that's wasted the other 99% of the time.
 *
 * Both sync functions call this independently (each does its own cheap
 * `getRecentFixtures` query) rather than merging into one function, so a bug
 * in one sync still can't take the other down with it — same reasoning
 * syncFixtures' own comment already gives for keeping the two separate.
 *
 * `key` gives each caller its OWN `lastSyncedAtMs` (syncControl.js) — they
 * used to share one, which meant whichever ran its gate check first each
 * tick would "spend" the sync for both, leaving the other stale. Caught
 * live 2026-09-07.
 */
async function gatedSync(key, sync) {
  const nowMs = Date.now();
  const [recentFixtures, lastSyncedAtMs] = await Promise.all([
    getRecentFixtures(db, new Date(nowMs).toISOString()),
    getLastSyncedAtMs(db, key),
  ]);
  if (!shouldPoll(nowMs, recentFixtures, lastSyncedAtMs)) return;

  await sync();
  await recordSynced(db, key, nowMs);
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
 * Unconditional overwrite, same as the dev panel's own batch write: this is
 * meant to be the single source of truth for results once the league phase
 * starts. The dev panel's manual "mark match decided" flow still works
 * end-to-end (nothing here disables it), but anything it writes only survives
 * until this function's next successful run — by design, a fallback is only
 * useful for bridging a football-data.org outage, not for a correction meant
 * to stick. If a manual correction ever needs to survive past the next sync,
 * that needs its own decision (e.g. a pause flag this function checks first)
 * — not built, because nothing has needed it yet.
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

  const batch = db.batch();
  Object.entries(results).forEach(([teamId, result]) => {
    batch.set(db.doc(`results/${teamId}`), result);
  });
  await batch.commit();
}

/**
 * Region pinned for the same reason as recomputeLeaderboardSafetyNet:
 * onSchedule does not inherit the Firestore database's region.
 *
 * Every 2 minutes, not a fixed 10 — the schedule itself is now just the
 * ceiling on how promptly a live window can be noticed; gatedSync (above)
 * is what actually decides whether football-data.org gets called on any
 * given tick. See pollGate.js.
 */
exports.syncFootballDataResults = onSchedule(
  { schedule: "every 2 minutes", region: "europe-west8", secrets: [FOOTBALL_DATA_TOKEN] },
  async () => {
    await gatedSync("results", syncResults);
  }
);

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
 *
 * A separate scheduled function from syncResults, not folded into it, so a
 * bug in one sync (e.g. a future football-data.org response shape change)
 * can't take the other down with it.
 */
async function syncFixtures() {
  const matches = await fetchAllMatches(FOOTBALL_DATA_TOKEN.value());
  const fixtures = mapMatchesToFixtures(matches);

  const batch = db.batch();
  fixtures.forEach((fixture) => {
    const { id, ...fields } = fixture;
    batch.set(db.doc(`fixtures/${id}`), fields);
  });
  await batch.commit();
}

exports.syncFootballDataFixtures = onSchedule(
  { schedule: "every 2 minutes", region: "europe-west8", secrets: [FOOTBALL_DATA_TOKEN] },
  async () => {
    await gatedSync("fixtures", syncFixtures);
  }
);
