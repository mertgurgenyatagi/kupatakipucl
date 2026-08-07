const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { randomUUID } = require("node:crypto");
const {
  DEBOUNCE_MS,
  shouldSkipAlreadyCovered,
  shouldProceedAfterDebounce,
  shouldCommitRecompute,
} = require("./recomputeGuard");

initializeApp();
const db = getFirestore();

const CACHE_DOC = "leaderboardCache/current";
// Lives in leaderboardCache on purpose: that collection is already
// `read: true, write: false` in firestore.rules, and the Admin SDK bypasses
// rules — so the control doc needs no rules change at all, and no client can
// forge it.
const CONTROL_DOC = "leaderboardCache/control";

// Mirrors src/leaderboard/scoring.ts's computeScore/isPickCorrect exactly —
// duplicated here rather than imported, since this runs as plain JS
// (Firebase Functions), separate from the TypeScript client app, same
// convention as functions/stopbilling. Keep the two in sync if the scoring
// rule ever changes.
function isPickCorrect(predictedPosition, actualPosition) {
  return Math.abs(predictedPosition - actualPosition) < 3;
}
const POINTS_PER_CORRECT_PICK = 3;
function computeScore(ranking, results) {
  let score = 0;
  ranking.forEach((teamId, index) => {
    const result = results[teamId];
    if (!result) return;
    const predictedPosition = index + 1;
    if (isPickCorrect(predictedPosition, result.position)) {
      score += POINTS_PER_CORRECT_PICK;
    }
  });
  return score;
}

/**
 * Reads every input and returns the leaderboard entries. Pure with respect to
 * Firestore writes — it never stores anything, so the caller owns the decision
 * about whether its result is still fresh enough to keep.
 */
async function computeEntries() {
  const [predictionsSnap, profilesSnap, resultsSnap] = await Promise.all([
    db.collection("predictions").get(),
    // Projection: the leaderboard renders a first name and a photo, nothing
    // else. Billed reads are unchanged (a projection does not reduce document
    // count) and the saving is latency only, but it also keeps surnames out of
    // a function with no business reading them, consistent with the 2026-08-02
    // name-privacy split.
    //
    // Still reads `profiles`, NOT `publicProfiles`: profiles is the source of
    // truth, and depending on the mirror here would let a missing
    // publicProfiles doc silently drop a participant off the leaderboard.
    db.collection("profiles").select("firstName", "photoURL").get(),
    db.collection("results").get(),
  ]);

  const profilesById = new Map(profilesSnap.docs.map((doc) => [doc.id, doc.data()]));
  const results = {};
  resultsSnap.docs.forEach((doc) => {
    results[doc.id] = doc.data();
  });

  const entries = [];
  predictionsSnap.docs.forEach((doc) => {
    const profile = profilesById.get(doc.id);
    if (!profile) return;
    const prediction = doc.data();
    entries.push({
      uid: doc.id,
      firstName: profile.firstName,
      photoURL: profile.photoURL,
      points: computeScore(prediction.ranking, results),
      ranking: prediction.ranking,
      submittedAt: prediction.submittedAt,
    });
  });
  entries.sort((a, b) => b.points - a.points);
  return entries;
}

/**
 * Computes, then stores only if the result is still the freshest one available.
 *
 * The transaction is what makes the check-and-write atomic; Firestore is in
 * PESSIMISTIC concurrency mode, so competing transactions on the control doc
 * serialize rather than racing. shouldCommitRecompute keeps stored results
 * monotonic in read freshness, so an older read can never overwrite a newer
 * one — see recomputeGuard.js for why that, not the debounce, is the property
 * correctness actually rests on.
 */
async function runRecompute() {
  const readStartedAt = Date.now();
  const entries = await computeEntries();

  const controlRef = db.doc(CONTROL_DOC);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(controlRef);
    const control = snap.exists ? snap.data() : null;
    if (!shouldCommitRecompute(control, readStartedAt)) return;

    const now = Date.now();
    tx.set(db.doc(CACHE_DOC), { entries, computedAt: now });
    tx.set(
      controlRef,
      {
        computedAt: now,
        lastComputeReadStartedAt: readStartedAt,
        computedThroughRequestedAt: control ? control.requestedAt ?? 0 : 0,
        computeCount: FieldValue.increment(1),
      },
      { merge: true }
    );
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Every trigger calls this instead of recomputing directly.
 *
 * A single match outcome in the dev panel commits a batch that rewrites all 36
 * `results` docs (src/devpanel/useDevMatches.ts), and every doc whose value
 * actually changed fires its own trigger. Before this, that meant one full
 * recompute per changed document — each re-reading every prediction and profile,
 * all writing the same document, and able to interleave such that an older read
 * silently erased a just-submitted prediction from the leaderboard.
 *
 * Two independent mechanisms collapse that, on purpose:
 *
 *  1. Already-covered check (no sleep, no write). If a finished recompute read
 *     the data after this write committed, this trigger has nothing to add.
 *     This is what holds when triggers run *sequentially* — which is exactly
 *     what the functions emulator does, and where a debounce alone collapses
 *     nothing at all.
 *  2. The debounce. When triggers do overlap, all but the newest stand down
 *     before doing any work, so a burst costs one recompute rather than one per
 *     trigger that happened to start before the first finished.
 */
async function requestRecompute(eventTimeMs) {
  const controlRef = db.doc(CONTROL_DOC);

  const before = await controlRef.get();
  if (shouldSkipAlreadyCovered(before.exists ? before.data() : null, eventTimeMs)) return;

  const myToken = randomUUID();
  await controlRef.set({ requestToken: myToken, requestedAt: Date.now() }, { merge: true });

  await sleep(DEBOUNCE_MS);

  const snap = await controlRef.get();
  const control = snap.exists ? snap.data() : null;
  if (shouldSkipAlreadyCovered(control, eventTimeMs)) return;
  if (!shouldProceedAfterDebounce(control, myToken, Date.now())) return;

  await runRecompute();
}

/** Eventarc delivers the commit time as an RFC3339 string on `event.time`. */
function eventTimeMs(event) {
  const parsed = Date.parse(event?.time ?? "");
  return Number.isFinite(parsed) ? parsed : undefined;
}

exports.recomputeLeaderboardOnPrediction = onDocumentWritten("predictions/{uid}", async (event) => {
  await requestRecompute(eventTimeMs(event));
});

exports.recomputeLeaderboardOnResult = onDocumentWritten("results/{teamId}", async (event) => {
  await requestRecompute(eventTimeMs(event));
});

/**
 * Recomputes only when the control doc says inputs have moved since the last
 * successful compute. When idle this is one document read every 5 minutes.
 *
 * This exists so that a dropped trigger, a crashed invocation, or any
 * unforeseen everybody-stood-down interleaving is *self-healing* rather than
 * permanently wrong. "The leaderboard is quietly wrong" is the worst failure
 * this app has — it is the entire point of the site — so the debounce is not
 * trusted on its own.
 *
 * The region is pinned deliberately. Firestore triggers infer their region from
 * the database's location (europe-west8); onSchedule does NOT, and would
 * otherwise deploy to us-central1 and read cross-region.
 */
exports.recomputeLeaderboardSafetyNet = onSchedule(
  { schedule: "every 5 minutes", region: "europe-west8" },
  async () => {
    const snap = await db.doc(CONTROL_DOC).get();
    if (!snap.exists) return;
    const control = snap.data();
    if ((control.requestedAt ?? 0) <= (control.computedThroughRequestedAt ?? 0)) return;
    await runRecompute();
  }
);
