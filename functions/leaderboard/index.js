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

// Mirrors src/leaderboard/bracketScoring.ts exactly (GREAT_LEAP_SPEC.md
// §5.3). The spec's table lists points by the STAGE a team reaches (QF=3,
// SF=4, Final=5, Champion=6) — a team reaches a stage by WINNING the match
// immediately before it, so this table is keyed one round earlier than the
// spec's stage names: a correct RO16 pick earns "reached QF" points, a
// correct QF pick earns "reached SF" points, and so on. Winning the Final
// matchup itself is simultaneously "reached Champion", so there is no
// separate champion-bonus step.
const BRACKET_POINTS = { ro16: 3, qf: 4, sf: 5, final: 6 };

const BRACKET_MATCHUP_ROUNDS = {
  "ro16-1": "ro16", "ro16-2": "ro16", "ro16-3": "ro16", "ro16-4": "ro16",
  "ro16-5": "ro16", "ro16-6": "ro16", "ro16-7": "ro16", "ro16-8": "ro16",
  "qf-1": "qf", "qf-2": "qf", "qf-3": "qf", "qf-4": "qf",
  "sf-1": "sf", "sf-2": "sf",
  final: "final",
};

function computeBracketScore(picks, bracketState) {
  if (!picks) return 0;

  let total = 0;
  for (const matchupId of Object.keys(BRACKET_MATCHUP_ROUNDS)) {
    const pickedTeam = picks[matchupId];
    const actualWinner = bracketState.winners[matchupId];
    if (!pickedTeam || !actualWinner || pickedTeam !== actualWinner) continue;
    total += BRACKET_POINTS[BRACKET_MATCHUP_ROUNDS[matchupId]];
  }

  return total;
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

// Extracted from recomputeLeaderboard so the combined-scoring logic (§6,
// §7.3) is independently testable without the Admin SDK. Iterates the union
// of predictionsById and bracketPredictionsById keys so a participant with
// only one of the two submissions still gets a correct combined entry.
function buildLeaderboardEntries({
  profilesById,
  predictionsById,
  bracketPredictionsById,
  results,
  bracketState,
}) {
  const uids = new Set([...predictionsById.keys(), ...bracketPredictionsById.keys()]);
  const entries = [];

  for (const uid of uids) {
    const profile = profilesById.get(uid);
    if (!profile) continue;

    const prediction = predictionsById.get(uid);
    const bracketPrediction = bracketPredictionsById.get(uid);

    const leaguePoints = prediction ? computeScore(prediction.ranking, results) : 0;
    const bracketPoints = computeBracketScore(bracketPrediction ? bracketPrediction.picks : undefined, bracketState);

    entries.push({
      uid,
      firstName: profile.firstName,
      lastName: profile.lastName,
      photoURL: profile.photoURL,
      points: leaguePoints + bracketPoints,
      ranking: prediction ? prediction.ranking : undefined,
      submittedAt: prediction ? prediction.submittedAt : undefined,
    });
  }

  return entries;
}

/**
 * Recomputes the whole leaderboard and writes it to a single doc
 * (leaderboardCache/current) that every client just reads live, instead of
 * every visitor downloading the full predictions + profiles collections and
 * redoing this math themselves on every page visit (scaling-audit
 * No. 08/09, 2026-07-31). Triggered on any predictions/results/bracket
 * write — recomputing from scratch is cheap at this site's real scale (a
 * few hundred participants), so there's no need for a more incremental
 * update here.
 */
async function recomputeLeaderboard() {
  const [predictionsSnap, profilesSnap, resultsSnap, tournamentStateSnap, bracketPredictionsSnap, bracketStateSnap] =
    await Promise.all([
      db.collection("predictions").get(),
      db.collection("profiles").get(),
      db.collection("results").get(),
      db.doc("tournamentState/current").get(),
      db.collection("bracketPredictions").get(),
      db.doc("bracketState/current").get(),
    ]);

  const profilesById = new Map(profilesSnap.docs.map((doc) => [doc.id, doc.data()]));
  const predictionsById = new Map(predictionsSnap.docs.map((doc) => [doc.id, doc.data()]));
  const bracketPredictionsById = new Map(bracketPredictionsSnap.docs.map((doc) => [doc.id, doc.data()]));

  const results = {};
  resultsSnap.docs.forEach((doc) => {
    results[doc.id] = doc.data();
  });

  const bracketState = bracketStateSnap.exists
    ? bracketStateSnap.data()
    : { ro16Teams: {}, winners: {} };

  const entries = buildLeaderboardEntries({
    profilesById,
    predictionsById,
    bracketPredictionsById,
    results,
    bracketState,
  });
  entries.sort((a, b) => b.points - a.points);

  await db.doc("leaderboardCache/current").set({ entries, computedAt: Date.now() });

  // Rank snapshots (GREAT_LEAP_SPEC.md §7.1): only written once a real
  // matchday is set (tournamentState/current.currentMatchday, hand-bumped
  // — §1.2, no admin UI). Scoring-agnostic on purpose: this just snapshots
  // whatever `points` each entry already has above, so combined league +
  // bracket scoring flows through automatically.
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

exports.recomputeLeaderboardOnBracketPrediction = onDocumentWritten("bracketPredictions/{uid}", async () => {
  await recomputeLeaderboard();
});

exports.isPickCorrect = isPickCorrect;
exports.computeScore = computeScore;
exports.assignRanks = assignRanks;
exports.buildRankSnapshotEntries = buildRankSnapshotEntries;
exports.rankSnapshotDocId = rankSnapshotDocId;
exports.computeBracketScore = computeBracketScore;
exports.buildLeaderboardEntries = buildLeaderboardEntries;
