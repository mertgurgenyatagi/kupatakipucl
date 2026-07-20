// Reusable dev-panel remote control: flips devConfig/state directly via the
// Firestore REST API (same auth approach as seed-dummy-participants.mjs —
// the active gcloud user's access token, no service account key needed).
// Lets Claude switch tournament phase (NST vs ST) without touching the
// browser UI; useDevConfig's onSnapshot picks the change up live.
//
// Usage:
//   node scripts/set-dev-config.mjs tournament post   (force tournament started)
//   node scripts/set-dev-config.mjs tournament pre    (force not started)
//   node scripts/set-dev-config.mjs tournament auto   (clear override, back to real/debugDate logic)
//   node scripts/set-dev-config.mjs date 2026-11-05    (custom current-date readout)
//   node scripts/set-dev-config.mjs date auto          (clear override)

import { execSync } from "node:child_process";

const PROJECT_ID = "kupatakipucl";
const DOC_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/devConfig/state`;

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "string") return { stringValue: value };
  throw new Error(`Unsupported field type: ${typeof value}`);
}

async function main() {
  const [field, rawValue] = process.argv.slice(2);
  if (!["tournament", "date"].includes(field) || rawValue === undefined) {
    console.error("Usage: node scripts/set-dev-config.mjs <tournament|date> <post|pre|auto|YYYY-MM-DD>");
    process.exit(1);
  }

  let tournamentActive;
  let currentDateOverride;

  if (field === "tournament") {
    if (!["post", "pre", "auto"].includes(rawValue)) {
      console.error("tournament value must be post, pre, or auto");
      process.exit(1);
    }
    tournamentActive = rawValue === "auto" ? null : rawValue === "post";
  } else {
    currentDateOverride = rawValue === "auto" ? null : rawValue;
  }

  const accessToken = execSync("gcloud auth print-access-token").toString().trim();

  const fieldName = field === "tournament" ? "tournamentActive" : "currentDateOverride";
  const fieldsToSend = {
    [fieldName]: toFirestoreValue(field === "tournament" ? tournamentActive : currentDateOverride),
  };
  const url = `${DOC_URL}?updateMask.fieldPaths=${fieldName}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: fieldsToSend }),
  });

  if (!res.ok) {
    console.error(`Failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  console.log(
    field === "tournament"
      ? `tournamentActive set to ${JSON.stringify(tournamentActive)} (${rawValue})`
      : `currentDateOverride set to ${JSON.stringify(currentDateOverride)}`
  );
}

main();
