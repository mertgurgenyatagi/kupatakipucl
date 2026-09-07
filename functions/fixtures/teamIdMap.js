// Maps football-data.org's numeric team ids (competition CL, 2026-27 league
// phase) to this app's team slugs in src/predictions/teams.ts. Built by hand
// against a live /v4/competitions/CL/standings response on 2026-09-07 — there
// is no shared identifier between the two systems, so this table is the only
// thing keeping them in sync. teamIdMap.test.js asserts it covers all 36 teams
// exactly once in both directions.
const TEAM_ID_MAP = {
  1899: "aek-athens",
  57: "arsenal",
  58: "aston-villa",
  78: "atletico-madrid",
  81: "barcelona",
  5: "bayern-munich",
  5721: "bodo-glimt",
  4: "borussia-dortmund",
  851: "club-brugge",
  7397: "como",
  613: "fenerbahce",
  675: "feyenoord",
  610: "galatasaray",
  108: "inter-milan",
  2016: "lask",
  546: "lens",
  521: "lille",
  64: "liverpool",
  65: "manchester-city",
  66: "manchester-united",
  113: "napoli",
  524: "paris-saint-germain",
  503: "porto",
  674: "psv-eindhoven",
  721: "rb-leipzig",
  90: "real-betis",
  86: "real-madrid",
  100: "roma",
  10233: "sabah",
  1887: "shakhtar-donetsk",
  930: "slavia-prague",
  7509: "slovan-bratislava",
  498: "sporting-cp",
  10: "stuttgart",
  5720: "viking",
  94: "villarreal",
};

module.exports = { TEAM_ID_MAP };
