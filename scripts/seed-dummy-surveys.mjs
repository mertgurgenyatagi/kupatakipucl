// One-off dev-panel helper: seeds `surveyResponses/{uid}` for the 50 dummy
// participants (see seed-dummy-participants.mjs, which only wrote profiles +
// predictions, not survey answers) — needed now that the participant popup
// shows quiz answers per-participant (see ParticipantPopup.tsx). Same
// REST-via-gcloud-token pattern, safe pre-launch, deterministic per uid so
// re-running just overwrites the same 50 docs.
//
// Usage: node scripts/seed-dummy-surveys.mjs

import { execSync } from "node:child_process";

const PROJECT_ID = "kupatakipucl";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Must match SurveyForm.tsx's SUPER_LIG_TEAMS exactly — this is a fixed
// dropdown in the real form, not free text, so seeding an option the form
// doesn't actually offer produces data the real app could never generate.
const SUPER_LIG_TEAMS = [
  "Galatasaray",
  "Fenerbahçe",
  "Beşiktaş",
  "Trabzonspor",
  "Anadolu takımı",
  "Yok",
];

// Free text ("varsa yazın") — the one field with real room for nonsense.
const UCL_TEAM_ANSWERS = [
  "Real Madrid, acı çekmeyi seviyorum",
  "Yok, kalbimi kimseye kaptırmadım",
  "UCL'de Fenerbahçe'yi tutuyorum, kusura bakmasın millet",
  "Chelsea, her sezon farklı takım gibi zaten",
  "Barcelona (sadece Messi döneminde geçerli)",
  "PSG, para kazanamayan tek zengin takım",
  "Liverpool, YNWA falan filan",
  "Bayern Münih, zaten hep onlar kazanıyor, kolay taraf",
  "Arsenal, her sene 'bu sene olur' diyorum",
  "Napoli, Diego abim için",
  "Inter, komşuya inat",
  "Villarreal, kimse beklemiyor diye tutuyorum",
  "Yok, sadece acı çekmek istiyorum köşemde",
  "Manchester City, parayla mutluluk alınırmış meğer",
  "Atletico Madrid, kazanamasam da sinir küpü severim",
  "Dortmund, sarı duvar aşkına",
  "Juventus, siyah-beyaz kalbim",
  "Benfica, sadece ismi güzel diye",
  "Monaco, vergi cenneti taktik cenneti",
  "Kimseyi tutmuyorum, tarafsız acı çekiyorum",
  "Union Saint-Gilloise, ismini bilen yok, ben biliyorum",
  "Qarabağ, az bilinen ama kalbimde taht kuran",
  "Sporting, Ronaldo'nun evi diye",
  "Newcastle, Suudi parası ama olsun",
  "Bodø/Glimt, Kuzey Kutbu takımı gibi geliyor",
  "Slavia Prag, adı güzel diye tuttum",
  "Kairat Almaty, Kazakistan'ın gururu (galiba)",
  "Hiçbiri, ben sadece kendi takımımı severim, ihanet etmem",
  "Hepsi, kimseye bağlı değilim, hovarda taraftarım",
  null,
];

const FUNNY_AGES = [7, 99, 8, 150, 12, 250, 3, 77, 45, 61, 200, 19, 500, 33, 9, 41, 68];

const MESSI_RONALDO = ["messi", "ronaldo", "no-opinion"];
const DEVICES = ["phone", "desktop", "both"];

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "number") return { integerValue: String(Math.trunc(value)) };
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

    // Skewed toward the extremes (1 or 7) — either wildly overconfident or
    // performatively humble, funnier than a bell curve of 4s.
    const footballKnowledge = i % 3 === 0 ? 1 : i % 3 === 1 ? 7 : ((i * 5) % 7) + 1;

    const response = {
      age: FUNNY_AGES[i % FUNNY_AGES.length],
      footballKnowledge,
      messiOrRonaldo: MESSI_RONALDO[i % MESSI_RONALDO.length],
      superLigTeam: SUPER_LIG_TEAMS[(i * 3) % SUPER_LIG_TEAMS.length],
      uclTeam: UCL_TEAM_ANSWERS[(i * 7) % UCL_TEAM_ANSWERS.length],
      device: DEVICES[i % DEVICES.length],
      submittedAt: now,
    };

    await writeDoc(accessToken, "surveyResponses", uid, response);
    console.log(`Seeded survey for ${uid}: age ${response.age}, "${response.uclTeam}"`);
  }

  console.log("Done: 50 dummy survey responses seeded.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
