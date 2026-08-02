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

// Mirrors src/leaderboard/ranking.ts's assignRanks exactly — the client had
// this already (used to render the live leaderboard); the server didn't,
// and rank snapshots (GREAT_LEAP_SPEC.md §7.1) need a real rank number per
// entry, not just a sorted list.
function assignRanks(entries) {
  let lastPoints = null;
  let lastRank = 0;
  return entries.map((entry, index) => {
    if (lastPoints === null || entry.points !== lastPoints) {
      lastRank = index + 1;
      lastPoints = entry.points;
    }
    return { entry, rank: lastRank };
  });
}

function buildRankSnapshotEntries(entries) {
  return assignRanks(entries).map(({ entry, rank }) => ({
    uid: entry.uid,
    points: entry.points,
    rank,
  }));
}

function rankSnapshotDocId(currentMatchday) {
  if (typeof currentMatchday !== "number") return null;
  return String(currentMatchday);
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
  const [predictionsSnap, profilesSnap, resultsSnap, tournamentStateSnap] = await Promise.all([
    db.collection("predictions").get(),
    db.collection("profiles").get(),
    db.collection("results").get(),
    db.doc("tournamentState/current").get(),
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
      lastName: profile.lastName,
      photoURL: profile.photoURL,
      points: computeScore(prediction.ranking, results),
      ranking: prediction.ranking,
      submittedAt: prediction.submittedAt,
    });
  });
  entries.sort((a, b) => b.points - a.points);

  await db.doc("leaderboardCache/current").set({ entries, computedAt: Date.now() });

  // Rank snapshots (GREAT_LEAP_SPEC.md §7.1): only written once a real
  // matchday is set (tournamentState/current.currentMatchday, hand-bumped
  // — §1.2, no admin UI). Scoring-agnostic on purpose: this just snapshots
  // whatever `points` each entry already has above, so a future scoring
  // change (e.g. Plan 2 adding bracket points) flows through automatically.
  //
  // Note: `.exists` is a boolean property on Admin SDK DocumentSnapshots,
  // not a method call like on the client SDK.
  const currentMatchday = tournamentStateSnap.exists ? tournamentStateSnap.data().currentMatchday : undefined;
  const snapshotDocId = rankSnapshotDocId(currentMatchday);
  if (snapshotDocId) {
    await db.doc(`rankSnapshots/${snapshotDocId}`).set({
      matchday: currentMatchday,
      entries: buildRankSnapshotEntries(entries),
      computedAt: Date.now(),
    });
  }
}

exports.recomputeLeaderboardOnPrediction = onDocumentWritten("predictions/{uid}", async () => {
  await recomputeLeaderboard();
});

exports.recomputeLeaderboardOnResult = onDocumentWritten("results/{teamId}", async () => {
  await recomputeLeaderboard();
});

exports.isPickCorrect = isPickCorrect;
exports.computeScore = computeScore;
exports.assignRanks = assignRanks;
exports.buildRankSnapshotEntries = buildRankSnapshotEntries;
exports.rankSnapshotDocId = rankSnapshotDocId;
