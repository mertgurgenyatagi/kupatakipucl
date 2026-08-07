const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { randomUUID } = require("node:crypto");
const {
  DEBOUNCE_MS,
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
 * actually changed fires its own trigger. Before this debounce that meant 5-15
 * concurrent full recomputes — each re-reading every prediction and profile,
 * all writing the same document, and able to interleave such that an older read
 * silently erased a just-submitted prediction from the leaderboard.
 *
 * Now they all stamp the control doc, sleep, and all but the newest stand down.
 */
async function requestRecompute() {
  const myToken = randomUUID();
  const controlRef = db.doc(CONTROL_DOC);
  await controlRef.set({ requestToken: myToken, requestedAt: Date.now() }, { merge: true });

  await sleep(DEBOUNCE_MS);

  const snap = await controlRef.get();
  const control = snap.exists ? snap.data() : null;
  if (!shouldProceedAfterDebounce(control, myToken, Date.now())) return;

  await runRecompute();
}

exports.recomputeLeaderboardOnPrediction = onDocumentWritten("predictions/{uid}", async () => {
  await requestRecompute();
});

exports.recomputeLeaderboardOnResult = onDocumentWritten("results/{teamId}", async () => {
  await requestRecompute();
});
