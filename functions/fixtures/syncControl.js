// "When did we last actually sync" state for pollGate.js's sparse-interval
// check — one doc PER sync type (results, fixtures), not shared. They used
// to share a single doc, but that meant whichever of syncFootballDataResults
// / syncFootballDataFixtures happened to run its gate check first each tick
// would "spend" the sync for both: the second function would see the
// first's freshly-written timestamp and skip its own sync entirely, even
// though the two are genuinely different football-data.org endpoints.
// Caught live 2026-09-07 — after deploying, a manual trigger of both
// functions close together left `results` stale (its own sync never ran)
// while `fixtures` updated normally.
const CONTROL_COLLECTION = "fixturesSyncControl";

async function getLastSyncedAtMs(db, key) {
  const snap = await db.collection(CONTROL_COLLECTION).doc(key).get();
  return snap.exists ? (snap.data().lastSyncedAtMs ?? null) : null;
}

async function recordSynced(db, key, nowMs) {
  await db.collection(CONTROL_COLLECTION).doc(key).set({ lastSyncedAtMs: nowMs }, { merge: true });
}

/**
 * The already-kicked-off fixtures closest to `now` — cheap (single-field
 * range query, no composite index needed since the orderBy matches the
 * inequality field), and only ever used to decide whether we're inside a
 * live window (pollGate.js), never to read a match's actual current score.
 * 20 comfortably covers a whole matchday (18 fixtures) with margin. Shared
 * between both sync types on purpose — unlike lastSyncedAtMs, this is
 * read-only and both functions should agree on it.
 */
async function getRecentFixtures(db, nowIso) {
  const snap = await db
    .collection("fixtures")
    .where("kickoffUtc", "<=", nowIso)
    .orderBy("kickoffUtc", "desc")
    .limit(20)
    .get();
  return snap.docs.map((doc) => doc.data());
}

/** A whole collection as `{ [docId]: data }`, for docDiff.js to compare the
 *  freshly-computed documents against. The two collections this is used on
 *  are fixed-size and small (144 fixtures, 36 results). */
async function readCollectionById(db, collection) {
  const snap = await db.collection(collection).get();
  const byId = {};
  snap.docs.forEach((doc) => {
    byId[doc.id] = doc.data();
  });
  return byId;
}

module.exports = { getLastSyncedAtMs, recordSynced, getRecentFixtures, readCollectionById };
