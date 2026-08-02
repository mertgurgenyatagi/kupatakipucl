// One-off migration: populates the new `publicProfiles` collection (2026-08-02
// name-privacy change — see docs/superpowers/specs/2026-08-02-forum-logged-out-
// and-name-privacy-design.md) from every existing `profiles/{uid}` doc, mirroring
// only the fields a logged-out visitor is now allowed to see (firstName,
// photoURL, createdAt — never lastName). Authenticated as the currently active
// `gcloud` user, same REST pattern as scripts/seed-dummy-participants.mjs.
//
// Must run (together with deploying the updated firestore.rules) before any
// client build that depends on `publicProfiles` existing ships — otherwise
// logged-out visitors see empty participant lists until it does.
//
// Usage: node scripts/backfill-public-profiles.mjs

import { execSync } from "node:child_process";

const PROJECT_ID = "kupatakipucl";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const PAGE_SIZE = 100;

function toFirestoreValue(value) {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") return { integerValue: String(Math.trunc(value)) };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toFirestoreValue) } };
  }
  throw new Error(`Unsupported field type: ${typeof value}`);
}

function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    fields[key] = toFirestoreValue(value);
  }
  return { fields };
}

function fromFirestoreValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  throw new Error(`Unsupported Firestore value shape: ${JSON.stringify(value)}`);
}

function fromFirestoreFields(fields) {
  const obj = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    obj[key] = fromFirestoreValue(value);
  }
  return obj;
}

function docIdFromName(name) {
  return name.split("/").pop();
}

async function writeDoc(accessToken, collection, docId, data) {
  const url = `${BASE_URL}/${collection}/${docId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toFirestoreFields(data)),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to write ${collection}/${docId}: ${res.status} ${body}`);
  }
}

async function listAllDocs(accessToken, collection) {
  const docs = [];
  let pageToken;
  do {
    const url = new URL(`${BASE_URL}/${collection}`);
    url.searchParams.set("pageSize", String(PAGE_SIZE));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to list ${collection}: ${res.status} ${body}`);
    }
    const body = await res.json();
    for (const doc of body.documents ?? []) {
      docs.push({ id: docIdFromName(doc.name), fields: fromFirestoreFields(doc.fields) });
    }
    pageToken = body.nextPageToken;
  } while (pageToken);
  return docs;
}

async function main() {
  let accessToken;
  try {
    accessToken = execSync("gcloud auth print-access-token").toString().trim();
  } catch (err) {
    console.error("Failed to obtain a gcloud access token — is gcloud installed and authenticated?");
    throw err;
  }

  const profiles = await listAllDocs(accessToken, "profiles");
  console.log(`Found ${profiles.length} profiles to backfill.`);

  let count = 0;
  for (const { id, fields } of profiles) {
    await writeDoc(accessToken, "publicProfiles", id, {
      firstName: fields.firstName,
      photoURL: fields.photoURL,
      createdAt: fields.createdAt,
    });
    count += 1;
    console.log(`Backfilled ${count}/${profiles.length} public profiles (${id}: ${fields.firstName})`);
  }

  console.log(`Done: ${count} public profiles backfilled.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
