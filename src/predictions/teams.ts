import { CLUB_BADGE_SLUGS } from "./clubBadgeSlugs";

export interface Team {
  id: string;
  name: string;
  /** A short, distinct code for width-constrained displays — the team
   *  table's compact columns (Mert: "abbreviate team names... you can even
   *  use three letters. I don't want to scroll horizontally"). Common
   *  broadcast-style codes where one exists (BVB, PSG, PSV, GS); otherwise
   *  a plain first-three-letters reading, hand-checked for no collisions
   *  (Bayern vs Bayer being the obvious trap). */
  shortName: string;
}

/**
 * Crest source: real club badge SVGs for next season's confirmed UCL clubs
 * (public/club-badges/, see clubBadgeSlugs.ts), randomly but *stably*
 * assigned to this placeholder team list — Mert: "just randomly assign
 * them to teams, since the whole team list will be totally replaced
 * anyway." A hash of `id` picks the badge so the same team always renders
 * the same crest across re-renders/reloads instead of reshuffling.
 */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function teamCrestSrc(id: string): string {
  const slug = CLUB_BADGE_SLUGS[hashString(id) % CLUB_BADGE_SLUGS.length];
  return `/club-badges/${slug}.svg`;
}

export const TEAMS: Team[] = [
  { id: "ajax", name: "Ajax", shortName: "AJA" },
  { id: "arsenal", name: "Arsenal", shortName: "ARS" },
  { id: "atalanta", name: "Atalanta", shortName: "ATA" },
  { id: "athletic-club", name: "Athletic Club", shortName: "ATH" },
  { id: "atletico-madrid", name: "Atlético Madrid", shortName: "ATM" },
  { id: "barcelona", name: "Barcelona", shortName: "BAR" },
  { id: "bayer-leverkusen", name: "Bayer Leverkusen", shortName: "LEV" },
  { id: "bayern-munich", name: "Bayern Munich", shortName: "BAY" },
  { id: "benfica", name: "Benfica", shortName: "BEN" },
  { id: "bodo-glimt", name: "Bodø/Glimt", shortName: "BOD" },
  { id: "borussia-dortmund", name: "Borussia Dortmund", shortName: "BVB" },
  { id: "chelsea", name: "Chelsea", shortName: "CHE" },
  { id: "club-brugge", name: "Club Brugge", shortName: "CLB" },
  { id: "copenhagen", name: "Copenhagen", shortName: "COP" },
  { id: "eintracht-frankfurt", name: "Eintracht Frankfurt", shortName: "FRA" },
  { id: "galatasaray", name: "Galatasaray", shortName: "GS" },
  { id: "inter-milan", name: "Inter Milan", shortName: "INT" },
  { id: "juventus", name: "Juventus", shortName: "JUV" },
  { id: "kairat-almaty", name: "Kairat Almaty", shortName: "KAI" },
  { id: "liverpool", name: "Liverpool", shortName: "LIV" },
  { id: "manchester-city", name: "Manchester City", shortName: "MCI" },
  { id: "marseille", name: "Marseille", shortName: "MAR" },
  { id: "monaco", name: "Monaco", shortName: "MON" },
  { id: "napoli", name: "Napoli", shortName: "NAP" },
  { id: "newcastle-united", name: "Newcastle United", shortName: "NEW" },
  { id: "olympiacos", name: "Olympiacos", shortName: "OLY" },
  { id: "pafos", name: "Pafos", shortName: "PAF" },
  { id: "paris-saint-germain", name: "Paris Saint-Germain", shortName: "PSG" },
  { id: "psv-eindhoven", name: "PSV Eindhoven", shortName: "PSV" },
  { id: "qarabag", name: "Qarabağ", shortName: "QAR" },
  { id: "real-madrid", name: "Real Madrid", shortName: "RMA" },
  { id: "slavia-prague", name: "Slavia Prague", shortName: "SLA" },
  { id: "sporting-cp", name: "Sporting CP", shortName: "SCP" },
  { id: "tottenham-hotspur", name: "Tottenham Hotspur", shortName: "TOT" },
  { id: "union-saint-gilloise", name: "Union Saint-Gilloise", shortName: "USG" },
  { id: "villarreal", name: "Villarreal", shortName: "VIL" },
];

export const TEAM_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t])
);
