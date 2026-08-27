// One-off pre-launch cleanup: removes every trace of development seed data and
// test content from the *production* Firestore, leaving a genuinely empty site
// for launch day (2026-08-28, `notstarted` phase).
//
// Authenticates as the active `gcloud` user over the Firestore REST API, the
// same pattern as every other script here. That is an IAM-authenticated call,
// so it bypasses security rules — which is the point: `surveyResponses` sets
// `allow update, delete: if false`, and loosening that rule just to clean up
// would be strictly worse than doing it server-side.
//
// What it removes and why (verified against production 2026-08-27):
//   profiles/publicProfiles/predictions/surveyResponses  50 seeded dummies plus
//       Mert's own 3 test accounts — he asked for a clean slate and will sign
//       up again as a real participant.
//   results          36 synthetic standings from dev-panel testing (every win
//                    1-0, every draw 0-0; the table is not even internally
//                    consistent).
//   devMatches       all 16 Matchday 1 fixtures marked decided.
//   leaderboardCache the stale 52-entry cache and its concurrency-control doc.
//   forumPosts/messages/knockoutPredictions/lobbyInvites/lobbies  test content;
//                    the invites were all expired and pointed at lobbies that
//                    had already been deleted.
//   postLikes        the pre-2026-07-31 like model, replaced by `likedByUids`
//                    on the post doc. No code reads it.
//   presence         Firestore leftovers from before presence moved to RTDB.
//                    No code reads it.
//   bracketState     orphaned hardcoded R16 pairings. No code reference and no
//                    security rule at all, so it was already unreachable.
//
// Deliberately KEPT: `devConfig/state`, which is dev-panel-only state that
// production never reads.
//
// Ordering matters. Predictions and results are deleted first so the leaderboard
// Cloud Function triggers fire and settle against empty inputs; the cache is
// deleted last. The 5-minute safety net will legitimately recreate
// `leaderboardCache/current` as `{entries: [], computedAt}` — that is the
// correct post-clean state, not a failure of this script.
//
// Usage:
//   node scripts/purge-dev-data.mjs            # dry run, prints what it would do
//   node scripts/purge-dev-data.mjs --confirm  # actually deletes

import { execSync } from "node:child_process";

const PROJECT_ID = "kupatakipucl";
const ROOT = `projects/${PROJECT_ID}/databases/(default)/documents`;
const BASE = `https://firestore.googleapis.com/v1/${ROOT}`;
const CONFIRM = process.argv.includes("--confirm");

// Deleted first so the leaderboard triggers recompute against empty inputs
// before the cache doc itself goes.
const FIRST = ["predictions", "results"];
const THEN = [
  "profiles",
  "publicProfiles",
  "surveyResponses",
  "devMatches",
  "forumPosts",
  "messages",
  "knockoutPredictions",
  "lobbyInvites",
  "lobbies",
  "postLikes",
  "presence",
  "bracketState",
];
// Last, after the functions have settled.
const LAST = ["leaderboardCache"];

const token = execSync("gcloud auth print-access-token").toString().trim();
const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function listDocPaths(collection) {
  const paths = [];
  let pageToken;
  do {
    const url = new URL(`${BASE}/${collection}`);
    url.searchParams.set("pageSize", "300");
    // We only need names, so ask for no fields at all.
    url.searchParams.append("mask.fieldPaths", "__name__");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: auth });
    if (!res.ok) throw new Error(`list ${collection}: ${res.status} ${await res.text()}`);
    const json = await res.json();
    (json.documents ?? []).forEach((d) => paths.push(d.name));
    pageToken = json.nextPageToken;
  } while (pageToken);
  return paths;
}

async function listSubcollections(docPath) {
  const relative = docPath.split("/documents/")[1];
  const res = await fetch(`${BASE}/${relative}:listCollectionIds`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ pageSize: 300 }),
  });
  if (!res.ok) throw new Error(`listCollectionIds ${relative}: ${res.status} ${await res.text()}`);
  return ((await res.json()).collectionIds ?? []).map((id) => `${relative}/${id}`);
}

// Firestore commits accept at most 500 writes.
async function deletePaths(paths) {
  for (let i = 0; i < paths.length; i += 400) {
    const chunk = paths.slice(i, i + 400);
    const res = await fetch(`https://firestore.googleapis.com/v1/${ROOT}:commit`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ writes: chunk.map((name) => ({ delete: name })) }),
    });
    if (!res.ok) throw new Error(`commit: ${res.status} ${await res.text()}`);
  }
}

// Depth-first: a document's subcollections are not deleted with it, so they
// have to be walked explicitly or they become permanently unreachable orphans.
async function purge(collection, indent = "") {
  const paths = await listDocPaths(collection);
  if (paths.length === 0) {
    console.log(`${indent}${collection}: empty`);
    return 0;
  }
  let total = 0;
  for (const path of paths) {
    for (const sub of await listSubcollections(path)) {
      total += await purge(sub, indent + "  ");
    }
  }
  console.log(`${indent}${collection}: ${paths.length} docs${CONFIRM ? " — deleting" : " — would delete"}`);
  if (CONFIRM) await deletePaths(paths);
  return total + paths.length;
}

async function main() {
  if (!CONFIRM) {
    console.log("DRY RUN — nothing will be deleted. Pass --confirm to execute.\n");
  }
  let total = 0;

  console.log("Phase 1 — prediction/result inputs (lets the leaderboard triggers settle):");
  for (const c of FIRST) total += await purge(c);

  console.log("\nPhase 2 — participants and content:");
  for (const c of THEN) total += await purge(c);

  if (CONFIRM) {
    console.log("\nWaiting 45s for the leaderboard recompute to settle before clearing its cache…");
    await new Promise((r) => setTimeout(r, 45_000));
  }

  console.log("\nPhase 3 — leaderboard cache:");
  for (const c of LAST) total += await purge(c);

  console.log(`\n${CONFIRM ? "Deleted" : "Would delete"} ${total} documents.`);
  console.log("Kept: devConfig/state (dev-panel-only; production never reads it).");
  if (CONFIRM) {
    console.log(
      "\nNote: the 5-minute safety net will recreate leaderboardCache/current as\n" +
        "{entries: [], computedAt} — that is the correct empty state.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
