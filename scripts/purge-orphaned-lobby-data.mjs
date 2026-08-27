// Removes documents stranded under lobbies that no longer exist.
//
// Firestore subcollections are independent of their parent: deleting
// `lobbies/{id}` does nothing to `lobbies/{id}/messages/*`. Those documents
// survive with no parent, unreachable from the app (no lobby doc means no
// lobby in the UI) but still stored, still billed, and still holding whatever
// people wrote in that chat.
//
// Two bugs produced them, both fixed on 2026-08-27:
//   - `deleteLobby.ts` deleted members and the lobby doc but never the
//     messages — it could not, because firestore.rules had
//     `allow delete: if false` on lobby messages.
//   - `leaveLobby.ts`'s last-member-out branch bypassed deleteLobby entirely
//     and deleted the two documents by hand.
//
// The delete cascade is now correct and covered by tests, so this script is
// for the backlog that predates the fix. It is safe to re-run: a lobby whose
// parent document exists is never touched.
//
// Found on production 2026-08-27: 5 phantom lobbies holding 8 messages.
//
// Authenticates as the active `gcloud` user over the Firestore REST API — the
// same pattern as every other script here, and IAM-authenticated, so it
// bypasses security rules.
//
// Usage:
//   node scripts/purge-orphaned-lobby-data.mjs            # dry run
//   node scripts/purge-orphaned-lobby-data.mjs --confirm  # actually deletes

import { execSync } from "node:child_process";

const PROJECT_ID = "kupatakipucl";
const ROOT = `projects/${PROJECT_ID}/databases/(default)/documents`;
const BASE = `https://firestore.googleapis.com/v1/${ROOT}`;
const CONFIRM = process.argv.includes("--confirm");

const token = execSync("gcloud auth print-access-token").toString().trim();
const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

/**
 * `showMissing=true` is the whole trick. Without it the REST API returns only
 * real documents, so a phantom parent — an id that exists purely because
 * something lives beneath it — is invisible and the orphans stay hidden. With
 * it, those ids come back carrying no `fields` and no `createTime`, which is
 * exactly how they are told apart from live lobbies.
 */
async function listLobbyIds() {
  const out = [];
  let pageToken = "";
  do {
    const url = `${BASE}/lobbies?pageSize=300&showMissing=true&mask.fieldPaths=__name__${
      pageToken ? `&pageToken=${pageToken}` : ""
    }`;
    const res = await fetch(url, { headers: auth });
    if (!res.ok) throw new Error(`list lobbies failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    for (const d of body.documents ?? []) {
      out.push({ id: d.name.split("/").pop(), phantom: !d.createTime });
    }
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

async function listSubcollections(lobbyId) {
  const res = await fetch(`${BASE}/lobbies/${lobbyId}:listCollectionIds`, {
    method: "POST",
    headers: auth,
    body: "{}",
  });
  if (!res.ok) throw new Error(`listCollectionIds failed: ${res.status} ${await res.text()}`);
  return (await res.json()).collectionIds ?? [];
}

async function listDocNames(lobbyId, sub) {
  const out = [];
  let pageToken = "";
  do {
    const url = `${BASE}/lobbies/${lobbyId}/${sub}?pageSize=300&mask.fieldPaths=__name__${
      pageToken ? `&pageToken=${pageToken}` : ""
    }`;
    const res = await fetch(url, { headers: auth });
    if (!res.ok) throw new Error(`list ${sub} failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    for (const d of body.documents ?? []) out.push(d.name);
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);
  return out;
}

async function deleteDocs(names) {
  // 500 writes per commit is the Firestore ceiling. The rules-access budget
  // that forces deleteLobby.ts to chunk at 15 does not apply here: this is an
  // IAM-authenticated call and rules are not evaluated at all.
  for (let i = 0; i < names.length; i += 500) {
    const writes = names.slice(i, i + 500).map((name) => ({ delete: name }));
    const res = await fetch(`https://firestore.googleapis.com/v1/${ROOT}:commit`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ writes }),
    });
    if (!res.ok) throw new Error(`commit failed: ${res.status} ${await res.text()}`);
  }
}

async function main() {
  if (!CONFIRM) console.log("DRY RUN — nothing will be deleted. Pass --confirm to execute.\n");

  const lobbies = await listLobbyIds();
  const live = lobbies.filter((l) => !l.phantom);
  const phantoms = lobbies.filter((l) => l.phantom);

  console.log(`lobbies: ${live.length} live, ${phantoms.length} orphaned\n`);

  let total = 0;
  for (const { id } of phantoms) {
    const subs = await listSubcollections(id);
    for (const sub of subs) {
      const names = await listDocNames(id, sub);
      if (names.length === 0) continue;
      total += names.length;
      console.log(`  lobbies/${id}/${sub}: ${names.length} document(s)`);
      if (CONFIRM) await deleteDocs(names);
    }
  }

  console.log(`\n${CONFIRM ? "Deleted" : "Would delete"} ${total} orphaned document(s).`);
  if (!CONFIRM && total > 0) console.log("Re-run with --confirm to execute.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
