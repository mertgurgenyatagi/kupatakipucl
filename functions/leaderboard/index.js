const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");

initializeApp();
const db = getFirestore();

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
 * Recomputes the whole leaderboard and writes it to a single doc
 * (leaderboardCache/current) that every client just reads live, instead of
 * every visitor downloading the full predictions + profiles collections and
 * redoing this math themselves on every page visit (scaling-audit
 * No. 08/09, 2026-07-31). Triggered on any predictions or results write —
 * recomputing from scratch is cheap at this site's real scale (a few
 * hundred participants, one 36-team ranking each), so there's no need for
 * a more incremental update here.
 */
async function recomputeLeaderboard() {
  const [predictionsSnap, profilesSnap, resultsSnap] = await Promise.all([
    db.collection("predictions").get(),
    db.collection("profiles").get(),
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

  await db.doc("leaderboardCache/current").set({ entries, computedAt: Date.now() });
}

exports.recomputeLeaderboardOnPrediction = onDocumentWritten("predictions/{uid}", async () => {
  await recomputeLeaderboard();
});

exports.recomputeLeaderboardOnResult = onDocumentWritten("results/{teamId}", async () => {
  await recomputeLeaderboard();
});
