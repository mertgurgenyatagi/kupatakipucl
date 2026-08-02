// Reusable dev-panel remote control: flips devConfig/state directly via the
// Firestore REST API (same auth approach as seed-dummy-participants.mjs —
// the active gcloud user's access token, no service account key needed).
// Lets Claude switch the tournament phase or the fake login state without
// touching the browser UI; useDevConfig's onSnapshot picks the change up live.
//
// Usage:
//   node scripts/set-dev-config.mjs phase notstarted   (force pre-tournament)
//   node scripts/set-dev-config.mjs phase leaguephase  (force league phase)
//   node scripts/set-dev-config.mjs phase preknockout  (force pre-knockout)
//   node scripts/set-dev-config.mjs phase knockout     (force knockout)
//   node scripts/set-dev-config.mjs phase auto         (clear override, back to real tournamentState/current)
//   node scripts/set-dev-config.mjs login in           (force signed-in as the dev fake uid)
//   node scripts/set-dev-config.mjs login out          (force signed-out)
//   node scripts/set-dev-config.mjs login auto          (clear override, back to real Firebase Auth session)
//   node scripts/set-dev-config.mjs date 2026-11-05    (custom current-date readout — display only, see DevPanel.tsx)
//   node scripts/set-dev-config.mjs date auto          (clear override)

import { execSync } from "node:child_process";

const PROJECT_ID = "kupatakipucl";
const DOC_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/devConfig/state`;

const PHASES = ["notstarted", "leaguephase", "preknockout", "knockout"];

const FIELDS = {
  phase: {
    firestoreField: "phaseOverride",
    values: { ...Object.fromEntries(PHASES.map((p) => [p, p])), auto: null },
  },
  login: { firestoreField: "loggedInOverride", values: { in: true, out: false, auto: null } },
  date: { firestoreField: "currentDateOverride" },
};

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "string") return { stringValue: value };
  throw new Error(`Unsupported field type: ${typeof value}`);
}

async function main() {
  const [field, rawValue] = process.argv.slice(2);
  const spec = FIELDS[field];
  if (!spec || rawValue === undefined) {
    console.error("Usage: node scripts/set-dev-config.mjs <phase|login|date> <value>");
    console.error(`  phase: ${PHASES.join(" | ")} | auto`);
    console.error("  login: in | out | auto");
    console.error("  date: YYYY-MM-DD | auto");
    process.exit(1);
  }

  let value;
  if (spec.values) {
    if (!(rawValue in spec.values)) {
      console.error(`${field} value must be one of: ${Object.keys(spec.values).join(", ")}`);
      process.exit(1);
    }
    value = spec.values[rawValue];
  } else {
    value = rawValue === "auto" ? null : rawValue;
  }

  const accessToken = execSync("gcloud auth print-access-token").toString().trim();
  const url = `${DOC_URL}?updateMask.fieldPaths=${spec.firestoreField}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: { [spec.firestoreField]: toFirestoreValue(value) } }),
  });

  if (!res.ok) {
    console.error(`Failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }

  console.log(`${spec.firestoreField} set to ${JSON.stringify(value)} (${rawValue})`);
}

main();
