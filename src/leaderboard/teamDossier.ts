import { StatRow } from "./StatWidget";

/**
 * Dummy squad data — manager, starting XI, and the three ranked lists (top
 * scorers / top assisters / top rated). No player-level data source exists
 * or is wired yet (Mert, explicit: "there is no existing API for football
 * data wired right now... just do dummy data" — and later, on this exact
 * squad content: "don't waste time on that stuff, use solid colors").
 * Deterministic per team (a seeded PRNG, not `Math.random()`) so a team's
 * dossier doesn't reshuffle on every render/reload — same stability
 * precedent as teams.ts's own hash-assigned crests.
 *
 * The three ranked lists reuse StatWidget.tsx's own row shape (`StatRow`:
 * name/value/fill) — that component is the shelved "best players by
 * rating / top scorers / top assisters" widget from the original leaderboard
 * brief (built, then set aside when the hero carousel took its spot on that
 * page). Same solid-color-fill-avatar idea, just populated per-team here
 * instead of from one fixed global list.
 */

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** mulberry32 — small, seedable, no dependency. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Lucas", "Mateo", "Kevin", "Bruno", "Erik", "Noah", "Yusuf", "Diego",
  "Marco", "Tomás", "Adama", "Rafael", "Jonas", "Milan", "Igor", "Pedro",
  "Emre", "Viktor", "Hugo", "Nikola", "Amadou", "Sven", "Leandro", "Anders",
];
const LAST_NAMES = [
  "Silva", "Nowak", "Bakker", "Rossi", "Larsen", "Öztürk", "Petrov", "Diallo",
  "Hansen", "Moreira", "Kowalski", "García", "Weber", "Novak", "Costa", "Berg",
  "Yıldız", "Dubois", "Andersson", "Kovač", "N'Diaye", "Fischer", "Santos", "Vidal",
];

const FORMATIONS: { label: string; lines: number[] }[] = [
  { label: "4-3-3", lines: [4, 3, 3] },
  { label: "4-2-3-1", lines: [4, 2, 3, 1] },
  { label: "4-4-2", lines: [4, 4, 2] },
  { label: "3-5-2", lines: [3, 5, 2] },
  { label: "3-4-3", lines: [3, 4, 3] },
];

// Matches StatWidget.tsx's own fixed 3-row fill pattern exactly.
const ROW_FILLS = ["bg-navy", "bg-silver", "bg-brass"];

export interface DossierPlayer {
  name: string;
  /** 0 = goalkeeper, 1..N = outfield lines back-to-front, matching the
   *  formation's own `lines` grouping. */
  line: number;
}

export interface TeamDossier {
  manager: string;
  formation: string;
  startingXI: DossierPlayer[];
  topScorers: StatRow[];
  topAssisters: StatRow[];
  topRated: StatRow[];
}

function randomName(rand: () => number): string {
  const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

/** 3 descending integers, so a dummy ranked list still reads top-to-bottom. */
function descendingInts(rand: () => number, min: number, max: number): number[] {
  let current = min + Math.floor(rand() * (max - min + 1));
  return [0, 1, 2].map((i) => {
    if (i > 0) current = Math.max(1, current - (1 + Math.floor(rand() * 3)));
    return current;
  });
}

function statRows(rand: () => number, values: number[], format: (n: number) => string): StatRow[] {
  return values.map((value, i) => ({
    name: randomName(rand),
    value: format(value),
    fill: ROW_FILLS[i],
  }));
}

export function getTeamDossier(teamId: string): TeamDossier {
  const rand = mulberry32(hashString(teamId));

  const manager = randomName(rand);
  const formation = FORMATIONS[Math.floor(rand() * FORMATIONS.length)];

  const startingXI: DossierPlayer[] = [{ name: randomName(rand), line: 0 }];
  formation.lines.forEach((count, lineIndex) => {
    for (let i = 0; i < count; i++) {
      startingXI.push({ name: randomName(rand), line: lineIndex + 1 });
    }
  });

  const topScorers = statRows(rand, descendingInts(rand, 6, 16), String);
  const topAssisters = statRows(rand, descendingInts(rand, 4, 11), String);
  // Ratings as descending tenths (e.g. 78 -> "7.8"), 1-10 scale.
  const topRated = statRows(rand, descendingInts(rand, 68, 92), (n) => (n / 10).toFixed(1));

  return { manager, formation: formation.label, startingXI, topScorers, topAssisters, topRated };
}
