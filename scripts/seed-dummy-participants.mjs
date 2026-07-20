// One-off dev-panel helper: seeds 50 synthetic participants (profiles +
// predictions) directly into the real Firestore collections via REST,
// authenticated as the currently active `gcloud` user. Safe pre-launch
// (no real users on the site yet) — see firestore.rules comments on the
// devpanel/results write model for the same reasoning.
//
// Usage: node scripts/seed-dummy-participants.mjs

import { execSync } from "node:child_process";

const PROJECT_ID = "kupatakipucl";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const TEAM_IDS = [
  "ajax", "arsenal", "atalanta", "athletic-club", "atletico-madrid", "barcelona",
  "bayer-leverkusen", "bayern-munich", "benfica", "bodo-glimt", "borussia-dortmund",
  "chelsea", "club-brugge", "copenhagen", "eintracht-frankfurt", "galatasaray",
  "inter-milan", "juventus", "kairat-almaty", "liverpool", "manchester-city",
  "marseille", "monaco", "napoli", "newcastle-united", "olympiacos", "pafos",
  "paris-saint-germain", "psv-eindhoven", "qarabag", "real-madrid", "slavia-prague",
  "sporting-cp", "tottenham-hotspur", "union-saint-gilloise", "villarreal",
];

const FIRST_NAMES = [
  "Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Hasan", "İbrahim", "Emre",
  "Burak", "Cem", "Deniz", "Kaan", "Onur", "Serkan", "Tolga", "Uğur",
  "Ayşe", "Fatma", "Zeynep", "Elif", "Merve", "Selin", "Buse", "Ceren",
  "Derya", "Ebru", "Gizem", "İpek", "Nilay", "Pınar", "Sevgi", "Yasemin",
];

const LAST_NAMES = [
  "Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Yıldız", "Aydın", "Öztürk",
  "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt",
  "Özdemir", "Şimşek", "Polat", "Erdoğan",
];

function seededShuffle(array, seed) {
  const result = [...array];
  let state = seed;
  const nextRandom = () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

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

async function main() {
  const accessToken = execSync("gcloud auth print-access-token").toString().trim();
  const now = Date.now();

  for (let i = 1; i <= 50; i++) {
    const uid = `dummy-${String(i).padStart(3, "0")}`;
    const firstName = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i - 1) % LAST_NAMES.length];
    const ranking = seededShuffle(TEAM_IDS, i * 7919 + 13);

    await writeDoc(accessToken, "profiles", uid, {
      firstName,
      lastName,
      photoURL: `https://i.pravatar.cc/150?u=${uid}`,
      createdAt: now,
    });

    await writeDoc(accessToken, "predictions", uid, {
      ranking,
      submittedAt: now,
      updatedAt: now,
    });

    console.log(`Seeded ${uid}: ${firstName} ${lastName}`);
  }

  console.log("Done: 50 dummy participants seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
