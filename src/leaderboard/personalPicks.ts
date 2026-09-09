import { RealFixture } from "./realFixtureTypes";

/** The one account this whole module exists for. Not a Firestore admin
 *  check (nothing here is written anywhere, and the underlying fixtures/
 *  results are public) — just gates who sees the picks tint on the Matches
 *  page. */
const PERSONAL_PICKS_EMAIL = "thisisfootballstuff@gmail.com";

export function isPersonalPicksViewer(email: string | null | undefined): boolean {
  return email === PERSONAL_PICKS_EMAIL;
}

export type PickOutcome = "home" | "away" | "draw";

function pickKey(homeTeamId: string, awayTeamId: string): string {
  return `${homeTeamId}:${awayTeamId}`;
}

/**
 * Mert's own match-by-match picks for the 2026-27 league phase, made before
 * a ball was kicked (submitted 2026-09-09). Keyed by
 * `${homeTeamId}:${awayTeamId}` rather than a fixture id — football-data.org
 * mints those at sync time (footballData.js), so there was nothing stable to
 * key on ahead of the season — and that pair is unique across the whole
 * league phase: each team meets 8 different opponents, home/away fixed by
 * the draw, never repeated. Covers all 144 league-phase fixtures.
 */
export const PERSONAL_PICKS: Record<string, PickOutcome> = {
  "atletico-madrid:viking": "home",
  "liverpool:porto": "home",
  "manchester-city:napoli": "home",
  "lens:bodo-glimt": "away",
  "lask:fenerbahce": "away",
  "como:manchester-united": "away",
  "sabah:napoli": "away",
  "atletico-madrid:bayern-munich": "away",
  "lask:slovan-bratislava": "home",
  "shakhtar-donetsk:sporting-cp": "away",
  "aston-villa:viking": "home",
  "roma:sporting-cp": "home",
  "real-betis:porto": "away",
  "sabah:barcelona": "away",
  "atletico-madrid:manchester-united": "home",
  "lask:liverpool": "away",
  "porto:manchester-city": "away",
  "sporting-cp:lask": "home",
  "viking:psv-eindhoven": "away",
  "club-brugge:liverpool": "away",
  "inter-milan:club-brugge": "home",
  "manchester-city:sporting-cp": "home",
  "feyenoord:como": "draw",
  "bayern-munich:slavia-prague": "home",
  "lens:sporting-cp": "away",
  "stuttgart:viking": "home",
  "barcelona:como": "home",
  "shakhtar-donetsk:real-madrid": "away",
  "aek-athens:real-madrid": "away",
  "villarreal:sabah": "home",
  "roma:slovan-bratislava": "home",
  "shakhtar-donetsk:aek-athens": "home",
  "bodo-glimt:lask": "home",
  "bodo-glimt:atletico-madrid": "away",
  "fenerbahce:slavia-prague": "home",
  "shakhtar-donetsk:fenerbahce": "away",
  "lille:real-betis": "home",
  "borussia-dortmund:inter-milan": "away",
  "sporting-cp:barcelona": "away",
  "sabah:borussia-dortmund": "away",
  "club-brugge:lens": "home",
  "lille:slovan-bratislava": "home",
  "manchester-united:bayern-munich": "away",
  "lens:como": "away",
  "manchester-city:aek-athens": "home",
  "inter-milan:shakhtar-donetsk": "home",
  "villarreal:napoli": "away",
  "slavia-prague:aston-villa": "away",
  "stuttgart:lille": "draw",
  "atletico-madrid:fenerbahce": "home",
  "paris-saint-germain:roma": "home",
  "napoli:bodo-glimt": "home",
  "rb-leipzig:lens": "home",
  "real-betis:arsenal": "away",
  "stuttgart:club-brugge": "away",
  "liverpool:villarreal": "home",
  "psv-eindhoven:club-brugge": "draw",
  "arsenal:sabah": "home",
  "slovan-bratislava:shakhtar-donetsk": "away",
  "aek-athens:lask": "home",
  "rb-leipzig:psv-eindhoven": "draw",
  "bodo-glimt:borussia-dortmund": "draw",
  "roma:lille": "home",
  "porto:psv-eindhoven": "home",
  "lille:bayern-munich": "away",
  "rb-leipzig:manchester-city": "away",
  "viking:sabah": "home",
  "bayern-munich:real-betis": "home",
  "slavia-prague:arsenal": "away",
  "arsenal:real-madrid": "home",
  "fenerbahce:liverpool": "away",
  "manchester-united:sabah": "home",
  "sporting-cp:manchester-united": "away",
  "stuttgart:atletico-madrid": "away",
  "aston-villa:paris-saint-germain": "away",
  "real-madrid:inter-milan": "home",
  "arsenal:borussia-dortmund": "home",
  "manchester-united:rb-leipzig": "home",
  "como:rb-leipzig": "draw",
  "paris-saint-germain:slovan-bratislava": "home",
  "arsenal:lille": "home",
  "feyenoord:porto": "away",
  "aston-villa:borussia-dortmund": "home",
  "barcelona:manchester-city": "home",
  "psv-eindhoven:stuttgart": "home",
  "real-madrid:psv-eindhoven": "home",
  "real-madrid:rb-leipzig": "home",
  "porto:slavia-prague": "home",
  "club-brugge:aston-villa": "away",
  "slovan-bratislava:stuttgart": "away",
  "feyenoord:inter-milan": "away",
  "villarreal:paris-saint-germain": "away",
  "borussia-dortmund:aek-athens": "home",
  "borussia-dortmund:real-betis": "home",
  "liverpool:atletico-madrid": "home",
  "napoli:club-brugge": "home",
  "lens:manchester-city": "away",
  "slavia-prague:villarreal": "home",
  "viking:feyenoord": "away",
  "sabah:slavia-prague": "away",
  "napoli:viking": "home",
  "real-betis:como": "draw",
  "inter-milan:liverpool": "home",
  "bayern-munich:arsenal": "away",
  "barcelona:aston-villa": "home",
  "borussia-dortmund:villarreal": "home",
  "galatasaray:stuttgart": "home",
  "bodo-glimt:lille": "home",
  "paris-saint-germain:barcelona": "draw",
  "bayern-munich:bodo-glimt": "home",
  "aek-athens:roma": "away",
  "barcelona:feyenoord": "home",
  "inter-milan:stuttgart": "home",
  "manchester-city:paris-saint-germain": "away",
  "sporting-cp:galatasaray": "home",
  "manchester-united:roma": "home",
  "slovan-bratislava:inter-milan": "away",
  "rb-leipzig:shakhtar-donetsk": "home",
  "paris-saint-germain:galatasaray": "home",
  "psv-eindhoven:shakhtar-donetsk": "home",
  "aek-athens:galatasaray": "away",
  "fenerbahce:roma": "away",
  "feyenoord:rb-leipzig": "draw",
  "lask:porto": "away",
  "slovan-bratislava:real-betis": "away",
  "real-madrid:lask": "home",
  "lille:galatasaray": "away",
  "roma:real-madrid": "away",
  "slavia-prague:lens": "draw",
  "aston-villa:fenerbahce": "home",
  "viking:bayern-munich": "away",
  "como:paris-saint-germain": "away",
  "psv-eindhoven:atletico-madrid": "away",
  "galatasaray:barcelona": "away",
  "club-brugge:bodo-glimt": "home",
  "porto:napoli": "home",
  "como:aek-athens": "home",
  "real-betis:feyenoord": "home",
  "napoli:arsenal": "away",
  "galatasaray:feyenoord": "home",
  "fenerbahce:villarreal": "home",
  "galatasaray:aston-villa": "away",
  "villarreal:manchester-united": "away",
  "liverpool:lens": "home",
};

export type PersonalPickResult = "correct" | "incorrect";

/** null when the match isn't decided yet, or has no recorded pick (a
 *  knockout fixture — these picks only cover the league phase). Same
 *  "decided" test as MatchesRow/FixtureRow/MatchupPopup/rankHistory.ts. */
export function getPersonalPickResult(fixture: RealFixture): PersonalPickResult | null {
  if (fixture.homeGoals === null || fixture.awayGoals === null) return null;

  const pick = PERSONAL_PICKS[pickKey(fixture.homeTeamId, fixture.awayTeamId)];
  if (!pick) return null;

  const actual: PickOutcome =
    fixture.homeGoals > fixture.awayGoals ? "home" : fixture.awayGoals > fixture.homeGoals ? "away" : "draw";

  return pick === actual ? "correct" : "incorrect";
}
