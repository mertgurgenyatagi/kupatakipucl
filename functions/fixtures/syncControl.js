// Shared Firestore-backed state for functions/fixtures' task-based live-poll
// scheduling (index.js, kickoffPlanner.js, pollGate.js). One collection,
// two kinds of document: `chain-{fixtures|results}` (this file's
// claimChainStart/markChainStopped) tracks whether a poll chain is
// currently running, kept per sync type since fixtures/results are
// deliberately independent (see syncFixtures' own comment in index.js for
// why) — a bug in one chain's control doc can't affect the other's.
const CONTROL_COLLECTION = "fixturesSyncControl";

/**
 * Atomically claims ownership of starting a poll chain. At most one caller
 * "wins" even if several fire close together — e.g. two fixtures kicking
 * off within seconds of each other both trigger an arrival task, and both
 * try to start the same `fixtures` chain. The loser does nothing; the chain
 * the winner starts will cover its fixture too, since *PollTick (index.js)
 * always syncs the whole collection, not one fixture at a time. Returns
 * true only for the caller that actually flipped it on.
 */
async function claimChainStart(db, chainKey) {
  const ref = db.collection(CONTROL_COLLECTION).doc(`chain-${chainKey}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists && snap.data().active) return false;
    tx.set(ref, { active: true, startedAtMs: Date.now() });
    return true;
  });
}

/** Called by *PollTick (index.js) once nothing is live any more, so the
 *  next arrival task or planner self-heal check knows it needs to start a
 *  fresh chain rather than assuming one is already running. */
async function markChainStopped(db, chainKey) {
  await db.collection(CONTROL_COLLECTION).doc(`chain-${chainKey}`).set({ active: false }, { merge: true });
}

/**
 * The already-kicked-off fixtures closest to `now` — cheap (single-field
 * range query, no composite index needed since the orderBy matches the
 * inequality field), and only ever used to decide whether we're inside a
 * live window (pollGate.js), never to read a match's actual current score.
 * 20 comfortably covers a whole matchday (18 fixtures) with margin.
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

/**
 * Fixtures kicking off within kickoffPlanner.js's lookahead window —
 * planKickoffTasks' (index.js) own input for deciding which fixtures need
 * an arrival task scheduled. A second single-field range query on the same
 * field as getRecentFixtures, same no-composite-index reasoning.
 */
async function getUpcomingFixtures(db, nowIso, horizonIso) {
  const snap = await db
    .collection("fixtures")
    .where("kickoffUtc", ">", nowIso)
    .where("kickoffUtc", "<=", horizonIso)
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

module.exports = {
  claimChainStart,
  markChainStopped,
  getRecentFixtures,
  getUpcomingFixtures,
  readCollectionById,
};
